-- PROPOSED: apply after exam reviews and question education migrations.
-- Existing type enum and existing question/answer rows are retained.
begin;
alter table public.questions add column if not exists matrix_mode text not null default 'single' check(matrix_mode in ('single','multiple'));
alter table public.question_solutions add column if not exists row_explanations jsonb not null default '{}'::jsonb check(jsonb_typeof(row_explanations)='object');

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
   'matrix_mode',entry.question->'matrix_mode','matrix_rows',entry.question->'matrix_rows','chart',entry.question->'chart',
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

-- Existing education-only editor is unchanged. Matrix edits save as drafts;
-- publication is an explicit, separately validated administrator action.
create or replace function public.edit_matrix_question(p_question_id uuid,p_question jsonb,p_solution jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object'
  or exists(select 1 from jsonb_object_keys(p_question) k where k not in ('stem','options','matrix_rows','matrix_mode','published'))
  or exists(select 1 from jsonb_object_keys(p_solution) k where k not in ('answer_key','rationale','row_explanations')) then raise exception 'Unsupported matrix fields';end if;
 perform 1 from public.questions where id=p_question_id and type='matrix' for update;
 if not found then raise exception 'Matrix question not found';end if;
 perform 1 from public.question_solutions where question_id=p_question_id for update;
 if not found then raise exception 'Solution not found';end if;
 update public.questions set
  stem=case when p_question?'stem' then p_question->>'stem' else stem end,
  options=case when p_question?'options' then p_question->'options' else options end,
  matrix_rows=case when p_question?'matrix_rows' then p_question->'matrix_rows' else matrix_rows end,
  matrix_mode=case when p_question?'matrix_mode' then p_question->>'matrix_mode' else matrix_mode end,
  published=case when p_question?'published' then (p_question->>'published')::boolean else published end where id=p_question_id;
 update public.question_solutions set
  answer_key=case when p_solution?'answer_key' then p_solution->'answer_key' else answer_key end,
  rationale=case when p_solution?'rationale' then p_solution->>'rationale' else rationale end,
  row_explanations=case when p_solution?'row_explanations' then p_solution->'row_explanations' else row_explanations end where question_id=p_question_id;
end;$$;
revoke all on function public.edit_matrix_question(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.edit_matrix_question(uuid,jsonb,jsonb) to service_role;

create or replace function public.create_matrix_question(p_category text,p_question jsonb,p_solution jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if jsonb_typeof(p_question) is distinct from 'object' or jsonb_typeof(p_solution) is distinct from 'object' then raise exception 'Invalid matrix';end if;
 insert into public.questions(category,type,stem,options,matrix_rows,matrix_mode,published)
 values(p_category::public.ob_category,'matrix',p_question->>'stem',p_question->'options',p_question->'matrix_rows',p_question->>'matrix_mode',false) returning id into new_id;
 insert into public.question_solutions(question_id,answer_key,rationale,row_explanations)
 values(new_id,p_solution->'answer_key',p_solution->>'rationale',coalesce(p_solution->'row_explanations','{}'::jsonb));
 return new_id;
end;$$;
revoke all on function public.create_matrix_question(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_matrix_question(text,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
