-- PROPOSED ADDITIVE MIGRATION. Review and test in staging before production.
-- Prerequisites: archive, question education/storage and matrix migrations.
begin;
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
