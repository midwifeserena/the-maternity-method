-- DISPOSABLE DATABASE ONLY: after exam-review bootstrap/seed, NGN schema and all feature migrations.
-- Define check_assert(ok boolean,message text) as in other SQL checks first.
-- Never run this fixture on staging/production content. Exercises failure paths.
insert into ngn_cases values('70000000-0000-0000-0000-000000000001',80,'rollback','Antepartum','Rollback case','Scenario','{}','approved',false);
insert into ngn_items(id,case_id,item_number,item_type,stem,content,scoring_rule,review_status,published) values
('71000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',1,'Multiple Choice','Synthetic','{"options":["A","B"]}','0/1','approved',false),
('71000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001',2,'Multiple Choice','Synthetic','{"options":["A","B"]}','0/1','approved',false);
insert into ngn_answers select id,case_id,item_number,'{"correct":["A"]}','A','Original' from ngn_items where case_id='70000000-0000-0000-0000-000000000001';
insert into questions(id,category,type,stem,options,published) values('71000000-0000-0000-0000-000000000002','Antepartum','single','Existing destination','[]',false);
do $$declare source jsonb;docs jsonb;begin
 select jsonb_build_object('case',(select to_jsonb(c) from ngn_cases c where id='70000000-0000-0000-0000-000000000001'),'items',(select jsonb_agg(to_jsonb(i) order by id) from ngn_items i where case_id='70000000-0000-0000-0000-000000000001'),'answers',(select jsonb_agg(to_jsonb(a) order by item_id) from ngn_answers a where case_id='70000000-0000-0000-0000-000000000001')) into source;
 select jsonb_agg(jsonb_build_object('question',jsonb_build_object('id',id,'category','Antepartum','type','single','matrix_mode','single','stem','Copied','options','[{"id":"a","label":"A"},{"id":"b","label":"B"}]'::jsonb,'bank_section','ngn'),'solution',jsonb_build_object('answer_key','a','rationale','Reason')) order by id) into docs from ngn_items where case_id='70000000-0000-0000-0000-000000000001';
 begin perform transfer_standalone_ngn('70000000-0000-0000-0000-000000000001','{}',docs);raise exception 'Expected stale rejection';exception when serialization_failure then null;end;
 begin perform transfer_standalone_ngn('70000000-0000-0000-0000-000000000001',source,docs);raise exception 'Expected collision rejection';exception when unique_violation then null;end;
 perform check_assert(not exists(select 1 from questions where id='71000000-0000-0000-0000-000000000001'),'partial insert rolls back');
 perform check_assert(not exists(select 1 from ngn_items where case_id='70000000-0000-0000-0000-000000000001' and qbank_question_id is not null),'source mappings roll back');
 perform check_assert((select stem='Existing destination' from questions where id='71000000-0000-0000-0000-000000000002'),'collision never overwrites destination');
end$$;
insert into ngn_cases values('70000000-0000-0000-0000-000000000006',86,'six','Antepartum','Six item case','Scenario','{}','approved',false);
insert into ngn_items(id,case_id,item_number,item_type,stem,content,scoring_rule,review_status,published) select gen_random_uuid(),'70000000-0000-0000-0000-000000000006',n,'Multiple Choice','Synthetic','{}','0/1','approved',false from generate_series(1,6) n;
do $$begin
 begin perform transfer_standalone_ngn('70000000-0000-0000-0000-000000000006','{}','[]');raise exception 'Expected six-item rejection';exception when invalid_parameter_value then null;end;
 perform check_assert((select count(*)=6 from ngn_items where case_id='70000000-0000-0000-0000-000000000006' and qbank_question_id is null),'six-item case stays unchanged');
end$$;
