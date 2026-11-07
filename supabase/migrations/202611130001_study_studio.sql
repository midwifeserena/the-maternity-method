-- PROPOSED: review and test in staging before production. No existing content is changed.
begin;
create table if not exists public.studio_notes(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 120),kind text not null check(kind in('notebook','audio')),
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=2000000),revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.studio_flashcards(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 topic text not null check(length(topic) between 1 and 100),front text not null check(length(front) between 1 and 10000),back text not null check(length(back) between 1 and 20000),high_yield boolean not null default false,
 revision integer not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.studio_assets(
 id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,path text not null unique check(path ~ ('^'||owner_id::text||'/'||id::text||'\.(pdf|png|jpg|webp|txt)$')),
 name text not null check(length(name) between 1 and 180),mime text not null check(mime in('application/pdf','image/png','image/jpeg','image/webp','text/plain')),
 size integer not null check(size between 1 and 3145728),created_at timestamptz not null default now()
);
-- RLS protects reads and writes even when an authenticated client accesses tables directly.
do $$declare t text;begin
 foreach t in array array['studio_notes','studio_flashcards','studio_assets'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('drop policy if exists studio_owner on public.%I',t);
  execute format('create policy studio_owner on public.%I for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()))',t);
  execute format('drop policy if exists studio_owner_guard on public.%I',t);
  execute format('create policy studio_owner_guard on public.%I as restrictive for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()))',t);
 end loop;
end$$;
create index if not exists studio_notes_owner_idx on public.studio_notes(owner_id,updated_at desc,id);
create index if not exists studio_flashcards_owner_idx on public.studio_flashcards(owner_id,updated_at desc,id);
create index if not exists studio_assets_owner_idx on public.studio_assets(owner_id,created_at desc,id);
-- Upload metadata is immutable: users may delete and upload a replacement.
revoke update,delete on public.studio_assets from authenticated;
create or replace function public.studio_upload_quota() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and new.owner_id<>auth.uid() then raise exception 'Owner mismatch' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
 if (select coalesce(sum(size),0) from public.studio_assets where owner_id=new.owner_id)+new.size>52428800 then raise exception 'Personal upload limit reached' using errcode='23514';end if;
 return new;
end$$;
revoke all on function public.studio_upload_quota() from public,anon,authenticated;
drop trigger if exists studio_upload_quota on public.studio_assets;
create trigger studio_upload_quota before insert on public.studio_assets for each row execute function public.studio_upload_quota();
do $$begin if exists(select 1 from storage.buckets where id='student-study-studio' and public) then raise exception 'The Study Studio bucket must be private; review existing storage before proceeding.';end if;end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-study-studio','student-study-studio',false,3145728,array['application/pdf','image/png','image/jpeg','image/webp','text/plain']) on conflict(id) do nothing;
-- Browser clients cannot access this bucket directly, defeating broad existing policies.
-- Authenticated server endpoints verify owner, enforce quota, then use the existing service role.
drop policy if exists studio_private_guard on storage.objects;
create policy studio_private_guard on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'student-study-studio') with check(bucket_id<>'student-study-studio');
drop policy if exists studio_private_access on storage.objects;
notify pgrst,'reload schema';
commit;
