-- DISPOSABLE DATABASE ONLY. Run after minimal auth/lesson bootstrap and proposed migration.
insert into auth.users values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.lessons(id,published) values('20000000-0000-0000-0000-000000000001',true),('20000000-0000-0000-0000-000000000002',false);
create policy test_broad_read on public.lesson_progress for select to authenticated using(true);
set role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.save_lesson_progress('20000000-0000-0000-0000-000000000001',0,'Private notes',false,12,180);
select public.save_lesson_progress('20000000-0000-0000-0000-000000000001',1,'Private notes edited',true,20,180);
do $$begin
 if (select count(*) from public.lesson_progress)<>1 then raise exception 'Owner read failed';end if;
 begin perform public.save_lesson_progress('20000000-0000-0000-0000-000000000001',1,'Stale',true,0,180);raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 begin perform public.save_lesson_progress('20000000-0000-0000-0000-000000000002',0,'Hidden',false,0,0);raise exception 'Unpublished save accepted';exception when insufficient_privilege then null;end;
 begin insert into public.lesson_progress(user_id,lesson_id) values(auth.uid(),'20000000-0000-0000-0000-000000000002');raise exception 'Direct writes allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
do $$begin if exists(select 1 from public.lesson_progress)then raise exception 'Foreign notes leaked';end if;end$$;
select public.save_lesson_progress('20000000-0000-0000-0000-000000000001',0,'Other owner notes',false,0,180);
reset role;
do $$begin if (select count(*) from public.lesson_progress)<>2 then raise exception 'Owner records not independent';end if;end$$;
set role anon;
do $$begin begin perform public.save_lesson_progress('20000000-0000-0000-0000-000000000001',0,'Unauthorized',false,0,0);raise exception 'Anonymous save allowed';exception when insufficient_privilege then null;end;end$$;
reset role;
