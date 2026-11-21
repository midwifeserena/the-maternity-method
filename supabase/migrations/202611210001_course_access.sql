begin;

create schema if not exists course_access_private;
revoke all on schema course_access_private from public, anon, authenticated;

create table course_access_private.settings (
 singleton boolean primary key default true check (singleton),
 invite_only boolean not null default false
);
insert into course_access_private.settings(singleton) values (true);

create table course_access_private.invites (
 email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 320),
 expires_at timestamptz
);
revoke all on all tables in schema course_access_private from public, anon, authenticated;

-- Consult confirmed account email from Auth, never editable user metadata or a client input.
create function public.has_course_access() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((
  select not settings.invite_only or exists (
   select 1 from auth.users as account
   join course_access_private.invites as invite on invite.email=lower(btrim(account.email))
   where account.id=(select auth.uid())
     and account.email_confirmed_at is not null
     and (invite.expires_at is null or invite.expires_at>now())
  )
  from course_access_private.settings as settings where settings.singleton
 ),false);
$$;
revoke all on function public.has_course_access() from public;
grant execute on function public.has_course_access() to anon, authenticated;

-- Keep existing ownership/publication policies. Restrictive policies add the same gate
-- to direct Supabase access, including queries from the browser.
do $$
declare protected_table text;
begin
 foreach protected_table in array array[
  'questions','question_solutions','ngn_cases','ngn_items','ngn_answers','lessons','guides',
  'flashcard_library','flashcard_decks','flashcards','exam_attempts','exam_responses',
  'exam_case_responses','exam_review_items','exam_drafts','lesson_progress',
  'studio_notes','studio_flashcards','studio_assets'
 ] loop
  if to_regclass(format('public.%I',protected_table)) is not null then
   execute format('alter table public.%I enable row level security', protected_table);
   execute format(
    'create policy course_invite_guard on public.%I as restrictive for all to anon, authenticated using ((select public.has_course_access())) with check ((select public.has_course_access()))',
    protected_table
   );
  end if;
 end loop;
end;
$$;

create policy course_invite_media_guard on storage.objects as restrictive for all to anon, authenticated
using (bucket_id not in ('question-media','student-study-studio') or (select public.has_course_access()))
with check (bucket_id not in ('question-media','student-study-studio') or (select public.has_course_access()));

-- These signed-in RPCs run as their owner and need the same gate before bypassing RLS.
alter function public.start_exam_review_attempt(uuid[],text,text,text) set schema course_access_private;
revoke all on function course_access_private.start_exam_review_attempt(uuid[],text,text,text) from public, anon, authenticated;
create function public.start_exam_review_attempt(
 p_question_ids uuid[],p_mode text,p_exam_name text default null,p_snapshot_stage text default 'start'
) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.has_course_access() then
  raise exception 'Course access required' using errcode='42501';
 end if;
 return course_access_private.start_exam_review_attempt(p_question_ids,p_mode,p_exam_name,p_snapshot_stage);
end;
$$;
revoke all on function public.start_exam_review_attempt(uuid[],text,text,text) from public, anon;
grant execute on function public.start_exam_review_attempt(uuid[],text,text,text) to authenticated;

-- Older projects may not have installed video lesson progress.
do $optional$
begin
 if to_regprocedure('public.save_lesson_progress(uuid,integer,text,boolean,integer,integer)') is not null then
  alter function public.save_lesson_progress(uuid,integer,text,boolean,integer,integer) set schema course_access_private;
  revoke all on function course_access_private.save_lesson_progress(uuid,integer,text,boolean,integer,integer) from public, anon, authenticated;
  create function public.save_lesson_progress(
   p_lesson_id uuid,p_revision integer,p_notes text,p_completed boolean,p_position integer,p_duration integer
  ) returns jsonb language plpgsql security definer set search_path='' as $$
  begin
   if auth.uid() is null or not public.has_course_access() then
    raise exception 'Course access required' using errcode='42501';
   end if;
   return course_access_private.save_lesson_progress(p_lesson_id,p_revision,p_notes,p_completed,p_position,p_duration);
  end;
  $$;
  revoke all on function public.save_lesson_progress(uuid,integer,text,boolean,integer,integer) from public, anon;
  grant execute on function public.save_lesson_progress(uuid,integer,text,boolean,integer,integer) to authenticated;
 end if;
end;
$optional$;

notify pgrst, 'reload schema';
commit;
