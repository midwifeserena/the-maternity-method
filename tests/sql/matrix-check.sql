-- DISPOSABLE DATABASE ONLY. Run after education checks and matrix migration.
select check_assert(not exists(select id,user_id,mode,earned,possible,duration_seconds,created_at,completed_at from public.exam_attempts where id in(select id from baseline_attempts) except select * from baseline_attempts),'matrix migration preserves legacy exam scores');
select check_assert((select matrix_mode='single' from public.questions where id='20000000-0000-0000-0000-000000000003'),'existing matrix retains single-choice behavior');
select check_assert(not has_function_privilege('authenticated','public.create_matrix_question(text,jsonb,jsonb)','execute') and not has_function_privilege('authenticated','public.edit_matrix_question(uuid,jsonb,jsonb)','execute'),'matrix writes restricted to trusted server');
set role service_role;
select public.create_matrix_question('Antepartum','{"stem":"New matrix MR","matrix_mode":"multiple","options":[{"id":"a","label":"Appropriate"},{"id":"b","label":"Monitor"},{"id":"c","label":"Avoid"}],"matrix_rows":[{"id":"r1","label":"Assess"},{"id":"r2","label":"Notify"}]}','{"answer_key":{"r1":["a","b"],"r2":["a"]},"rationale":"Overall MR rationale","row_explanations":{"r1":"Assess first","r2":"Escalate changes"}}') as matrix_id \gset
reset role;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
select check_assert((select count(*)=0 from public.questions where id=:'matrix_id'),'new matrices are hidden drafts');
reset role;
select public.edit_matrix_question(:'matrix_id','{"published":true}','{}');
set role authenticated;
select public.start_exam_review_attempt(array[:'matrix_id']::uuid[],'test') as opened \gset
select :'opened'::jsonb->>'attemptId' as attempt \gset
select check_assert(:'opened'::jsonb->'questions'->0->>'matrix_mode'='multiple','exam start preserves multiple-response mode');
select check_assert(:'opened' not like '%Assess first%' and :'opened' not like '%row_explanations%' and :'opened' not like '%answer_key%','row explanations/keys remain hidden before reveal');
select check_assert((select count(*)=0 from public.exam_review_items where attempt_id=:'attempt'),'pending matrix solutions remain hidden');
reset role;
-- Server-computed +/- credit: row 1 has +2-1=1, row 2 has +1=1.
select jsonb_build_array(jsonb_build_object('question_id',:'matrix_id','response','{"r1":["a","b","c"],"r2":["a"]}'::jsonb,'earned',2,'possible',3))::text as entries \gset
select public.complete_exam_review_attempt(:'attempt','10000000-0000-0000-0000-000000000001',:'entries',90);
select public.edit_matrix_question(:'matrix_id','{"published":false}','{"answer_key":{"r1":["c"],"r2":["c"]},"row_explanations":{"r1":"Changed current explanation"}}');
set role authenticated;
select check_assert((select response='{"r1":["a","b","c"],"r2":["a"]}'::jsonb and earned=2 and possible=3 from public.exam_responses where attempt_id=:'attempt'),'multiple selections and exact partial points persist');
select check_assert((select question_snapshot->>'matrix_mode'='multiple' and solution_snapshot->'row_explanations'->>'r1'='Assess first' and solution_snapshot->'answer_key'->'r1'='["a","b"]'::jsonb from public.exam_review_items where attempt_id=:'attempt'),'archived matrix mode/key/explanations survive current edits');
select check_assert((select earned=2 and possible=3 from public.exam_attempts where id=:'attempt'),'reviewed matrix original score remains unchanged');
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
select check_assert((select count(*)=0 from public.exam_review_items where attempt_id=:'attempt'),'other students cannot access matrix review');
reset role;
select set_config('test.matrix',:'matrix_id',false);
do $$declare before_count integer;old_stem text;begin
 select count(*) into before_count from public.questions;
 begin perform public.create_matrix_question('Antepartum','{"stem":"Orphan must roll back","matrix_mode":"multiple","options":[],"matrix_rows":[]}','{"answer_key":{},"rationale":null}');raise exception 'Expected invalid creation';exception when not_null_violation then null;end;
 perform check_assert((select count(*)=before_count from public.questions),'failed matrix creation cannot leave orphan question');
 select stem into old_stem from public.questions where id=current_setting('test.matrix')::uuid;
 begin perform public.edit_matrix_question(current_setting('test.matrix')::uuid,'{"stem":"Must roll back"}','{"row_explanations":[]}');raise exception 'Expected invalid explanation';exception when check_violation then null;end;
 perform check_assert((select stem=old_stem from public.questions where id=current_setting('test.matrix')::uuid),'failed solution update rolls back question update');
end$$;
select 'Matrix mode, privacy, persistence, archival and atomicity checks passed' as result;
