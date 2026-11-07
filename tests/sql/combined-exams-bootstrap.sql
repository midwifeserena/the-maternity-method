-- DISPOSABLE DATABASE ONLY. Minimal NGN tables for the local migration regression harness.
-- Run after tests/sql/exam-review-bootstrap.sql and supabase/schema.sql.
create table public.ngn_cases(id uuid primary key,case_number integer,topic public.ob_category,title text,intro text,tabs jsonb default '{}',published boolean default false,review_status text default 'draft');
create table public.ngn_items(id uuid primary key,case_id uuid references public.ngn_cases(id),item_number integer,item_type text,stem text,content jsonb,scoring_rule text default '0/1',published boolean default false,review_status text default 'draft');
create table public.ngn_answers(item_id uuid primary key references public.ngn_items(id),case_id uuid references public.ngn_cases(id),answer jsonb,answer_text text,rationale text);
alter table public.ngn_cases enable row level security;alter table public.ngn_items enable row level security;alter table public.ngn_answers enable row level security;
grant select on public.ngn_cases,public.ngn_items to authenticated;
create policy test_published_cases on public.ngn_cases for select to authenticated using(published);
create policy test_published_items on public.ngn_items for select to authenticated using(published);
