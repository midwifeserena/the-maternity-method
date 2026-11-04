-- PROPOSED: apply after 20261104_exam_reviews.sql. No production changes made.
begin;
alter table public.questions add column if not exists question_image_url text;
alter table public.questions add column if not exists question_image_alt text;
-- Explanations remain in the protected solutions table, never public questions.
alter table public.question_solutions add column if not exists rationale_image_url text;
alter table public.question_solutions add column if not exists rationale_image_alt text;
alter table public.question_solutions add column if not exists nursing_tip text;

create or replace function public.start_exam_review_attempt(
 p_question_ids uuid[],p_mode text,p_exam_name text default null,p_snapshot_stage text default 'start'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 owner_id uuid:=auth.uid(); attempt uuid; total integer; copied integer:=0;
 entry record; visible_questions jsonb:='[]'::jsonb;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 total:=coalesce(cardinality(p_question_ids),0);
 if total<1 or total>50 or p_mode is null or p_snapshot_stage is null or p_mode not in ('study','test') or p_snapshot_stage not in ('start','submission')
  or (select count(distinct id) from unnest(p_question_ids) id)<>total then
  raise exception 'Invalid exam request' using errcode='22023';
 end if;
 insert into public.exam_attempts(user_id,mode,exam_name,question_count,snapshot_stage)
 values(owner_id,p_mode,coalesce(nullif(left(trim(p_exam_name),120),''),case when p_mode='study' then 'Study practice test' else 'Timed practice exam' end),total,p_snapshot_stage)
 returning id into attempt;
 for entry in
  select q.id,requested.position::integer as position,to_jsonb(q) as question,to_jsonb(s) as solution
  from unnest(p_question_ids) with ordinality requested(id,position)
  join public.questions q on q.id=requested.id and q.published=true
  join public.question_solutions s on s.question_id=q.id
  order by requested.position
 loop
  insert into public.exam_review_items(attempt_id,question_id,position,question_snapshot,solution_snapshot)
  values(attempt,entry.id,entry.position,entry.question,entry.solution);
  visible_questions:=visible_questions||jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
   'id',entry.id,'category',entry.question->'category','type',entry.question->'type',
   'stem',entry.question->'stem','options',entry.question->'options',
   'matrix_rows',entry.question->'matrix_rows','chart',entry.question->'chart',
   'images',entry.question->'images','image_url',entry.question->'image_url',
   'image_urls',entry.question->'image_urls','question_images',entry.question->'question_images',
   'question_image_url',entry.question->'question_image_url','question_image_alt',entry.question->'question_image_alt','diagram_file',entry.question->'diagram_file'
  )));
  copied:=copied+1;
 end loop;
 if copied<>total then raise exception 'One or more questions or solutions are unavailable' using errcode='22023'; end if;
 return jsonb_build_object('attemptId',attempt,'questions',visible_questions);
end;
$$;
revoke all on function public.start_exam_review_attempt(uuid[],text,text,text) from public,anon;
grant execute on function public.start_exam_review_attempt(uuid[],text,text,text) to authenticated;

-- Only application-server administrators may edit these fields. Both updates
-- commit together; this RPC does not change scoring, publication or question text.
create or replace function public.edit_question_education(p_question_id uuid,p_question jsonb,p_solution jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object'
  or exists(select 1 from jsonb_object_keys(p_question) k where k not in ('question_image_url','question_image_alt'))
  or exists(select 1 from jsonb_object_keys(p_solution) k where k not in ('rationale_image_url','rationale_image_alt','nursing_tip')) then
  raise exception 'Unsupported education fields';
 end if;
 perform 1 from public.questions where id=p_question_id for update;
 if not found then raise exception 'Question not found';end if;
 perform 1 from public.question_solutions where question_id=p_question_id for update;
 if not found then raise exception 'Solution not found';end if;
 update public.questions set
  question_image_url=case when p_question?'question_image_url' then p_question->>'question_image_url' else question_image_url end,
  question_image_alt=case when p_question?'question_image_alt' then p_question->>'question_image_alt' else question_image_alt end where id=p_question_id;
 update public.question_solutions set
  rationale_image_url=case when p_solution?'rationale_image_url' then p_solution->>'rationale_image_url' else rationale_image_url end,
  rationale_image_alt=case when p_solution?'rationale_image_alt' then p_solution->>'rationale_image_alt' else rationale_image_alt end,
  nursing_tip=case when p_solution?'nursing_tip' then p_solution->>'nursing_tip' else nursing_tip end where question_id=p_question_id;
end;$$;
revoke all on function public.edit_question_education(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.edit_question_education(uuid,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
