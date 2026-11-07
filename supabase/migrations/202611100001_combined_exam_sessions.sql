-- PROPOSED: review and test in staging before applying to production.
-- Prerequisites: existing exam-review and question-format migrations through 202611090001.
-- Adds future mixed/case exam storage. Does not rewrite scores, responses, or content.
begin;
do $$begin
 if to_regclass('public.exam_review_items') is null or to_regprocedure('public.start_exam_review_attempt(uuid[],text,text,text)') is null then raise exception 'Apply the existing exam-review setup before this combined-exam migration.'; end if;
 if to_regclass('public.ngn_cases') is null or to_regclass('public.ngn_items') is null or to_regclass('public.ngn_answers') is null then raise exception 'The existing NGN case tables are required before this migration.'; end if;
end$$;
alter table public.exam_review_items add column if not exists source_kind text not null default 'question' check(source_kind in ('question','ngn_case'));
alter table public.exam_review_items add column if not exists source_id uuid;
alter table public.exam_review_items add column if not exists case_id uuid;
create unique index if not exists exam_review_source_idx on public.exam_review_items(attempt_id,source_kind,source_id) where source_id is not null;
create table if not exists public.exam_case_responses(
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null,
 response jsonb,earned integer not null,possible integer not null,
 unique(attempt_id,question_id),
 foreign key(attempt_id,question_id) references public.exam_review_items(attempt_id,question_id) on delete cascade,
 check(earned>=0 and possible>0 and earned<=possible)
);
create index if not exists exam_case_response_owner_idx on public.exam_case_responses(user_id,attempt_id);
alter table public.exam_case_responses enable row level security;
revoke all on public.exam_case_responses from public,anon,authenticated;
grant select on public.exam_case_responses to authenticated;
grant all on public.exam_case_responses to service_role;
drop policy if exists exam_case_response_owner on public.exam_case_responses;
create policy exam_case_response_owner on public.exam_case_responses for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=(select auth.uid()) and a.completed_at is not null));
drop policy if exists exam_case_response_guard on public.exam_case_responses;
create policy exam_case_response_guard on public.exam_case_responses as restrictive for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=(select auth.uid()) and a.completed_at is not null));

-- Only the authenticated application server may supply normalized snapshots.
-- It fetches published content and private keys; clients cannot invoke this RPC.
create or replace function public.start_mixed_exam_attempt(p_user_id uuid,p_mode text,p_items jsonb,p_exam_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare total integer; attempt uuid;
begin
 if p_user_id is null or p_mode is null or p_mode not in ('study','test') or p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Invalid exam request' using errcode='22023'; end if;
 total:=jsonb_array_length(p_items);
 if total<1 or total>50 or (select count(distinct r.question_id) from jsonb_to_recordset(p_items) r(question_id uuid))<>total then raise exception 'Invalid exam size or duplicate items' using errcode='22023'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) r(question_id uuid,source_kind text,source_id uuid,case_id uuid,question_snapshot jsonb,solution_snapshot jsonb)
  where r.question_id is null or r.source_id is null or r.source_kind is null or r.source_kind not in ('question','ngn_case')
   or jsonb_typeof(r.question_snapshot) is distinct from 'object' or jsonb_typeof(r.solution_snapshot) is distinct from 'object'
   or r.question_snapshot->>'id' is distinct from r.question_id::text
   or not(r.solution_snapshot?'answer_key') or nullif(trim(r.solution_snapshot->>'rationale'),'') is null
   or (r.source_kind='question' and (r.case_id is not null or r.question_id<>r.source_id or not exists(select 1 from public.questions q join public.question_solutions s on s.question_id=q.id where q.id=r.source_id and q.published)))
   or (r.source_kind='ngn_case' and (r.case_id is null or r.question_snapshot->'case_context'->>'case_id' is distinct from r.case_id::text or r.question_snapshot->'case_context'->>'item_id' is distinct from r.source_id::text
    or not exists(select 1 from public.ngn_items i join public.ngn_cases c on c.id=i.case_id join public.ngn_answers a on a.item_id=i.id and a.case_id=c.id where i.id=r.source_id and c.id=r.case_id and i.published and c.published)))) then
  raise exception 'Selected question or complete case unavailable' using errcode='22023';
 end if;
 if not exists(select 1 from jsonb_to_recordset(p_items) r(source_kind text) where source_kind='ngn_case') then raise exception 'Select a case' using errcode='22023'; end if;
 if exists(with grouped as(
  select (e.value->>'case_id')::uuid case_id,count(*) amount,min(e.ordinality) first_pos,max(e.ordinality) last_pos
  from jsonb_array_elements(p_items) with ordinality e where e.value->>'source_kind'='ngn_case' group by (e.value->>'case_id')::uuid
 ) select 1 from grouped g where g.amount<>6 or g.last_pos-g.first_pos<>5
  or (select count(*) from public.ngn_items i where i.case_id=g.case_id)<>6
  or exists(select 1 from public.ngn_items i where i.case_id=g.case_id and not i.published)
  or exists(select 1 from jsonb_array_elements(p_items) with ordinality e join public.ngn_items i on i.id=(e.value->>'source_id')::uuid
    where e.value->>'source_kind'='ngn_case' and i.case_id=g.case_id and i.item_number<>e.ordinality-g.first_pos+1)) then
  raise exception 'Each selected case must contain all six items together in order' using errcode='22023';
 end if;
 insert into public.exam_attempts(user_id,mode,exam_name,question_count,snapshot_stage)
 values(p_user_id,p_mode,coalesce(nullif(left(trim(p_exam_name),120),''),'Practice exam with NGN cases'),total,'start') returning id into attempt;
 insert into public.exam_review_items(attempt_id,question_id,position,question_snapshot,solution_snapshot,source_kind,source_id,case_id)
 select attempt,(e.value->>'question_id')::uuid,e.ordinality::integer,e.value->'question_snapshot',e.value->'solution_snapshot',e.value->>'source_kind',(e.value->>'source_id')::uuid,(e.value->>'case_id')::uuid
 from jsonb_array_elements(p_items) with ordinality e;
 return jsonb_build_object('attemptId',attempt,'questions',(select jsonb_agg(i.question_snapshot order by i.position) from public.exam_review_items i where i.attempt_id=attempt));
