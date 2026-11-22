begin;

create table if not exists public.past_question_bank_performance (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reset_at timestamptz not null default now(),
 summary jsonb not null
);
create index if not exists past_question_bank_performance_owner_idx
 on public.past_question_bank_performance (user_id, reset_at desc);
alter table public.past_question_bank_performance enable row level security;
revoke all on public.past_question_bank_performance from public, anon, authenticated;
grant select on public.past_question_bank_performance to authenticated;
grant select on public.past_question_bank_performance to service_role;
drop policy if exists read_own_past_question_bank_performance on public.past_question_bank_performance;
create policy read_own_past_question_bank_performance on public.past_question_bank_performance
 for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.reset_question_bank_progress(
 p_user_id uuid, p_reset_id uuid, p_attempts jsonb, p_summary jsonb
) returns boolean
language plpgsql security definer set search_path='' as $$
declare
 locked_attempts jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('question-bank-reset:' || p_user_id::text, 0));
 if exists (
  select 1 from public.past_question_bank_performance
  where user_id=p_user_id and id=p_reset_id
 ) then
  return true;
 end if;

 -- Lock the rows used to verify the snapshot against concurrent exam submissions.
 select coalesce(jsonb_object_agg(id, completed_at), '{}'::jsonb) into locked_attempts
 from (
  select id, completed_at from public.exam_attempts
  where user_id=p_user_id order by id for update
 ) own_attempts;
 if locked_attempts is distinct from (
  select coalesce(jsonb_object_agg(key, value::timestamptz), '{}'::jsonb)
  from jsonb_each_text(p_attempts)
 ) then
  raise exception 'Exam history changed during reset' using errcode='40001';
 end if;
 if locked_attempts='{}'::jsonb then
  return false;
 end if;

 insert into public.past_question_bank_performance (id,user_id,summary)
 values (p_reset_id,p_user_id,p_summary);
 -- Foreign keys cascade to answers, saved drafts, and review snapshots.
 delete from public.exam_attempts
 where user_id=p_user_id and id in (select key::uuid from jsonb_object_keys(locked_attempts) as keys(key));
 return true;
end;
$$;

revoke all on function public.reset_question_bank_progress(uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.reset_question_bank_progress(uuid,uuid,jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';

commit;
