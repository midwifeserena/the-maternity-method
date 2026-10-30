-- Run once in your Supabase SQL editor. All public tables use row-level security.
create extension if not exists pgcrypto;
create type public.ob_category as enum ('Antepartum','Intrapartum','Postpartum','Newborn');
create type public.ob_question_type as enum ('single','sata','matrix');

create table public.questions (
 id uuid primary key default gen_random_uuid(), category public.ob_category not null,
 type public.ob_question_type not null,stem text not null,
 options jsonb not null check (jsonb_typeof(options)='array'),
 matrix_rows jsonb not null default '[]'::jsonb,
 chart jsonb not null default '{}'::jsonb,
 published boolean not null default false,created_at timestamptz not null default now()
);
-- Separate, privileged-only question solutions; never expose answer keys via public questions.
create table public.question_solutions (
 question_id uuid primary key references public.questions(id) on delete cascade,
 answer_key jsonb not null,rationale text not null
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,created_at timestamptz not null default now()
);
create table public.exam_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check (mode in ('study','test')),
 earned integer not null default 0,possible integer not null default 0,
 duration_seconds integer not null default 0,
 created_at timestamptz not null default now(),completed_at timestamptz
);
create table public.exam_responses (
 id uuid primary key default gen_random_uuid(),attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid not null references public.questions(id),
 response jsonb,earned integer not null,possible integer not null,
 unique(attempt_id,question_id)
);
create table public.lessons (
 id uuid primary key default gen_random_uuid(),title text not null,category public.ob_category not null,
 description text not null default '',video_url text not null,thumbnail_url text,
 published boolean not null default false,created_at timestamptz not null default now()
);
create table public.guides (
 id uuid primary key default gen_random_uuid(),title text not null,category public.ob_category not null,
 description text not null default '',file_url text not null,
 published boolean not null default false,created_at timestamptz not null default now()
);
create table public.flashcard_decks (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,created_at timestamptz not null default now()
);
create table public.flashcards (
 id uuid primary key default gen_random_uuid(),deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
 front text not null,back text not null,next_review_at timestamptz,interval_days integer not null default 0
);
create table public.subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,
 status text not null default 'inactive',plan text,access_expires_at timestamptz,provider_customer_id text
);

alter table public.questions enable row level security;
alter table public.question_solutions enable row level security;
alter table public.profiles enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_responses enable row level security;
alter table public.lessons enable row level security;
alter table public.guides enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.subscriptions enable row level security;

create policy "Students read published questions" on public.questions for select to authenticated using (published=true);
-- No user policy for solutions: service-role server only.
create policy "Students read published lessons" on public.lessons for select to authenticated using (published=true);
create policy "Students read published guides" on public.guides for select to authenticated using (published=true);
create policy "Read own profile" on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy "Update own profile" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy "Read own attempts" on public.exam_attempts for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own responses" on public.exam_responses for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own decks" on public.flashcard_decks for select to authenticated using (user_id=(select auth.uid()));
create policy "Add own decks" on public.flashcard_decks for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Edit own decks" on public.flashcard_decks for update to authenticated using (user_id=(select auth.uid()));
create policy "Remove own decks" on public.flashcard_decks for delete to authenticated using (user_id=(select auth.uid()));
create policy "Read own cards" on public.flashcards for select to authenticated using (exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.user_id=(select auth.uid())));
create policy "Add own cards" on public.flashcards for insert to authenticated with check (exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.user_id=(select auth.uid())));
create policy "Edit own cards" on public.flashcards for update to authenticated using (exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.user_id=(select auth.uid())));
create policy "Delete own cards" on public.flashcards for delete to authenticated using (exists(select 1 from public.flashcard_decks d where d.id=deck_id and d.user_id=(select auth.uid())));
create policy "Read own subscription" on public.subscriptions for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.create_profile_for_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles (id) values (new.id); return new; end; $$;
create trigger on_user_created after insert on auth.users for each row execute procedure public.create_profile_for_signup();
create index questions_category_idx on public.questions (category) where published=true;
create index attempts_user_date_idx on public.exam_attempts (user_id,completed_at desc);
create index responses_attempt_idx on public.exam_responses (attempt_id);
create index lessons_category_idx on public.lessons (category) where published=true;
create index guides_category_idx on public.guides (category) where published=true;