end;
$$;
revoke all on function public.start_mixed_exam_attempt(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.start_mixed_exam_attempt(uuid,text,jsonb,text) to service_role;

-- Same completion RPC as standalone exams. Score computation stays server-side.
-- Standalone responses retain their existing table, preserving progress filters.
-- Case responses use the new table; both commit with one score atomically.
create or replace function public.complete_exam_review_attempt(p_attempt_id uuid,p_user_id uuid,p_responses jsonb,p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt public.exam_attempts%rowtype; amount integer; total_earned integer; total_possible integer;
begin
 select * into attempt from public.exam_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Exam not found' using errcode='42501'; end if;
 if attempt.completed_at is not null then return jsonb_build_object('attemptId',attempt.id,'earned',attempt.earned,'possible',attempt.possible); end if;
 if p_responses is null or jsonb_typeof(p_responses)<>'array' then raise exception 'Invalid responses'; end if;
 amount:=jsonb_array_length(p_responses);
 if attempt.question_count is null or amount<1 or amount<>attempt.question_count or amount<>(select count(*) from public.exam_review_items where attempt_id=attempt.id)
  or (select count(distinct r.question_id) from jsonb_to_recordset(p_responses) r(question_id uuid))<>amount
  or exists(select 1 from jsonb_to_recordset(p_responses) r(question_id uuid,earned integer,possible integer)
   where r.earned is null or r.possible is null or r.earned<0 or r.possible<0 or r.earned>r.possible or not exists(select 1 from public.exam_review_items i where i.attempt_id=attempt.id and i.question_id=r.question_id)) then raise exception 'Responses do not match this exam'; end if;
 if exists(select 1 from public.exam_responses where attempt_id=attempt.id) or exists(select 1 from public.exam_case_responses where attempt_id=attempt.id) then raise exception 'An incomplete response set requires investigation'; end if;
 insert into public.exam_responses(attempt_id,user_id,question_id,response,earned,possible)
 select attempt.id,p_user_id,r.question_id,r.response,r.earned,r.possible from jsonb_to_recordset(p_responses) r(question_id uuid,response jsonb,earned integer,possible integer)
 join public.exam_review_items i on i.attempt_id=attempt.id and i.question_id=r.question_id where i.source_kind='question';
 insert into public.exam_case_responses(attempt_id,user_id,question_id,response,earned,possible)
 select attempt.id,p_user_id,r.question_id,r.response,r.earned,r.possible from jsonb_to_recordset(p_responses) r(question_id uuid,response jsonb,earned integer,possible integer)
 join public.exam_review_items i on i.attempt_id=attempt.id and i.question_id=r.question_id where i.source_kind='ngn_case';
 select sum(r.earned),sum(r.possible) into total_earned,total_possible from jsonb_to_recordset(p_responses) r(earned integer,possible integer);
 update public.exam_attempts set earned=total_earned,possible=total_possible,duration_seconds=greatest(0,least(86400,coalesce(p_duration_seconds,0))),completed_at=now() where id=attempt.id;
 return jsonb_build_object('attemptId',attempt.id,'earned',total_earned,'possible',total_possible);
end;
$$;
revoke all on function public.complete_exam_review_attempt(uuid,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.complete_exam_review_attempt(uuid,uuid,jsonb,integer) to service_role;

-- Created last, within the same transaction; the app enables cases only when ready.
create or replace function public.mixed_exam_session_version() returns integer language sql immutable set search_path='' as $$select 1$$;
revoke all on function public.mixed_exam_session_version() from public,anon,authenticated;
grant execute on function public.mixed_exam_session_version() to service_role;
notify pgrst,'reload schema';
commit;
