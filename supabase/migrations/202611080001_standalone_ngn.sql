-- PROPOSED: review in staging before production. Apply after Question Studio setup.
-- Adds standalone NGN interaction metadata; does NOT transfer/publish any content.
-- No enum changes, question deletion, score updates or history rewrites.
begin;
alter table public.questions add column if not exists bank_section text not null default 'standard' check(bank_section in ('standard','ngn'));
alter table public.questions add column if not exists ngn_format text check(ngn_format in ('bowtie','highlight','cloze','drag-cloze','drag-select'));
alter table public.questions add column if not exists ngn_config jsonb not null default '{}' check(jsonb_typeof(ngn_config)='object');
alter table public.ngn_items add column if not exists qbank_question_id uuid references public.questions(id) on delete restrict;
create unique index if not exists ngn_items_qbank_question_idx on public.ngn_items(qbank_question_id) where qbank_question_id is not null;
create index if not exists questions_ngn_section_idx on public.questions(bank_section,published);
create or replace function public.admin_question_library(p_search text default '',p_category text default null,p_type text default null,p_status text default 'active',p_difficulty text default null,p_offset integer default 0,p_limit integer default 25)
returns jsonb language sql security definer set search_path='' as $$
 with filtered as (
  select q.* from public.questions q
  where (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(concat_ws(' ',case when q.content_format='markdown' then replace(replace(q.stem,'**',''),'*','') else q.stem end,case when q.content_format='markdown' then replace(replace(q.clinical_scenario,'**',''),'*','') else q.clinical_scenario end,q.topic,q.subtopic,array_to_string(q.tags,' '))))>0)
   and (p_category is null or q.category::text=p_category)
   and (p_type is null or (p_type='ngn' and (q.bank_section='ngn' or q.ngn_format is not null or q.type='matrix')) or (p_type=q.ngn_format) or (p_type in ('single','sata') and q.type::text=p_type) or (p_type='matrix-single' and q.type='matrix' and q.matrix_mode='single') or (p_type='matrix-multiple' and q.type='matrix' and q.matrix_mode='multiple'))
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

