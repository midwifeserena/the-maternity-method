-- Commit the enum addition before casting question categories to it.
alter type public.ob_category add value if not exists 'Pediatrics';

create or replace function public.import_and_publish_bank_questions(p_records jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry record; published_count integer:=0; skipped integer:=0;
begin
 if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records)<>647 then
  raise exception 'Expected the reviewed 647-question import';
 end if;

 lock table public.questions in share row exclusive mode;
 for entry in select * from jsonb_to_recordset(p_records) as x(id uuid, question jsonb, solution jsonb) loop
  -- Publish unchanged drafts from earlier runs of this importer.
  if exists (
   select 1 from public.questions q
   where q.id=entry.id and q.editor_revision=1 and not q.published
     and q.archived_at is null
     and q.tags && array(select jsonb_array_elements_text(entry.question->'tags'))
  ) then
   perform public.manage_question_studio('publish',entry.id,entry.question,entry.solution,1);
   published_count:=published_count+1;
  elsif exists (
   select 1 from public.questions q
   where q.id=entry.id
     or q.tags && array(select jsonb_array_elements_text(entry.question->'tags'))
     or lower(regexp_replace(btrim(q.stem),'[[:space:]]+',' ','g')) =
        lower(regexp_replace(btrim(entry.question->>'stem'),'[[:space:]]+',' ','g'))
  ) or exists (
   select 1 from public.ngn_items i
   where i.id=entry.id
      or 'source:' || (i.content->>'source_id')=entry.question->'tags'->>0
      or lower(regexp_replace(btrim(i.stem),'[[:space:]]+',' ','g')) =
         lower(regexp_replace(btrim(entry.question->>'stem'),'[[:space:]]+',' ','g'))
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
