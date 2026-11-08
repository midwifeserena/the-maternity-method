-- PROPOSED: review and test before production. Requires existing exam-review setup.
-- Keeps unfinished progress separate from scored responses and completed history.
begin;
alter table public.exam_attempts add column if not exists analytics_exempt boolean not null default false;
create table if not exists public.exam_drafts(
 attempt_id uuid primary key references public.exam_attempts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 state jsonb not null check(jsonb_typeof(state)='object' and octet_length(state::text)<=1000000),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
create index if not exists exam_drafts_owner_updated on public.exam_drafts(user_id,updated_at desc);
alter table public.exam_drafts enable row level security;
revoke all on public.exam_drafts from public,anon,authenticated;
grant select on public.exam_drafts to authenticated;
grant all on public.exam_drafts to service_role;
drop policy if exists exam_drafts_owner on public.exam_drafts;
create policy exam_drafts_owner on public.exam_drafts for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=(select auth.uid())));
drop policy if exists exam_drafts_owner_guard on public.exam_drafts;
create policy exam_drafts_owner_guard on public.exam_drafts as restrictive for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.exam_attempts a where a.id=attempt_id and a.user_id=(select auth.uid())));
create or replace function public.save_exam_draft(p_attempt_id uuid,p_user_id uuid,p_revision integer,p_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.exam_attempts; saved public.exam_drafts;
begin
 select * into a from public.exam_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Exam not found' using errcode='42501'; end if;
 if a.completed_at is not null then raise exception 'Exam already submitted' using errcode='55000'; end if;
 if p_revision is null or p_revision<0 or p_state is null or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>1000000 then raise exception 'Invalid progress' using errcode='22023'; end if;
 select * into saved from public.exam_drafts where attempt_id=p_attempt_id for update;
 if found then
  if saved.user_id<>p_user_id or saved.revision<>p_revision then raise exception 'Progress changed in another window' using errcode='40001'; end if;
  update public.exam_drafts set state=p_state,revision=revision+1,updated_at=now() where attempt_id=p_attempt_id returning * into saved;
 else
  if p_revision<>0 then raise exception 'Progress changed in another window' using errcode='40001'; end if;
  insert into public.exam_drafts(attempt_id,user_id,state) values(p_attempt_id,p_user_id,p_state) returning * into saved;
 end if;
 update public.exam_attempts set analytics_exempt=true where id=p_attempt_id;
 return jsonb_build_object('revision',saved.revision,'updatedAt',saved.updated_at);
end;
$$;
revoke all on function public.save_exam_draft(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_exam_draft(uuid,uuid,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;

select to_regprocedure('public.save_exam_draft(uuid,uuid,integer,jsonb)') is not null as save_resume_ready;
