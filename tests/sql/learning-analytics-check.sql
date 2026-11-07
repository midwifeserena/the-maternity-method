-- DISPOSABLE DATABASE ONLY. Uses the existing synthetic review seed; rolls back.
begin;
create or replace function public.check_assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message;end if;end$$;
select check_assert(not has_function_privilege('authenticated','public.complete_exam_with_analytics(uuid,uuid,jsonb,integer,jsonb)','execute'),'students cannot supply analytics or scores directly');
select check_assert(not has_column_privilege('authenticated','public.exam_attempts','study_analytics','update'),'students cannot edit stored analytics');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select public.start_exam_review_attempt(array['20000000-0000-0000-0000-000000000001'::uuid],'test','Analytics test','start') as started \gset
select set_config('test.analytics_attempt',:'started'::jsonb->>'attemptId',true);
set local role service_role;
select public.complete_exam_with_analytics(current_setting('test.analytics_attempt')::uuid,'10000000-0000-0000-0000-000000000001','[{"question_id":"20000000-0000-0000-0000-000000000001","response":"a","earned":1,"possible":1}]',30,'{"version":1,"changes":{"incorrectToCorrect":1},"timings":[{"question_id":"20000000-0000-0000-0000-000000000001","seconds":20}]}') as result \gset
select check_assert((:'result'::jsonb->>'earned')::int=1,'original scoring result retained');
select check_assert((select study_analytics->'changes'->>'incorrectToCorrect'='1' from public.exam_attempts where id=current_setting('test.analytics_attempt')::uuid),'analytics saves with score');
select public.complete_exam_with_analytics(current_setting('test.analytics_attempt')::uuid,'10000000-0000-0000-0000-000000000001','[]',1,'{"version":1,"changes":{"incorrectToCorrect":999}}');
select check_assert((select study_analytics->'changes'->>'incorrectToCorrect'='1' and earned=1 from public.exam_attempts where id=current_setting('test.analytics_attempt')::uuid),'retry cannot replace score or analytics');
do $$begin
 begin perform public.complete_exam_with_analytics(current_setting('test.analytics_attempt')::uuid,'10000000-0000-0000-0000-000000000002','[]',1,null);raise exception 'Expected ownership rejection';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select check_assert((select count(*)=0 from public.exam_attempts where id=current_setting('test.analytics_attempt')::uuid),'another student cannot read analytics');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select public.start_exam_review_attempt(array['20000000-0000-0000-0000-000000000001'::uuid],'study','Atomic analytics test','start') as atomic \gset
select set_config('test.analytics_atomic',:'atomic'::jsonb->>'attemptId',true);
reset role;
create function public.fail_analytics_update() returns trigger language plpgsql as $$begin if new.id=current_setting('test.analytics_atomic')::uuid and new.study_analytics is not null then raise check_violation using message='Synthetic analytics write failure';end if;return new;end$$;
create trigger fail_analytics before update on public.exam_attempts for each row execute function public.fail_analytics_update();
do $$begin
 begin perform public.complete_exam_with_analytics(current_setting('test.analytics_atomic')::uuid,'10000000-0000-0000-0000-000000000001','[{"question_id":"20000000-0000-0000-0000-000000000001","response":"a","earned":1,"possible":1}]',30,'{"version":1}');raise exception 'Expected rollback';exception when check_violation then null;end;
 perform check_assert((select completed_at is null and earned=0 and study_analytics is null from public.exam_attempts where id=current_setting('test.analytics_atomic')::uuid),'analytics error cannot leave partial score');
 perform check_assert((select count(*)=0 from public.exam_responses where attempt_id=current_setting('test.analytics_atomic')::uuid),'analytics error rolls back response inserts');
end$$;
select check_assert(not exists(select id,user_id,mode,earned,possible,duration_seconds,created_at,completed_at from public.exam_attempts where id in(select id from baseline_attempts) except select * from baseline_attempts),'historical grades unchanged');
select 'PASS: optional analytics save, idempotency, ownership, no student writes, full rollback, old grades unchanged' as result;
rollback;
