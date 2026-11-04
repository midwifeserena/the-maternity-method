-- DISPOSABLE DATABASE ONLY. Run after previous feature test setup + studio migration.
create table studio_before_questions as select id,category,type,stem,options,matrix_rows,chart,published from public.questions;
create table studio_before_responses as select * from public.exam_responses;
select check_assert(not has_function_privilege('authenticated','public.manage_question_studio(text,uuid,jsonb,jsonb,bigint)','execute'),'students cannot create/edit/archive/publish');
select check_assert(not has_function_privilege('authenticated','public.admin_question_library(text,text,text,text,text,integer,integer)','execute'),'admin library is service-only');
set role service_role;
select public.manage_question_studio('create','50000000-0000-0000-0000-000000000001','{"category":"Antepartum","type":"single","stem":"Original studio question","options":[{"id":"a","label":"Assess"},{"id":"b","label":"Delay"}],"clinical_scenario":"Clinical scenario","content_format":"markdown","difficulty":"hard","topic":"Bleeding","subtopic":"Placental assessment","tags":["safety","priority"]}','{"answer_key":"a","rationale":"**Assess** first.","rationale_format":"markdown","answer_explanations":{"a":"Assessment establishes priority.","b":"Delay risks missing deterioration."},"test_taking_tip":"Assess before intervening."}',0) as created \gset
select check_assert(:'created'::jsonb->>'published'='false','creation always saves draft');
reset role;
select check_assert((select count(*)=1 from public.questions where id='50000000-0000-0000-0000-000000000001'),'creation does not duplicate IDs');
select check_assert((public.admin_question_library('studio question','Antepartum','single','draft','hard',0,25)->>'total')::integer=1,'combined filters and exact count work');
select check_assert((public.admin_question_library('studio question',null,null,'published',null,0,25)->>'total')::integer=0,'draft not listed as published');
select public.manage_question_studio('save','50000000-0000-0000-0000-000000000001','{"stem":"Revised studio question"}','{"rationale":"Revised rationale"}',1);
select check_assert((select options='[{"id":"a","label":"Assess"},{"id":"b","label":"Delay"}]'::jsonb and chart='{}'::jsonb from public.questions where id='50000000-0000-0000-0000-000000000001'),'partial edits preserve existing question data');
select check_assert((select answer_key='"a"'::jsonb and test_taking_tip='Assess before intervening.' from public.question_solutions where question_id='50000000-0000-0000-0000-000000000001'),'partial rationale edit preserves key and teaching metadata');
do $$begin
 begin perform public.manage_question_studio('save','50000000-0000-0000-0000-000000000001','{"stem":"Stale overwrite"}','{}',1);raise exception 'Expected stale rejection';exception when serialization_failure then null;end;
 perform check_assert((select stem='Revised studio question' from public.questions where id='50000000-0000-0000-0000-000000000001'),'stale editor cannot overwrite newer work');
end$$;
select public.manage_question_studio('publish','50000000-0000-0000-0000-000000000001','{}','{}',2);
set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
select public.start_exam_review_attempt(array['50000000-0000-0000-0000-000000000001']::uuid[],'study') as opened \gset
select check_assert(:'opened'::jsonb->'questions'->0->>'clinical_scenario'='Clinical scenario','student start includes public clinical scenario');
select check_assert(:'opened' not like '%Assess before intervening%' and :'opened' not like '%answer_explanations%' and :'opened' not like '%Revised rationale%','teaching content stays out of start payload');
reset role;
select public.manage_question_studio('duplicate','50000000-0000-0000-0000-000000000001','{}','{}',3) as copied \gset
select :'copied'::jsonb->>'id' as copy_id \gset
select check_assert(:'copy_id'<>'50000000-0000-0000-0000-000000000001','duplicate creates a different ID');
select check_assert((select published=false and duplicated_from='50000000-0000-0000-0000-000000000001' from public.questions where id=:'copy_id'),'copy remains a draft with source reference');
select check_assert((select test_taking_tip='Assess before intervening.' and answer_explanations->>'a'='Assessment establishes priority.' from public.question_solutions where question_id=:'copy_id'),'duplicate retains private teaching data');
select public.manage_question_studio('archive','50000000-0000-0000-0000-000000000001','{}','{}',3);
select check_assert((select archived_at is not null and not published from public.questions where id='50000000-0000-0000-0000-000000000001'),'archive keeps row but unpublishes');
select check_assert((public.admin_question_library('Revised studio question',null,null,'archived',null,0,25)->>'total')::integer=1,'archived filter is exact');
set role authenticated;
select check_assert((select count(*)=0 from public.questions where id='50000000-0000-0000-0000-000000000001'),'archived question unavailable in student bank');
reset role;
select public.manage_question_studio('restore','50000000-0000-0000-0000-000000000001','{}','{}',4);
select check_assert((select archived_at is null and not published and editor_revision=5 from public.questions where id='50000000-0000-0000-0000-000000000001'),'restore never automatically publishes');
do $$begin
 begin perform public.manage_question_studio('save','50000000-0000-0000-0000-000000000001','{"stem":"Must roll back"}','{"rationale_format":"unsafe"}',5);raise exception 'Expected invalid format';exception when check_violation then null;end;
 perform check_assert((select stem='Revised studio question' and editor_revision=5 from public.questions where id='50000000-0000-0000-0000-000000000001'),'question/solution edit rollback atomic');
end$$;
-- Prove paging is not limited to the first 1,000 questions.
insert into public.questions(category,type,stem,options,published,difficulty) select 'Newborn','single','Paging fixture '||i,'[]',false,'easy' from generate_series(1,1005)i;
select check_assert((public.admin_question_library('Paging fixture',null,null,'draft','easy',1000,25)->>'total')::integer=1005,'library count exceeds default API row limit');
select check_assert(jsonb_array_length(public.admin_question_library('Paging fixture',null,null,'draft','easy',1000,25)->'questions')=5,'last page retrieves questions beyond 1,000');
select check_assert(not exists(select id,category,type,stem,options,matrix_rows,chart,published from public.questions where id in(select id from studio_before_questions) except select * from studio_before_questions),'existing question rows retained unchanged');
select check_assert(not exists(select * from public.exam_responses except select * from studio_before_responses),'existing student responses untouched');
select 'Studio filters, drafts, stable IDs, duplicate, archive, versioning, atomicity and protected payloads passed' as result;
