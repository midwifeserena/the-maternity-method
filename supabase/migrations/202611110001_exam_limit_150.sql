-- PROPOSED: review and test in staging before production.
-- Increase exam capacity without modifying existing attempts, responses, or scores.
begin;
do $$begin
 if to_regprocedure('public.start_mixed_exam_attempt(uuid,text,jsonb,text)') is null then raise exception 'Apply the combined-exam setup (202611100001) before the 150-question upgrade.'; end if;
end$$;
alter table public.exam_review_items drop constraint if exists exam_review_items_position_check;
alter table public.exam_review_items add constraint exam_review_items_position_check check(position between 1 and 150);
create or replace function public.start_exam_review_attempt(
 p_question_ids uuid[],p_mode text,p_exam_name text default null,p_snapshot_stage text default 'start'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 owner_id uuid:=auth.uid(); attempt uuid; total integer; copied integer:=0;
 entry record; visible_questions jsonb:='[]'::jsonb;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 total:=coalesce(cardinality(p_question_ids),0);
 if total<1 or total>150 or p_mode is null or p_snapshot_stage is null or p_mode not in ('study','test') or p_snapshot_stage not in ('start','submission')
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
   'bank_section',entry.question->'bank_section','ngn_format',entry.question->'ngn_format','ngn_config',entry.question->'ngn_config','stem',entry.question->'stem','clinical_scenario',entry.question->'clinical_scenario','content_format',entry.question->'content_format','options',entry.question->'options',
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
create or replace function public.start_mixed_exam_attempt(p_user_id uuid,p_mode text,p_items jsonb,p_exam_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare total integer; attempt uuid;
begin
 if p_user_id is null or p_mode is null or p_mode not in ('study','test') or p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Invalid exam request' using errcode='22023'; end if;
 total:=jsonb_array_length(p_items);
 if total<1 or total>150 or (select count(distinct r.question_id) from jsonb_to_recordset(p_items) r(question_id uuid))<>total then raise exception 'Invalid exam size or duplicate items' using errcode='22023'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) r(question_id uuid,source_kind text,source_id uuid,case_id uuid,question_snapshot jsonb,solution_snapshot jsonb)
  where r.question_id is null or r.source_id is null or r.source_kind is null or r.source_kind not in ('question','ngn_case')
   or jsonb_typeof(r.question_snapshot) is distinct from 'object' or jsonb_typeof(r.solution_snapshot) is distinct from 'object'
   or r.question_snapshot->>'id' is distinct from r.question_id::text
   or not(r.solution_snapshot?'answer_key') or nullif(trim(r.solution_snapshot->>'rationale'),'') is null
   or (r.source_kind='question' and (r.case_id is not null or r.question_id<>r.source_id or not exists(select 1 from public.questions q join public.question_solutions s on s.question_id=q.id where q.id=r.source_id and q.published)))
   or (r.source_kind='ngn_case' and (r.case_id is null or r.question_snapshot->'case_context'->>'case_id' is distinct from r.case_id::text or r.question_snapshot->'case_context'->>'item_id' is distinct from r.source_id::text
    or not exists(select 1 from public.ngn_items i join public.ngn_cases c on c.id=i.case_id join public.ngn_answers a on a.item_id=i.id and a.case_id=c.id where i.id=r.source_id and c.id=r.case_id and i.published and c.published)))) then
  raise exception 'Selected question or complete case unavailable' using errcode='22023';
 end if;
 if not exists(select 1 from jsonb_to_recordset(p_items) r(source_kind text) where source_kind='ngn_case') then raise exception 'Select a case' using errcode='22023'; end if;
 if exists(with grouped as(
  select (e.value->>'case_id')::uuid case_id,count(*) amount,min(e.ordinality) first_pos,max(e.ordinality) last_pos
  from jsonb_array_elements(p_items) with ordinality e where e.value->>'source_kind'='ngn_case' group by (e.value->>'case_id')::uuid
 ) select 1 from grouped g where g.amount<>6 or g.last_pos-g.first_pos<>5
  or (select count(*) from public.ngn_items i where i.case_id=g.case_id)<>6
  or exists(select 1 from public.ngn_items i where i.case_id=g.case_id and not i.published)
  or exists(select 1 from jsonb_array_elements(p_items) with ordinality e join public.ngn_items i on i.id=(e.value->>'source_id')::uuid
    where e.value->>'source_kind'='ngn_case' and i.case_id=g.case_id and i.item_number<>e.ordinality-g.first_pos+1)) then
  raise exception 'Each selected case must contain all six items together in order' using errcode='22023';
 end if;
 insert into public.exam_attempts(user_id,mode,exam_name,question_count,snapshot_stage)
 values(p_user_id,p_mode,coalesce(nullif(left(trim(p_exam_name),120),''),'Practice exam with NGN cases'),total,'start') returning id into attempt;
 insert into public.exam_review_items(attempt_id,question_id,position,question_snapshot,solution_snapshot,source_kind,source_id,case_id)
 select attempt,(e.value->>'question_id')::uuid,e.ordinality::integer,e.value->'question_snapshot',e.value->'solution_snapshot',e.value->>'source_kind',(e.value->>'source_id')::uuid,(e.value->>'case_id')::uuid
 from jsonb_array_elements(p_items) with ordinality e;
 return jsonb_build_object('attemptId',attempt,'questions',(select jsonb_agg(i.question_snapshot order by i.position) from public.exam_review_items i where i.attempt_id=attempt));
end;
$$;
revoke all on function public.start_mixed_exam_attempt(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.start_mixed_exam_attempt(uuid,text,jsonb,text) to service_role;


notify pgrst, 'reload schema';
commit;
