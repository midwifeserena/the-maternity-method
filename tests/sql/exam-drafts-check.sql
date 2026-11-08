-- DISPOSABLE DATABASE ONLY; execute after bootstrap and proposed migration.
insert into auth.users values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.exam_attempts(id,user_id) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
set role service_role;
select public.save_exam_draft('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',0,'{"version":1,"answers":{"q1":"a"}}');
select public.save_exam_draft('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1,'{"version":1,"answers":{"q1":"b"}}');
do $$begin
 begin perform public.save_exam_draft('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',2,'{}');raise exception 'Cross-owner save allowed';exception when insufficient_privilege then null;end;
 begin perform public.save_exam_draft('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1,'{}');raise exception 'Stale revision allowed';exception when serialization_failure then null;end;
end$$;
reset role;
do $$begin if not exists(select 1 from public.exam_attempts where id='20000000-0000-0000-0000-000000000001' and completed_at is null and earned=0 and possible=0 and analytics_exempt) then raise exception 'Draft changed grading';end if;end$$;
-- A deliberately broad old policy must not bypass the restrictive owner guard.
create policy broad_test on public.exam_drafts for select to authenticated using(true);
set role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
do $$begin if exists(select 1 from public.exam_drafts)then raise exception 'Foreign draft visible';end if;
 begin perform public.save_exam_draft('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',2,'{}');raise exception 'Client RPC allowed';exception when insufficient_privilege then null;end;
 begin insert into public.exam_drafts(attempt_id,user_id,state) values('20000000-0000-0000-0000-000000000002',auth.uid(),'{}');raise exception 'Client insert allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$begin if (select count(*) from public.exam_drafts)<>1 then raise exception 'Owner cannot see draft';end if;end$$;
reset role;
update public.exam_attempts set completed_at=now(),earned=1,possible=2 where id='20000000-0000-0000-0000-000000000001';
set role service_role;
do $$begin begin perform public.save_exam_draft('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',2,'{}');raise exception 'Completed save allowed';exception when sqlstate '55000' then null;end;end$$;
reset role;
do $$begin if not exists(select 1 from public.exam_attempts where id='20000000-0000-0000-0000-000000000001' and earned=1 and possible=2 and completed_at is not null) then raise exception 'Completed score changed';end if;end$$;
