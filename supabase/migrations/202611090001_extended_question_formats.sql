-- PROPOSED: deploy the matching application before using the new formats.
-- Apply after 202611080001_standalone_ngn.sql. No content is imported/published by this migration.
begin;
alter table public.questions drop constraint if exists questions_ngn_format_check;
alter table public.questions add constraint questions_ngn_format_check check(ngn_format in ('bowtie','highlight','cloze','drag-cloze','drag-select','calculation','ordered','dyad-cloze'));
-- Keep solution tables server-only even if a deployment had an older permissive grant.
alter table public.question_solutions enable row level security;
alter table public.ngn_answers enable row level security;
revoke all on public.question_solutions,public.ngn_answers from public,anon,authenticated;
grant all on public.question_solutions,public.ngn_answers to service_role;
drop policy if exists question_solutions_server_only_guard on public.question_solutions;
create policy question_solutions_server_only_guard on public.question_solutions as restrictive for all to anon,authenticated using(false) with check(false);
drop policy if exists ngn_answers_server_only_guard on public.ngn_answers;
create policy ngn_answers_server_only_guard on public.ngn_answers as restrictive for all to anon,authenticated using(false) with check(false);
create table if not exists public.content_import_receipts(batch_key text primary key,qbank_count integer not null,case_count integer not null,item_count integer not null,imported_at timestamptz not null default now());
alter table public.content_import_receipts enable row level security;
revoke all on public.content_import_receipts from public,anon,authenticated;
grant select,insert on public.content_import_receipts to service_role;
create or replace function public.extended_question_format_version() returns integer language sql immutable set search_path='' as $$select 1$$;
revoke all on function public.extended_question_format_version() from public,anon,authenticated;
grant execute on function public.extended_question_format_version() to service_role;
create or replace function public.admin_question_library(p_search text default '',p_category text default null,p_type text default null,p_status text default 'active',p_difficulty text default null,p_offset integer default 0,p_limit integer default 25)
returns jsonb language sql security definer set search_path='' as $$
 with filtered as (
  select q.* from public.questions q
  where (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(concat_ws(' ',case when q.content_format='markdown' then replace(replace(q.stem,'**',''),'*','') else q.stem end,case when q.content_format='markdown' then replace(replace(q.clinical_scenario,'**',''),'*','') else q.clinical_scenario end,q.topic,q.subtopic,array_to_string(q.tags,' '))))>0)
   and (p_category is null or q.category::text=p_category)
   and (p_type is null or (p_type='ngn' and (q.bank_section='ngn' or (q.ngn_format is not null and q.ngn_format not in ('calculation','ordered')) or (q.type='matrix' and q.ngn_format is null))) or (p_type=q.ngn_format) or (p_type in ('single','sata') and q.type::text=p_type and q.ngn_format is null) or (p_type='matrix-single' and q.type='matrix' and q.matrix_mode='single' and q.ngn_format is null) or (p_type='matrix-multiple' and q.type='matrix' and q.matrix_mode='multiple' and q.ngn_format is null))
   and (p_difficulty is null or (p_difficulty='unset' and q.difficulty is null) or q.difficulty=p_difficulty)
 ), matched as (
  select * from filtered q where p_status='all' or (p_status='active' and q.archived_at is null) or (p_status='archived' and q.archived_at is not null) or (p_status='draft' and q.archived_at is null and not q.published) or (p_status='published' and q.archived_at is null and q.published)
 ), page as (
  select * from matched order by created_at desc,id limit greatest(1,least(50,p_limit)) offset greatest(0,p_offset)
 )
 select jsonb_build_object(
  'questions',coalesce((select jsonb_agg(jsonb_build_object('id',id,'stem',left(stem,280),'content_format',content_format,'category',category,'type',type,'bank_section',bank_section,'ngn_format',ngn_format,'matrix_mode',matrix_mode,'difficulty',difficulty,'published',published,'archived_at',archived_at,'topic',topic,'subtopic',subtopic,'tags',tags,'editor_revision',editor_revision,'updated_at',updated_at,'duplicated_from',duplicated_from) order by created_at desc,id) from page),'[]'::jsonb),
  'total',(select count(*) from matched),'counts',(select jsonb_build_object('all',count(*),'published',count(*) filter(where archived_at is null and published),'draft',count(*) filter(where archived_at is null and not published),'archived',count(*) filter(where archived_at is not null)) from filtered),
  'offset',greatest(0,p_offset),'limit',greatest(1,least(50,p_limit))
 );
$$;
revoke all on function public.admin_question_library(text,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_question_library(text,text,text,text,text,integer,integer) to service_role;

notify pgrst,'reload schema';
commit;
