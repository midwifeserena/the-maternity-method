-- PROPOSED MIGRATION: review before applying to production.
-- Additive only: no historical scores/responses or question-bank content are rewritten.
begin;

alter table public.exam_attempts add column if not exists exam_name text;
alter table public.exam_attempts add column if not exists question_count integer;
alter table public.exam_attempts add column if not exists snapshot_stage text;

create table if not exists public.exam_review_items (
 attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
 question_id uuid not null,
 position integer not null check(position between 1 and 50),
 question_snapshot jsonb not null check(jsonb_typeof(question_snapshot)='object'),
 solution_snapshot jsonb not null check(jsonb_typeof(solution_snapshot)='object'),
 snapshot_version smallint not null default 1,
 created_at timestamptz not null default now(),
 primary key(attempt_id,question_id),
 unique(attempt_id,position)
);

alter table public.exam_attempts enable row level security;
alter table public.exam_responses enable row level security;
alter table public.exam_review_items enable row level security;
grant select on public.exam_attempts,public.exam_responses to authenticated;
revoke all on public.exam_attempts,public.exam_responses from public,anon;
revoke insert,update,delete,truncate,references,trigger on public.exam_attempts,public.exam_responses from authenticated;
revoke all on public.exam_review_items from public,anon,authenticated;
grant select on public.exam_review_items to authenticated;
grant all on public.exam_review_items to service_role;

-- Existing own-row policies remain; restrictive guards protect ownership even if
-- another permissive SELECT policy is installed later.
drop policy if exists exam_review_attempt_owner on public.exam_attempts;
create policy exam_review_attempt_owner on public.exam_attempts as restrictive
 for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists exam_review_response_owner on public.exam_responses;
create policy exam_review_response_owner on public.exam_responses as restrictive
 for select to authenticated using(user_id=(select auth.uid()) and exists(
  select 1 from public.exam_attempts a where a.id=exam_responses.attempt_id and a.user_id=(select auth.uid())
 ));
drop policy if exists exam_review_completed_owner on public.exam_review_items;
create policy exam_review_completed_owner on public.exam_review_items
 for select to authenticated using(exists(
  select 1 from public.exam_attempts a where a.id=exam_review_items.attempt_id
   and a.user_id=(select auth.uid()) and a.completed_at is not null
 ));
drop policy if exists exam_review_snapshot_guard on public.exam_review_items;
create policy exam_review_snapshot_guard on public.exam_review_items as restrictive
 for select to authenticated using(exists(
  select 1 from public.exam_attempts a where a.id=exam_review_items.attempt_id
   and a.user_id=(select auth.uid()) and a.completed_at is not null
 ));

create or replace function public.protect_completed_exam_snapshot()
returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.exam_attempts a where a.id=old.attempt_id and a.completed_at is not null) then
  raise exception 'Completed exam snapshots cannot be changed';
 end if;
 if tg_op='DELETE' then return old; end if;
 if exists(select 1 from public.exam_attempts a where a.id=new.attempt_id and a.completed_at is not null) then
  raise exception 'Completed exam snapshots cannot be changed';
 end if;
 return new;
end;
$$;
drop trigger if exists exam_review_items_immutable on public.exam_review_items;
create trigger exam_review_items_immutable before update or delete on public.exam_review_items
 for each row execute function public.protect_completed_exam_snapshot();

