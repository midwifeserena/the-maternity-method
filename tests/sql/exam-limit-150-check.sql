-- DISPOSABLE DATABASE ONLY. Synthetic data rolls back; never run against production.
begin;
create or replace function public.check_assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message;end if;end$$;
insert into public.questions(id,category,type,stem,options,published)
select ('21000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Antepartum','single','Synthetic question','[{"id":"a","label":"Assess"}]',true from generate_series(1,151) n;
insert into public.question_solutions(question_id,answer_key,rationale) select id,'"a"','Synthetic rationale' from public.questions where id::text like '21000000%';
insert into public.ngn_cases(id,case_number,topic,title,intro,tabs,published)
select ('61000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,n,'Antepartum','Synthetic case','Synthetic chart','{}',true from generate_series(1,25) n;
insert into public.ngn_items(id,case_id,item_number,item_type,stem,content,published)
select ('71000000-0000-0000-0000-'||lpad(((n-1)*6+i)::text,12,'0'))::uuid,('61000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,i,'Multiple Choice','Synthetic case item','{"options":["Assess"]}',true from generate_series(1,25) n cross join generate_series(1,6) i;
insert into public.ngn_answers(item_id,case_id,answer,rationale) select id,case_id,'{"correct":["A"]}','Synthetic rationale' from public.ngn_items where id::text like '71000000%';
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select public.start_exam_review_attempt((select array_agg(id order by id) from (select id from public.questions where id::text like '21000000%' order by id limit 150) q),'study','150 standalone','start') as standalone \gset
select set_config('test.limit_attempt',:'standalone'::jsonb->>'attemptId',true);
select check_assert(jsonb_array_length(:'standalone'::jsonb->'questions')=150,'150 standalone questions start');
reset role;
do $$begin
 begin perform public.start_exam_review_attempt((select array_agg(id) from public.questions where id::text like '21000000%'),'test','151 rejected','start');raise exception 'Expected limit rejection';exception when invalid_parameter_value then null;end;
end$$;
-- Complete all 150 snapshots through the existing atomic completion RPC.
set local role service_role;
select public.complete_exam_review_attempt(current_setting('test.limit_attempt')::uuid,'10000000-0000-0000-0000-000000000001',
(select jsonb_agg(jsonb_build_object('question_id',question_id,'response','a','earned',1,'possible',1)) from public.exam_review_items where attempt_id=current_setting('test.limit_attempt')::uuid),60) as score \gset
select check_assert((:'score'::jsonb->>'earned')::int=150 and (:'score'::jsonb->>'possible')::int=150,'standalone score saves 150/150');
reset role;
-- Build public snapshots for 25 whole cases; no patient diagnosis titles are used.
select set_config('test.limit_cases',(select jsonb_agg(jsonb_build_object('question_id',i.id,'source_kind','ngn_case','source_id',i.id,'case_id',i.case_id,
 'question_snapshot',jsonb_build_object('id',i.id,'type','single','category','Antepartum','stem',i.stem,'options',jsonb_build_array(jsonb_build_object('id','a','label','Assess')),'case_context',jsonb_build_object('case_id',i.case_id,'item_id',i.id,'case_number',c.case_number,'item_number',i.item_number,'item_count',6)),
 'solution_snapshot',jsonb_build_object('answer_key','a','rationale','Synthetic rationale')) order by c.case_number,i.item_number) from public.ngn_items i join public.ngn_cases c on c.id=i.case_id where i.id::text like '71000000%')::text,true);
select set_config('test.limit_standard',(select jsonb_agg(jsonb_build_object('question_id',q.id,'source_kind','question','source_id',q.id,'case_id',null,'question_snapshot',to_jsonb(q),'solution_snapshot',to_jsonb(s)) order by q.id) from public.questions q join public.question_solutions s on s.question_id=q.id where q.id::text like '21000000%' and right(q.id::text,12)::int<=144)::text,true);
set local role service_role;
select public.start_mixed_exam_attempt('10000000-0000-0000-0000-000000000001','test',current_setting('test.limit_cases')::jsonb,'150 case questions') as case_only \gset
select check_assert(jsonb_array_length(:'case_only'::jsonb->'questions')=150,'25 complete cases start as 150 questions');
select public.start_mixed_exam_attempt('10000000-0000-0000-0000-000000000001','test',current_setting('test.limit_standard')::jsonb||(select jsonb_agg(value order by ordinality) from jsonb_array_elements(current_setting('test.limit_cases')::jsonb) with ordinality where ordinality<=6),'150 mixed questions') as mixed \gset
select set_config('test.limit_mixed',:'mixed'::jsonb->>'attemptId',true);
select check_assert(jsonb_array_length(:'mixed'::jsonb->'questions')=150,'144 standalone plus six case items start');
select public.complete_exam_review_attempt(current_setting('test.limit_mixed')::uuid,'10000000-0000-0000-0000-000000000001',
(select jsonb_agg(jsonb_build_object('question_id',question_id,'response','a','earned',1,'possible',1)) from public.exam_review_items where attempt_id=current_setting('test.limit_mixed')::uuid),60) as mixed_score \gset
select check_assert((:'mixed_score'::jsonb->>'earned')::int=150,'mixed score saves 150/150');
select check_assert((select count(*)=144 from public.exam_responses where attempt_id=current_setting('test.limit_mixed')::uuid),'144 standalone responses preserved');
select check_assert((select count(*)=6 from public.exam_case_responses where attempt_id=current_setting('test.limit_mixed')::uuid),'six case responses preserved');
do $$begin
 begin perform public.start_mixed_exam_attempt('10000000-0000-0000-0000-000000000001','test',current_setting('test.limit_cases')::jsonb||jsonb_build_array(jsonb_build_object('question_id',gen_random_uuid())),'151 rejected');raise exception 'Expected limit rejection';exception when invalid_parameter_value then null;end;
end$$;
reset role;
select check_assert(not exists(select id,user_id,mode,earned,possible,duration_seconds,created_at,completed_at from public.exam_attempts where id in(select id from baseline_attempts) except select * from baseline_attempts),'historical scores unchanged');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select check_assert((select count(*)=0 from public.exam_review_items where attempt_id=current_setting('test.limit_mixed')::uuid),'another student cannot read 150-question review');
reset role;
select 'PASS: 150 standalone, 25 cases, mixed 150, full scoring/responses, 151 rejected, ownership and old scores preserved' as result;
rollback;