create or replace function public.manage_question_studio(p_action text,p_id uuid,p_question jsonb default '{}',p_solution jsonb default '{}',p_expected_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old_q public.questions%rowtype;next_q public.questions%rowtype;old_s public.question_solutions%rowtype;next_s public.question_solutions%rowtype;new_id uuid;result public.questions%rowtype;
begin
 if p_action not in ('create','save','publish','duplicate','archive','restore') or p_action is null or p_id is null then raise exception 'Invalid action';end if;
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object' then raise exception 'Invalid question document';end if;
 if exists(select 1 from jsonb_object_keys(p_question) k where k not in ('bank_section','ngn_format','ngn_config','category','type','matrix_mode','stem','clinical_scenario','content_format','options','matrix_rows','chart','question_image_url','question_image_alt','topic','subtopic','difficulty','tags'))
  or exists(select 1 from jsonb_object_keys(p_solution) k where k not in ('answer_key','rationale','rationale_format','rationale_image_url','rationale_image_alt','nursing_tip','test_taking_tip','answer_explanations','row_explanations')) then raise exception 'Unsupported editor fields';end if;
 if p_action='create' then
  insert into public.questions(id,bank_section,ngn_format,ngn_config,category,type,matrix_mode,stem,clinical_scenario,content_format,options,matrix_rows,chart,question_image_url,question_image_alt,topic,subtopic,difficulty,tags,published,editor_revision)
  values(p_id,coalesce(p_question->>'bank_section','standard'),p_question->>'ngn_format',coalesce(p_question->'ngn_config','{}'::jsonb),(p_question->>'category')::public.ob_category,(p_question->>'type')::public.ob_question_type,coalesce(p_question->>'matrix_mode','single'),coalesce(p_question->>'stem',''),coalesce(p_question->>'clinical_scenario',''),coalesce(p_question->>'content_format','plain'),coalesce(p_question->'options','[]'::jsonb),coalesce(p_question->'matrix_rows','[]'::jsonb),coalesce(p_question->'chart','{}'::jsonb),p_question->>'question_image_url',p_question->>'question_image_alt',p_question->>'topic',p_question->>'subtopic',p_question->>'difficulty',coalesce(array(select jsonb_array_elements_text(p_question->'tags')),'{}'::text[]),false,1)
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
   update public.questions set bank_section=next_q.bank_section,ngn_format=next_q.ngn_format,ngn_config=next_q.ngn_config,category=next_q.category,type=next_q.type,matrix_mode=next_q.matrix_mode,stem=next_q.stem,clinical_scenario=next_q.clinical_scenario,content_format=next_q.content_format,options=next_q.options,matrix_rows=next_q.matrix_rows,chart=next_q.chart,question_image_url=next_q.question_image_url,question_image_alt=next_q.question_image_alt,topic=next_q.topic,subtopic=next_q.subtopic,difficulty=next_q.difficulty,tags=next_q.tags,published=false,editor_revision=editor_revision+1,updated_at=now() where id=p_id returning * into result;
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
   'bank_section',entry.question->'bank_section','ngn_format',entry.question->'ngn_format','ngn_config',entry.question->'ngn_config','stem',entry.question->'stem','clinical_scenario',entry.question->'clinical_scenario','content_format',entry.question->'content_format','options',entry.question->'options',
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


-- Service-only atomic transfer. Sources remain intact for existing history.
create or replace function public.transfer_standalone_ngn(p_case_id uuid,p_source jsonb,p_questions jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.ngn_cases%rowtype;source_items jsonb;source_answers jsonb;entry jsonb;new_q public.questions%rowtype;total integer;ids jsonb;
begin
 -- Serialize against inserts as well as source edits/publication during verification.
 lock table public.ngn_cases,public.ngn_items,public.ngn_answers in share row exclusive mode;
 select * into c from public.ngn_cases where id=p_case_id;
 if not found then raise exception 'Source case not found' using errcode='P0002';end if;
 select count(*),jsonb_agg(to_jsonb(i) order by i.id) into total,source_items from public.ngn_items i where case_id=p_case_id;
 if total=6 or total=0 then raise exception 'Six-question case studies and empty cases cannot be transferred' using errcode='22023';end if;
 if not exists(select 1 from public.ngn_items where case_id=p_case_id and qbank_question_id is null) then
  select jsonb_agg(qbank_question_id order by id) into ids from public.ngn_items where case_id=p_case_id;
  return jsonb_build_object('ids',ids,'alreadyTransferred',true);
 end if;
 if c.published or exists(select 1 from public.ngn_items where case_id=p_case_id and (published or review_status<>'approved' or qbank_question_id is not null)) then raise exception 'Every source question must be approved, unpublished and not already transferred' using errcode='22023';end if;
 select jsonb_agg(to_jsonb(a) order by a.item_id) into source_answers from public.ngn_answers a where case_id=p_case_id;
 if p_source is null or p_source->'case' is distinct from to_jsonb(c) or p_source->'items' is distinct from source_items or p_source->'answers' is distinct from source_answers then raise exception 'Source changed; refresh before transferring' using errcode='40001';end if;
 if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions)<>total
  or (select count(distinct x->'question'->>'id') from jsonb_array_elements(p_questions) x)<>total then raise exception 'Incomplete transfer payload';end if;
 for entry in select value from jsonb_array_elements(p_questions) loop
  if not exists(select 1 from public.ngn_items where case_id=p_case_id and id=(entry->'question'->>'id')::uuid) then raise exception 'Mismatched source item';end if;
  if entry->'question'->>'bank_section' is distinct from 'ngn' or entry->'solution'->'answer_key' is null or nullif(trim(entry->'solution'->>'rationale'),'') is null then raise exception 'Incomplete converted question';end if;
  -- Caller validates structure, safe public config, format and scoring before this service-only RPC.
  select * into new_q from jsonb_populate_record(null::public.questions,entry->'question');
  insert into public.questions(id,category,type,matrix_mode,stem,clinical_scenario,content_format,options,matrix_rows,chart,bank_section,ngn_format,ngn_config,tags,published,editor_revision)
  values(new_q.id,new_q.category,new_q.type,new_q.matrix_mode,new_q.stem,coalesce(new_q.clinical_scenario,''),'plain',new_q.options,coalesce(new_q.matrix_rows,'[]'),coalesce(new_q.chart,'{}'),'ngn',new_q.ngn_format,coalesce(new_q.ngn_config,'{}'),coalesce(new_q.tags,'{}'),false,1);
  insert into public.question_solutions(question_id,answer_key,rationale)
  values(new_q.id,entry->'solution'->'answer_key',entry->'solution'->>'rationale');
  update public.ngn_items set qbank_question_id=new_q.id,published=false where id=new_q.id;
 end loop;
 update public.ngn_cases set published=false where id=p_case_id;
 select jsonb_agg(qbank_question_id order by id) into ids from public.ngn_items where case_id=p_case_id;
 return jsonb_build_object('ids',ids,'alreadyTransferred',false);
end;$$;
revoke all on function public.transfer_standalone_ngn(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.transfer_standalone_ngn(uuid,jsonb,jsonb) to service_role;
-- Source history is immutable after transfer, including through old admin tabs.
create or replace function public.protect_transferred_ngn() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_TABLE_NAME='ngn_items' then
  if OLD.qbank_question_id is not null and (TG_OP='DELETE' or to_jsonb(NEW) is distinct from to_jsonb(OLD)) then raise exception 'Edit transferred content in Question Bank Studio';end if;
 elsif TG_TABLE_NAME='ngn_answers' then
  if exists(select 1 from public.ngn_items where id=OLD.item_id and qbank_question_id is not null) then raise exception 'Edit transferred answers in Question Bank Studio';end if;
 elsif exists(select 1 from public.ngn_items where case_id=OLD.id and qbank_question_id is not null) and (TG_OP='DELETE' or to_jsonb(NEW) is distinct from to_jsonb(OLD)) then
  raise exception 'Transferred case source is retained for history';
 end if;
 if TG_OP='DELETE' then return OLD;end if;return NEW;
end;$$;
revoke all on function public.protect_transferred_ngn() from public,anon,authenticated;
drop trigger if exists protect_transferred_ngn_items on public.ngn_items;
create trigger protect_transferred_ngn_items before update or delete on public.ngn_items for each row execute function public.protect_transferred_ngn();
drop trigger if exists protect_transferred_ngn_answers on public.ngn_answers;
create trigger protect_transferred_ngn_answers before update or delete on public.ngn_answers for each row execute function public.protect_transferred_ngn();
drop trigger if exists protect_transferred_ngn_cases on public.ngn_cases;
create trigger protect_transferred_ngn_cases before update or delete on public.ngn_cases for each row execute function public.protect_transferred_ngn();
notify pgrst,'reload schema';
commit;
