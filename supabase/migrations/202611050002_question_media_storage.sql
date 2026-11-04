-- PROPOSED: private storage for question/rationale images. No student policies.
-- Existing buckets are untouched. Existing public brand assets stay public.
begin;
do $$begin
 if exists(select 1 from storage.buckets where id='question-media' and public=true) then
  raise exception 'question-media already exists as a public bucket; review before changing it';
 end if;
end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('question-media','question-media',false,3145728,array['image/png','image/jpeg','image/webp'])
 on conflict(id) do nothing;
-- A broad existing permissive storage policy must not expose this bucket.
drop policy if exists tmm_private_question_media on storage.objects;
create policy tmm_private_question_media on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'question-media') with check(bucket_id<>'question-media');
commit;
