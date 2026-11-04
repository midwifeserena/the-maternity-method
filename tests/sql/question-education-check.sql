-- DISPOSABLE DATABASE ONLY. Run after exam-review test seed and both education migrations.
create or replace function public.check_assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message;end if;end$$;
select check_assert((select count(*)=2 and sum(earned)=8 from public.exam_attempts),'education migration preserves legacy scores');
set role service_role;
select public.edit_question_education('20000000-0000-0000-0000-000000000001','{"question_image_url":"storage://question-media/q/question.png","question_image_alt":"FHR strip"}','{"rationale_image_url":"storage://question-media/q/rationale.png","rationale_image_alt":"Interpretation diagram","nursing_tip":"Original private tip"}');
reset role;
select check_assert((select answer_key='"a"'::jsonb and rationale='Original rationale' from public.question_solutions where question_id='20000000-0000-0000-0000-000000000001'),'education edit preserves original solution and scoring key');
select check_assert((select stem='Original MC' and published=true from public.questions where id='20000000-0000-0000-0000-000000000001'),'education edit preserves question and publication');
-- Even with SELECT privilege, existing RLS must deny all solution rows.
grant select on public.question_solutions to authenticated;
set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
select check_assert((select count(*)=0 from public.question_solutions),'solutions/tips/rationale media stay unreadable before reveal');
select check_assert(not has_function_privilege('authenticated','public.edit_question_education(uuid,jsonb,jsonb)','execute'),'students cannot edit education');
select public.start_exam_review_attempt(array['20000000-0000-0000-0000-000000000001']::uuid[],'study') as opened \gset
select :'opened'::jsonb->>'attemptId' as attempt \gset
select check_assert(:'opened'::jsonb->'questions'->0->>'question_image_alt'='FHR strip','start payload includes question alt text');
select check_assert(:'opened' not like '%Original private tip%' and :'opened' not like '%Interpretation diagram%' and :'opened' not like '%answer_key%','start payload excludes protected education and keys');
select check_assert((select count(*)=0 from public.exam_review_items where attempt_id=:'attempt'),'pending private snapshots stay hidden');
reset role;
select public.complete_exam_review_attempt(:'attempt','10000000-0000-0000-0000-000000000001','[{"question_id":"20000000-0000-0000-0000-000000000001","response":"a","earned":1,"possible":1}]',30);
select public.edit_question_education('20000000-0000-0000-0000-000000000001','{}','{"nursing_tip":"Changed current tip"}');
set role authenticated;
select check_assert((select solution_snapshot->>'nursing_tip'='Original private tip' and solution_snapshot->>'rationale_image_alt'='Interpretation diagram' from public.exam_review_items where attempt_id=:'attempt'),'completed reviews preserve original education after edits');
select check_assert((select earned=1 and possible=1 from public.exam_attempts where id=:'attempt'),'education does not change scoring');
reset role;
do $$begin
 begin perform public.edit_question_education('20000000-0000-0000-0000-000000000001','{"stem":"Should not change"}','{}');raise exception 'Expected unsupported field rejection';exception when raise_exception then if sqlerrm='Expected unsupported field rejection' then raise;end if;end;
 perform check_assert((select stem='Original MC' from public.questions where id='20000000-0000-0000-0000-000000000001'),'invalid education edits do not overwrite source content');
end$$;
-- Supabase Storage is represented by local test scaffolding in this test only.
insert into storage.buckets(id,name,public) values('unrelated-assets','unrelated-assets',true);
insert into storage.objects(bucket_id) values('question-media'),('unrelated-assets');
set role authenticated;
select check_assert((select count(*)=0 from storage.objects where bucket_id='question-media'),'private educational images hidden despite broad permissive storage policy');
select check_assert((select count(*)=1 from storage.objects where bucket_id='unrelated-assets'),'other buckets retain prior policy behavior');
reset role;
select 'Question education and private storage checks passed' as result;
