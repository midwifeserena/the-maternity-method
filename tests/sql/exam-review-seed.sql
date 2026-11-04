-- DISPOSABLE DATABASE ONLY: synthetic users, questions and legacy sessions.

grant select on public.questions to authenticated;grant all on all tables in schema public to service_role;
insert into auth.users values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.questions(id,category,type,stem,options,matrix_rows,published) values
('20000000-0000-0000-0000-000000000001','Antepartum','single','Original MC','[{"id":"a","label":"Original A"},{"id":"b","label":"Original B"}]','[]',true),
('20000000-0000-0000-0000-000000000002','Postpartum','sata','Original SATA','[{"id":"a","label":"A"},{"id":"b","label":"B"},{"id":"c","label":"C"}]','[]',true),
('20000000-0000-0000-0000-000000000003','Intrapartum','matrix','Original matrix','[{"id":"a","label":"A"},{"id":"b","label":"B"}]','[{"id":"r1","label":"Row 1"},{"id":"r2","label":"Row 2"}]',true);
insert into public.question_solutions values
('20000000-0000-0000-0000-000000000001','"a"','Original rationale'),
('20000000-0000-0000-0000-000000000002','["a","b"]','Original SATA rationale'),
('20000000-0000-0000-0000-000000000003','{"r1":"a","r2":"b"}','Original matrix rationale');
insert into public.exam_attempts(id,user_id,mode,earned,possible,completed_at) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','study',1,1,now()),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','test',7,10,now());
insert into public.exam_responses(attempt_id,user_id,question_id,response,earned,possible) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','"a"',1,1);
create table baseline_attempts as select * from public.exam_attempts;
create table baseline_responses as select * from public.exam_responses;
