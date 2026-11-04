-- PROPOSED QUESTION STUDIO SETUP. Review and test in staging before production.
-- For an existing Maternity Method database containing public.questions.
-- This installs the prior prerequisites and Studio functions in ONE transaction.
-- It does not import, delete, overwrite or re-score question/exam records.
-- Do not paste Markdown, JSON attachment metadata, or tests/sql files here.
-- If any prerequisite fails, this whole setup rolls back.
begin;
-- Source: 20261104_exam_reviews.sql
-- PROPOSED MIGRATION: review before applying to production.
-- Additive only: no historical scores/responses or question-bank content are rewritten.

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


-- Source: 202611050001_question_education.sql
-- PROPOSED: apply after 20261104_exam_reviews.sql. No production changes made.
alter table public.questions add column if not exists question_image_url text;
alter table public.questions add column if not exists question_image_alt text;
-- Explanations remain in the protected solutions table, never public questions.
alter table public.question_solutions add column if not exists rationale_image_url text;
alter table public.question_solutions add column if not exists rationale_image_alt text;
alter table public.question_solutions add column if not exists nursing_tip text;

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
   'question_image_url',entry.question->'question_image_url','question_image_alt',entry.question->'question_image_alt','diagram_file',entry.question->'diagram_file'
  )));
  copied:=copied+1;
 end loop;
 if copied<>total then raise exception 'One or more questions or solutions are unavailable' using errcode='22023'; end if;
 return jsonb_build_object('attemptId',attempt,'questions',visible_questions);
end;
$$;
revoke all on function public.start_exam_review_attempt(uuid[],text,text,text) from public,anon;
grant execute on function public.start_exam_review_attempt(uuid[],text,text,text) to authenticated;

-- Only application-server administrators may edit these fields. Both updates
-- commit together; this RPC does not change scoring, publication or question text.
create or replace function public.edit_question_education(p_question_id uuid,p_question jsonb,p_solution jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object'
  or exists(select 1 from jsonb_object_keys(p_question) k where k not in ('question_image_url','question_image_alt'))
  or exists(select 1 from jsonb_object_keys(p_solution) k where k not in ('rationale_image_url','rationale_image_alt','nursing_tip')) then
  raise exception 'Unsupported education fields';
 end if;
 perform 1 from public.questions where id=p_question_id for update;
 if not found then raise exception 'Question not found';end if;
 perform 1 from public.question_solutions where question_id=p_question_id for update;
 if not found then raise exception 'Solution not found';end if;
 update public.questions set
  question_image_url=case when p_question?'question_image_url' then p_question->>'question_image_url' else question_image_url end,
  question_image_alt=case when p_question?'question_image_alt' then p_question->>'question_image_alt' else question_image_alt end where id=p_question_id;
 update public.question_solutions set
  rationale_image_url=case when p_solution?'rationale_image_url' then p_solution->>'rationale_image_url' else rationale_image_url end,
  rationale_image_alt=case when p_solution?'rationale_image_alt' then p_solution->>'rationale_image_alt' else rationale_image_alt end,
  nursing_tip=case when p_solution?'nursing_tip' then p_solution->>'nursing_tip' else nursing_tip end where question_id=p_question_id;
end;$$;
revoke all on function public.edit_question_education(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.edit_question_education(uuid,jsonb,jsonb) to service_role;

-- Source: 202611050002_question_media_storage.sql
-- PROPOSED: private storage for question/rationale images. No student policies.
-- Existing buckets are untouched. Existing public brand assets stay public.
do $$begin
 if exists(select 1 from storage.buckets where id='question-media' and public=true) then
  raise exception 'question-media already exists as a public bucket; review before changing it';
 end if;
end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('question-media','question-media',false,3145728,array['image/png','image/jpeg','image/webp'])
 on conflict(id) do nothing;
-- A broad existing permissive storage policy must not expose this bucket.
drop policy if exists tmm_private_question_media on storage.objects;
create policy tmm_private_question_media on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'question-media') with check(bucket_id<>'question-media');

-- Source: 202611060001_matrix_multiple_response.sql
-- PROPOSED: apply after exam reviews and question education migrations.
-- Existing type enum and existing question/answer rows are retained.
alter table public.questions add column if not exists matrix_mode text not null default 'single' check(matrix_mode in ('single','multiple'));
alter table public.question_solutions add column if not exists row_explanations jsonb not null default '{}'::jsonb check(jsonb_typeof(row_explanations)='object');

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
   'matrix_mode',entry.question->'matrix_mode','matrix_rows',entry.question->'matrix_rows','chart',entry.question->'chart',
   'images',entry.question->'images','image_url',entry.question->'image_url',
   'image_urls',entry.question->'image_urls','question_images',entry.question->'question_images',
   'question_image_url',entry.question->'question_image_url','question_image_alt',entry.question->'question_image_alt','diagram_file',entry.question->'diagram_file'
  )));
  copied:=copied+1;
 end loop;
 if copied<>total then raise exception 'One or more questions or solutions are unavailable' using errcode='22023'; end if;
 return jsonb_build_object('attemptId',attempt,'questions',visible_questions);
