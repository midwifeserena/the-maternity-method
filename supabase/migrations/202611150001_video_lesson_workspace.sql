-- PROPOSED: review and test before production. No exam or readiness tables changed.
begin;
alter table public.lessons add column if not exists transcript text;
alter table public.lessons add column if not exists duration_seconds integer check(duration_seconds between 0 and 86400);
alter table public.lessons add column if not exists study_guide_slug text;
alter table public.lessons add column if not exists sort_order integer;
create table if not exists public.lesson_progress(
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 notes text not null default '' check(length(notes)<=20000),
 completed boolean not null default false,
 position integer not null default 0 check(position between 0 and 86400),
 duration integer not null default 0 check(duration between 0 and 86400),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
alter table public.lesson_progress enable row level security;
revoke all on public.lesson_progress from public,anon,authenticated;
grant select on public.lesson_progress to authenticated;
grant all on public.lesson_progress to service_role;
drop policy if exists lesson_progress_owner on public.lesson_progress;
create policy lesson_progress_owner on public.lesson_progress for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists lesson_progress_owner_guard on public.lesson_progress;
create policy lesson_progress_owner_guard on public.lesson_progress as restrictive for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.save_lesson_progress(p_lesson_id uuid,p_revision integer,p_notes text,p_completed boolean,p_position integer,p_duration integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); saved public.lesson_progress;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from public.lessons where id=p_lesson_id and published) then raise exception 'Lesson unavailable' using errcode='42501'; end if;
 if p_revision is null or p_revision<0 or p_notes is null or length(p_notes)>20000 or p_completed is null or p_position is null or p_position not between 0 and 86400 or p_duration is null or p_duration not between 0 and 86400 then raise exception 'Invalid progress' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text||p_lesson_id::text,0));
 select * into saved from public.lesson_progress where user_id=owner_id and lesson_id=p_lesson_id for update;
 if found then
  if saved.revision<>p_revision then raise exception 'Progress changed in another window' using errcode='40001'; end if;
  update public.lesson_progress set notes=p_notes,completed=p_completed,position=p_position,duration=p_duration,revision=revision+1,updated_at=now() where user_id=owner_id and lesson_id=p_lesson_id returning * into saved;
 else
  if p_revision<>0 then raise exception 'Progress changed in another window' using errcode='40001'; end if;
  insert into public.lesson_progress(user_id,lesson_id,notes,completed,position,duration) values(owner_id,p_lesson_id,p_notes,p_completed,p_position,p_duration) returning * into saved;
 end if;
 return to_jsonb(saved)-'user_id';
end;
$$;
revoke all on function public.save_lesson_progress(uuid,integer,text,boolean,integer,integer) from public,anon;
grant execute on function public.save_lesson_progress(uuid,integer,text,boolean,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
select to_regprocedure('public.save_lesson_progress(uuid,integer,text,boolean,integer,integer)') is not null as video_workspace_ready;
