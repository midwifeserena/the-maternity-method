create function public.check_assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message;end if;end$$;
select check_assert((select count(*)=2 and sum(earned)=8 from public.exam_attempts),'legacy attempt scores preserved');
select check_assert(not exists(select id,user_id,mode,earned,possible,duration_seconds,created_at,completed_at from public.exam_attempts except select * from baseline_attempts),'legacy columns unchanged');
select check_assert(not exists(select * from public.exam_responses except select * from baseline_responses),'legacy responses unchanged');
set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
select public.start_exam_review_attempt(array['20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002']::uuid[],'study') as opened \gset
select :'opened'::jsonb->>'attemptId' as attempt \gset
select check_assert(:'opened'::jsonb->'questions'->0->>'type'='matrix','original order retained');
select check_assert(:'opened' not like '%answer_key%' and :'opened' not like '%rationale%','no solutions in question payload');
select check_assert((select count(*)=0 from public.exam_review_items where attempt_id=:'attempt'),'pending solutions hidden');
select check_assert(not has_function_privilege('authenticated','public.complete_exam_review_attempt(uuid,uuid,jsonb,integer)','execute'),'students cannot supply scores');
select check_assert(not has_table_privilege('authenticated','public.exam_attempts','update'),'students cannot edit scores');
select check_assert(not has_table_privilege('authenticated','public.exam_responses','insert'),'students cannot invent saved responses');
reset role;
-- Editing the live bank cannot change the open version or its solution.
update public.questions set stem='Edited question',options='[{"id":"a","label":"EDITED A"}]' where type='single';
update public.question_solutions set answer_key='"b"',rationale='Edited rationale' where question_id='20000000-0000-0000-0000-000000000001';
set role service_role;
select public.complete_exam_review_attempt(:'attempt','10000000-0000-0000-0000-000000000001',
 '[{"question_id":"20000000-0000-0000-0000-000000000001","response":"a","earned":1,"possible":1},{"question_id":"20000000-0000-0000-0000-000000000002","response":["a"],"earned":1,"possible":2},{"question_id":"20000000-0000-0000-0000-000000000003","response":{"r1":"a","r2":"a"},"earned":1,"possible":2}]',125) as saved \gset
select check_assert(:'saved'::jsonb->>'earned'='3' and :'saved'::jsonb->>'possible'='5','stored partial scoring exact');
select public.complete_exam_review_attempt(:'attempt','10000000-0000-0000-0000-000000000001','[]',999) as retried \gset
select check_assert(:'retried'::jsonb->>'earned'='3','repeat completion cannot change score');
reset role;
select check_assert((select question_snapshot->>'stem'='Original MC' and solution_snapshot->>'rationale'='Original rationale' and solution_snapshot->'answer_key'='"a"'::jsonb from public.exam_review_items where attempt_id=:'attempt' and position=2),'question and solution immutable across bank edits');
create policy broad_attempt_read on public.exam_attempts for select to authenticated using(true);
create policy broad_response_read on public.exam_responses for select to authenticated using(true);
create policy broad_snapshot_read on public.exam_review_items for select to authenticated using(true);
set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000002';
select check_assert((select count(*)=0 from public.exam_attempts),'other student cannot read attempts even with permissive policy');
select check_assert((select count(*)=0 from public.exam_responses),'other student cannot read responses');
select check_assert((select count(*)=0 from public.exam_review_items),'other student cannot read snapshots');
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
select check_assert((select count(*)=3 from public.exam_review_items where attempt_id=:'attempt'),'owner can review all completed snapshots');
select check_assert((select count(*)=3 from public.exam_responses where attempt_id=:'attempt'),'owner can read own responses');
select public.start_exam_review_attempt(array['20000000-0000-0000-0000-000000000001']::uuid[],'test') as pending \gset
select :'pending'::jsonb->>'attemptId' as pending_id \gset
select check_assert((select count(*)=0 from public.exam_review_items where attempt_id=:'pending_id'),'pending snapshots still hidden under broad policy');
reset role;
do $$begin
 begin update public.exam_review_items set position=50 where attempt_id in(select id from public.exam_attempts where snapshot_stage='start' and completed_at is not null); raise exception 'Expected immutable error';exception when raise_exception then if sqlerrm='Expected immutable error' then raise;end if;end;
 begin delete from public.exam_review_items where attempt_id in(select id from public.exam_attempts where snapshot_stage='start' and completed_at is not null);raise exception 'Expected delete error';exception when raise_exception then if sqlerrm='Expected delete error' then raise;end if;end;
end$$;
-- Force an insertion failure with pre-existing response: completion stays pending.
insert into public.exam_responses(attempt_id,user_id,question_id,response,earned,possible) values(:'pending_id','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','"a"',1,1);
select set_config('test.pending',:'pending_id',false);
do $$begin
 begin perform public.complete_exam_review_attempt(current_setting('test.pending')::uuid,'10000000-0000-0000-0000-000000000001','[{"question_id":"20000000-0000-0000-0000-000000000001","response":"a","earned":1,"possible":1}]',5);raise exception 'Expected atomic failure';exception when raise_exception then if sqlerrm='Expected atomic failure' then raise;end if;end;
 perform check_assert((select completed_at is null and earned=0 from public.exam_attempts where id=current_setting('test.pending')::uuid),'failed completion cannot change score or completion');
end$$;
select check_assert((select count(*)=1 from public.exam_responses where attempt_id=:'pending_id'),'failed completion cannot duplicate responses');
select 'All database assertions passed' as result;
-- A failure during the multi-row INSERT must roll back every response and score.
reset role;
insert into public.questions(id,category,type,stem,options,published) values
('20000000-0000-0000-0000-000000000004','Antepartum','single','Atomic item 1','[{"id":"a","label":"A"}]',true),
('20000000-0000-0000-0000-000000000005','Antepartum','single','Atomic item 2','[{"id":"a","label":"A"}]',true);
insert into public.question_solutions values
('20000000-0000-0000-0000-000000000004','"a"','Atomic rationale'),
('20000000-0000-0000-0000-000000000005','"a"','Atomic rationale');
set role authenticated;
set request.jwt.claim.sub='10000000-0000-0000-0000-000000000001';
select public.start_exam_review_attempt(array['20000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000005']::uuid[],'test') as atomic_attempt \gset
reset role;
select set_config('test.atomic',:'atomic_attempt'::jsonb->>'attemptId',false);
delete from public.questions where id='20000000-0000-0000-0000-000000000005';
do $$begin
 begin perform public.complete_exam_review_attempt(current_setting('test.atomic')::uuid,'10000000-0000-0000-0000-000000000001','[{"question_id":"20000000-0000-0000-0000-000000000004","response":"a","earned":1,"possible":1},{"question_id":"20000000-0000-0000-0000-000000000005","response":"a","earned":1,"possible":1}]',5);raise exception 'Expected insert failure';exception when foreign_key_violation then null;end;
 perform check_assert((select count(*)=0 from public.exam_responses where attempt_id=current_setting('test.atomic')::uuid),'failed multi-row INSERT leaves no partial responses');
 perform check_assert((select completed_at is null and earned=0 and possible=0 from public.exam_attempts where id=current_setting('test.atomic')::uuid),'failed INSERT leaves attempt uncompleted and unscored');
end$$;
select 'All atomicity assertions passed' as result;