end;
$$;
revoke all on function public.start_exam_review_attempt(uuid[],text,text,text) from public,anon;
grant execute on function public.start_exam_review_attempt(uuid[],text,text,text) to authenticated;

-- Existing education-only editor is unchanged. Matrix edits save as drafts;
-- publication is an explicit, separately validated administrator action.
create or replace function public.edit_matrix_question(p_question_id uuid,p_question jsonb,p_solution jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object'
  or exists(select 1 from jsonb_object_keys(p_question) k where k not in ('stem','options','matrix_rows','matrix_mode','published'))
  or exists(select 1 from jsonb_object_keys(p_solution) k where k not in ('answer_key','rationale','row_explanations')) then raise exception 'Unsupported matrix fields';end if;
 perform 1 from public.questions where id=p_question_id and type='matrix' for update;
 if not found then raise exception 'Matrix question not found';end if;
 perform 1 from public.question_solutions where question_id=p_question_id for update;
 if not found then raise exception 'Solution not found';end if;
 update public.questions set
  stem=case when p_question?'stem' then p_question->>'stem' else stem end,
  options=case when p_question?'options' then p_question->'options' else options end,
  matrix_rows=case when p_question?'matrix_rows' then p_question->'matrix_rows' else matrix_rows end,
  matrix_mode=case when p_question?'matrix_mode' then p_question->>'matrix_mode' else matrix_mode end,
  published=case when p_question?'published' then (p_question->>'published')::boolean else published end where id=p_question_id;
 update public.question_solutions set
  answer_key=case when p_solution?'answer_key' then p_solution->'answer_key' else answer_key end,
  rationale=case when p_solution?'rationale' then p_solution->>'rationale' else rationale end,
  row_explanations=case when p_solution?'row_explanations' then p_solution->'row_explanations' else row_explanations end where question_id=p_question_id;
end;$$;
revoke all on function public.edit_matrix_question(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.edit_matrix_question(uuid,jsonb,jsonb) to service_role;

create or replace function public.create_matrix_question(p_category text,p_question jsonb,p_solution jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object' then raise exception 'Invalid matrix';end if;
 insert into public.questions(category,type,stem,options,matrix_rows,matrix_mode,published)
 values(p_category::public.ob_category,'matrix',p_question->>'stem',p_question->'options',p_question->'matrix_rows',p_question->>'matrix_mode',false) returning id into new_id;
 insert into public.question_solutions(question_id,answer_key,rationale,row_explanations)
 values(new_id,p_solution->'answer_key',p_solution->>'rationale',coalesce(p_solution->'row_explanations','{}'::jsonb));
 return new_id;
end;$$;
revoke all on function public.create_matrix_question(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_matrix_question(text,jsonb,jsonb) to service_role;

-- Source: 202611070001_question_studio.sql
-- PROPOSED ADDITIVE MIGRATION. Review and test in staging before production.
-- Prerequisites: archive, question education/storage and matrix migrations.
alter table public.questions add column if not exists clinical_scenario text not null default '';
alter table public.questions add column if not exists content_format text not null default 'plain' check(content_format in ('plain','markdown'));
alter table public.questions add column if not exists topic text;
alter table public.questions add column if not exists subtopic text;
alter table public.questions add column if not exists difficulty text check(difficulty in ('easy','medium','hard'));
alter table public.questions add column if not exists tags text[] not null default '{}';
alter table public.questions add column if not exists archived_at timestamptz;
alter table public.questions add column if not exists updated_at timestamptz not null default now();
alter table public.questions add column if not exists editor_revision bigint not null default 0;
alter table public.questions add column if not exists duplicated_from uuid references public.questions(id) on delete set null;
alter table public.question_solutions add column if not exists rationale_format text not null default 'plain' check(rationale_format in ('plain','markdown'));
alter table public.question_solutions add column if not exists answer_explanations jsonb not null default '{}' check(jsonb_typeof(answer_explanations)='object');
alter table public.question_solutions add column if not exists test_taking_tip text;
create index if not exists question_studio_filter_idx on public.questions(category,type,published,difficulty);

-- No changes to authentication, RLS policies, existing grading or exam records.
create or replace function public.admin_question_library(p_search text default '',p_category text default null,p_type text default null,p_status text default 'active',p_difficulty text default null,p_offset integer default 0,p_limit integer default 25)
returns jsonb language sql security definer set search_path='' as $$
 with filtered as (
  select q.* from public.questions q
  where (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(concat_ws(' ',case when q.content_format='markdown' then replace(replace(q.stem,'**',''),'*','') else q.stem end,case when q.content_format='markdown' then replace(replace(q.clinical_scenario,'**',''),'*','') else q.clinical_scenario end,q.topic,q.subtopic,array_to_string(q.tags,' '))))>0)
   and (p_category is null or q.category::text=p_category)
   and (p_type is null or (p_type in ('single','sata') and q.type::text=p_type) or (p_type='matrix-single' and q.type='matrix' and q.matrix_mode='single') or (p_type='matrix-multiple' and q.type='matrix' and q.matrix_mode='multiple'))
   and (p_difficulty is null or (p_difficulty='unset' and q.difficulty is null) or q.difficulty=p_difficulty)
 ), matched as (
  select * from filtered q where p_status='all' or (p_status='active' and q.archived_at is null) or (p_status='archived' and q.archived_at is not null) or (p_status='draft' and q.archived_at is null and not q.published) or (p_status='published' and q.archived_at is null and q.published)
 ), page as (
  select * from matched order by created_at desc,id limit greatest(1,least(50,p_limit)) offset greatest(0,p_offset)
 )
 select jsonb_build_object(
  'questions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'stem',left(stem,280),'content_format',content_format,'category',category,'type',type,'matrix_mode',matrix_mode,'difficulty',difficulty,'published',published,'archived_at',archived_at,'topic',topic,'subtopic',subtopic,'tags',tags,'editor_revision',editor_revision,'updated_at',updated_at,'duplicated_from',duplicated_from) order by created_at desc,id) from page),'[]'::jsonb),
  'total',(select count(*) from matched),'counts',(select jsonb_build_object('all',count(*),'published',count(*) filter(where archived_at is null and published),'draft',count(*) filter(where archived_at is null and not published),'archived',count(*) filter(where archived_at is not null)) from filtered),
  'offset',greatest(0,p_offset),'limit',greatest(1,least(50,p_limit))
 );
$$;
revoke all on function public.admin_question_library(text,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_question_library(text,text,text,text,text,integer,integer) to service_role;

create or replace function public.manage_question_studio(p_action text,p_id uuid,p_question jsonb default '{}',p_solution jsonb default '{}',p_expected_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old_q public.questions%rowtype;next_q public.questions%rowtype;old_s public.question_solutions%rowtype;next_s public.question_solutions%rowtype;new_id uuid;result public.questions%rowtype;
begin
 if p_action not in ('create','save','publish','duplicate','archive','restore') or p_action is null or p_id is null then raise exception 'Invalid action';end if;
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object' then raise exception 'Invalid question document';end if;
 if exists(select 1 from jsonb_object_keys(p_question) k where k not in ('category','type','matrix_mode','stem','clinical_scenario','content_format','options','matrix_rows','chart','question_image_url','question_image_alt','topic','subtopic','difficulty','tags'))
  or exists(select 1 from jsonb_object_keys(p_solution) k where k not in ('answer_key','rationale','rationale_format','rationale_image_url','rationale_image_alt','nursing_tip','test_taking_tip','answer_explanations','row_explanations')) then raise exception 'Unsupported editor fields';end if;
 if p_action='create' then
  insert into public.questions(id,category,type,matrix_mode,stem,clinical_scenario,content_format,options,matrix_rows,chart,question_image_url,question_image_alt,topic,subtopic,difficulty,tags,published,editor_revision)
  values(p_id,(p_question->>'category')::public.ob_category,(p_question->>'type')::public.ob_question_type,coalesce(p_question->>'matrix_mode','single'),coalesce(p_question->>'stem',''),coalesce(p_question->>'clinical_scenario',''),coalesce(p_question->>'content_format','plain'),coalesce(p_question->'options','[]'::jsonb),coalesce(p_question->'matrix_rows','[]'::jsonb),coalesce(p_question->'chart','{}'::jsonb),p_question->>'question_image_url',p_question->>'question_image_alt',p_question->>'topic',p_question->>'subtopic',p_question->>'difficulty',coalesce(array(select jsonb_array_elements_text(p_question->'tags')),'{}'::text[]),false,1)
  returning * into result;
  insert into public.question_solutions(question_id,answer_key,rationale,rationale_format,rationale_image_url,rationale_image_alt,nursing_tip,test_taking_tip,answer_explanations,row_explanations)
  values(p_id,coalesce(p_solution->'answer_key','null'::jsonb),coalesce(p_solution->>'rationale',''),coalesce(p_solution->>'rationale_format','plain'),p_solution->>'rationale_image_url',p_solution->>'rationale_image_alt',p_solution->>'nursing_tip',p_solution->>'test_taking_tip',coalesce(p_solution->'answer_explanations','{}'::jsonb),coalesce(p_solution->'row_explanations','{}'::jsonb));
 else
  select * into old_q from public.questions where id=p_id for update;
  if not found then raise exception 'Question not found' using errcode='P0002';end if;
  if p_expected_revision is null or old_q.editor_revision<>p_expected_revision then raise exception 'Question changed elsewhere' using errcode='40001';end if;
  if p_action='duplicate' then
   new_id:=gen_random_uuid();
   insert into public.questions select (jsonb_populate_record(null::public.questions,to_jsonb(old_q)||jsonb_build_object('id',new_id,'published',false,'archived_at',null,'created_at',now(),'updated_at',now(),'editor_revision',1,'duplicated_from',old_q.id))).* returning * into result;
   select * into old_s from public.question_solutions where question_id=p_id;
   if found then insert into public.question_solutions select (jsonb_populate_record(null::public.question_solutions,to_jsonb(old_s)||jsonb_build_object('question_id',new_id))).*;
   else insert into public.question_solutions(question_id,answer_key,rationale) values(new_id,'null','');end if;
  elsif p_action in ('archive','restore') then
   update public.questions set archived_at=case when p_action='archive' then coalesce(archived_at,now()) else null end,published=false,editor_revision=editor_revision+1,updated_at=now() where id=p_id returning * into result;
  elsif p_action='publish' then
   if old_q.archived_at is not null then raise exception 'Restore archived question' using errcode='55000';end if;
   -- Only the administrator API calls this service-only RPC, after validating
   -- the persisted document and matching revision. No automatic publication.
   update public.questions set published=true,editor_revision=editor_revision+1,updated_at=now() where id=p_id returning * into result;
  else
   if old_q.archived_at is not null then raise exception 'Restore archived question' using errcode='55000';end if;
   select * into old_s from public.question_solutions where question_id=p_id for update;
   next_q:=jsonb_populate_record(old_q,p_question);next_s:=jsonb_populate_record(old_s,p_solution);
   update public.questions set category=next_q.category,type=next_q.type,matrix_mode=next_q.matrix_mode,stem=next_q.stem,clinical_scenario=next_q.clinical_scenario,content_format=next_q.content_format,options=next_q.options,matrix_rows=next_q.matrix_rows,chart=next_q.chart,question_image_url=next_q.question_image_url,question_image_alt=next_q.question_image_alt,topic=next_q.topic,subtopic=next_q.subtopic,difficulty=next_q.difficulty,tags=next_q.tags,published=false,editor_revision=editor_revision+1,updated_at=now() where id=p_id returning * into result;
   insert into public.question_solutions(question_id,answer_key,rationale,rationale_format,rationale_image_url,rationale_image_alt,nursing_tip,test_taking_tip,answer_explanations,row_explanations)
   values(p_id,coalesce(next_s.answer_key,'null'),coalesce(next_s.rationale,''),coalesce(next_s.rationale_format,'plain'),next_s.rationale_image_url,next_s.rationale_image_alt,next_s.nursing_tip,next_s.test_taking_tip,coalesce(next_s.answer_explanations,'{}'),coalesce(next_s.row_explanations,'{}'))
   on conflict(question_id) do update set answer_key=excluded.answer_key,rationale=excluded.rationale,rationale_format=excluded.rationale_format,rationale_image_url=excluded.rationale_image_url,rationale_image_alt=excluded.rationale_image_alt,nursing_tip=excluded.nursing_tip,test_taking_tip=excluded.test_taking_tip,answer_explanations=excluded.answer_explanations,row_explanations=excluded.row_explanations;
  end if;
 end if;
 return jsonb_build_object('id',result.id,'revision',result.editor_revision,'published',result.published,'archived_at',result.archived_at);
end;$$;
revoke all on function public.manage_question_studio(text,uuid,jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.manage_question_studio(text,uuid,jsonb,jsonb,bigint) to service_role;

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
   'stem',entry.question->'stem','clinical_scenario',entry.question->'clinical_scenario','content_format',entry.question->'content_format','options',entry.question->'options',
   'matrix_mode',entry.question->'matrix_mode','matrix_rows',entry.question->'matrix_rows','chart',entry.question->'chart',
   'images',entry.question->'images','image_url',entry.question->'image_url',
   'image_urls',entry.question->'image_urls','question_images',entry.question->'question_images',
   'question_image_url',entry.question->'question_image_url','question_image_alt',entry.question->'question_image_alt','diagram_file',entry.question->'diagram_file'
  )));
  copied:=copied+1;
 end loop;
 if copied<>total then raise exception 'One or more questions or solutions are unavailable' using errcode='22023'; end if;
 return jsonb_build_object('attemptId',attempt,'questions',visible_questions);
end;
$$;
revoke all on function public.start_exam_review_attempt(uuid[],text,text,text) from public,anon;
grant execute on function public.start_exam_review_attempt(uuid[],text,text,text) to authenticated;


notify pgrst,'reload schema';
commit;
