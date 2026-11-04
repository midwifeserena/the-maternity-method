-- Shared flashcard library only. Does not modify personal cards or decks.
begin;
create table if not exists public.flashcard_library (
 id uuid primary key,
 card_number integer not null,
 topic text not null,
 front text not null,
 back text not null,
 high_yield boolean not null default false,
 review_status text not null default 'needs_review',
 published boolean not null default false
);
alter table public.flashcard_library add column if not exists review_status text not null default 'needs_review';
alter table public.flashcard_library add column if not exists published boolean not null default false;
alter table public.flashcard_library enable row level security;
revoke all on public.flashcard_library from public, anon, authenticated;
grant select on public.flashcard_library to authenticated;
grant all on public.flashcard_library to service_role;
drop policy if exists flashcard_library_published on public.flashcard_library;
create policy flashcard_library_published on public.flashcard_library
 for select to authenticated using (published=true and review_status='approved');
drop policy if exists flashcard_library_publication_guard on public.flashcard_library;
create policy flashcard_library_publication_guard on public.flashcard_library
 as restrictive for select to authenticated using (published=true and review_status='approved');
notify pgrst, 'reload schema';
commit;