-- Authenticated students can start only their own attempt. Keys/rationales are
-- copied server-side and never included in the returned question payload.
create or replace function public.start_exam_review_attempt(
 p_question_ids uuid[],p_mode text,p_exam_name text default null,p_snapshot_stage text default 'start'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 owner_id uuid:=auth.uid(); attempt uuid; total integer; copied integer:=0;
 entry record; visible_questions jsonb:='[]'::jsonb;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 total:=coalesce(cardinality(p_question_ids),0);
 if total<1 or total>50 or p_mode is null or p_snapshot_stage is null or p_mode not in ('study','test') or p_snapshot_stage not in ('start','submission')
  or (select count(distinct id) from unnest(p_question_ids) id)<>total then
  raise exception 'Invalid exam request' using errcode='22023';
 end if;
 insert into public.exam_attempts(user_id,mode,exam_name,question_count,snapshot_stage)
 values(owner_id,p_mode,coalesce(nullif(left(trim(p_exam_name),120),''),case when p_mode='study' then 'Study practice test' else 'Timed practice exam' end),total,p_snapshot_stage)
 returning id into attempt;
 for entry in
  select q.id,requested.position::integer as position,to_jsonb(q) as question,to_jsonb(s) as solution
  from unnest(p_question_ids) with ordinality requested(id,position)
  join public.questions q on q.id=requested.id and q.published=true
  join public.question_solutions s on s.question_id=q.id
  order by requested.position
 loop
  insert into public.exam_review_items(attempt_id,question_id,position,question_snapshot,solution_snapshot)
  values(attempt,entry.id,entry.position,entry.question,entry.solution);
  visible_questions:=visible_questions||jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
   'id',entry.id,'category',entry.question->'category','type',entry.question->'type',
   'stem',entry.question->'stem','options',entry.question->'options',
   'matrix_rows',entry.question->'matrix_rows','chart',entry.question->'chart',
   'images',entry.question->'images','image_url',entry.question->'image_url',
   'image_urls',entry.question->'image_urls','question_images',entry.question->'question_images',
   'question_image_url',entry.question->'question_image_url','diagram_file',entry.question->'diagram_file'
  )));
  copied:=copied+1;
 end loop;
 if copied<>total then raise exception 'One or more questions or solutions are unavailable' using errcode='22023'; end if;
 return jsonb_build_object('attemptId',attempt,'questions',visible_questions);
end;
$$;
revoke all on function public.start_exam_review_attempt(uuid[],text,text,text) from public,anon;
grant execute on function public.start_exam_review_attempt(uuid[],text,text,text) to authenticated;

-- Only the authenticated application server's service role may supply scores.
-- The server computes them with the existing scorer using the frozen answer keys.
-- The attempt, responses and completion flag commit together, or not at all.
create or replace function public.complete_exam_review_attempt(
 p_attempt_id uuid,p_user_id uuid,p_responses jsonb,p_duration_seconds integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 attempt public.exam_attempts%rowtype; amount integer; total_earned integer; total_possible integer;
begin
 select * into attempt from public.exam_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Exam not found' using errcode='42501'; end if;
 if attempt.completed_at is not null then
  return jsonb_build_object('attemptId',attempt.id,'earned',attempt.earned,'possible',attempt.possible);
 end if;
 if p_responses is null or jsonb_typeof(p_responses)<>'array' then raise exception 'Invalid responses'; end if;
 amount:=jsonb_array_length(p_responses);
 if attempt.question_count is null or amount<1 or amount<>attempt.question_count or amount<>(select count(*) from public.exam_review_items where attempt_id=attempt.id)
  or (select count(distinct r.question_id) from jsonb_to_recordset(p_responses) r(question_id uuid))<>amount
  or exists(select 1 from jsonb_to_recordset(p_responses) r(question_id uuid,earned integer,possible integer)
   where r.earned is null or r.possible is null or r.earned<0 or r.possible<0 or r.earned>r.possible
    or not exists(select 1 from public.exam_review_items i where i.attempt_id=attempt.id and i.question_id=r.question_id)) then
  raise exception 'Responses do not match this exam';
 end if;
 if exists(select 1 from public.exam_responses where attempt_id=attempt.id) then
  raise exception 'An incomplete response set requires separate investigation';
 end if;
 insert into public.exam_responses(attempt_id,user_id,question_id,response,earned,possible)
 select attempt.id,p_user_id,r.question_id,r.response,r.earned,r.possible
 from jsonb_to_recordset(p_responses) r(question_id uuid,response jsonb,earned integer,possible integer);
 select sum(r.earned),sum(r.possible) into total_earned,total_possible
 from jsonb_to_recordset(p_responses) r(earned integer,possible integer);
 update public.exam_attempts set earned=total_earned,possible=total_possible,
  duration_seconds=greatest(0,least(86400,coalesce(p_duration_seconds,0))),completed_at=now()
 where id=attempt.id;
 return jsonb_build_object('attemptId',attempt.id,'earned',total_earned,'possible',total_possible);
end;
$$;
revoke all on function public.complete_exam_review_attempt(uuid,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.complete_exam_review_attempt(uuid,uuid,jsonb,integer) to service_role;

notify pgrst,'reload schema';
commit;
