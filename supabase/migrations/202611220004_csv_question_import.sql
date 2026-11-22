begin;

create or replace function public.import_and_publish_bank_questions(p_records jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry record; normalized_stem text; source_tag text; published_count integer:=0; skipped integer:=0;
begin
 if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records) not between 1 and 647 then
  raise exception 'Expected 1 to 647 question records';
 end if;

 lock table public.questions in share row exclusive mode;
 for entry in select * from jsonb_to_recordset(p_records) as x(id uuid, question jsonb, solution jsonb) loop
  normalized_stem:=lower(regexp_replace(btrim(entry.question->>'stem'),'[[:space:]]+',' ','g'));
  source_tag:=entry.question->'tags'->>0;
  -- Publish unchanged drafts from earlier runs of this importer.
  if exists (
   select 1 from public.questions q
   where q.id=entry.id and q.editor_revision=1 and not q.published
     and q.archived_at is null
     and q.tags && array[source_tag]
  ) then
   perform public.manage_question_studio('publish',entry.id,entry.question,entry.solution,1);
   published_count:=published_count+1;
  elsif exists (select 1 from public.questions q where q.id=entry.id)
     or exists (select 1 from public.questions q where q.tags && array[source_tag])
     or exists (
      select 1 from public.questions q
      where lower(regexp_replace(btrim(q.stem),'[[:space:]]+',' ','g'))=normalized_stem
     )
     or exists (select 1 from public.ngn_items i where i.id=entry.id)
     or exists (
      select 1 from public.ngn_items i where 'source:' || (i.content->>'source_id')=source_tag
     )
     or exists (
      select 1 from public.ngn_items i
      where lower(regexp_replace(btrim(i.stem),'[[:space:]]+',' ','g'))=normalized_stem
     ) then
   skipped:=skipped+1;
  else
   perform public.manage_question_studio('create',entry.id,entry.question,entry.solution,0);
   perform public.manage_question_studio('publish',entry.id,entry.question,entry.solution,1);
   published_count:=published_count+1;
  end if;
 end loop;
 return jsonb_build_object('published',published_count,'skipped',skipped);
end;
$$;
revoke all on function public.import_and_publish_bank_questions(jsonb) from public, anon, authenticated;
grant execute on function public.import_and_publish_bank_questions(jsonb) to service_role;
notify pgrst, 'reload schema';

commit;
