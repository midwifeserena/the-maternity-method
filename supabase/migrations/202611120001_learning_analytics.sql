-- PROPOSED: review in staging before production. Optional future timing/answer-change tracking.
-- Dashboard and performance statistics work without this migration.
begin;
do $$begin
 if to_regprocedure('public.complete_exam_review_attempt(uuid,uuid,jsonb,integer)') is null then
  raise exception 'Install the existing exam-review completion function before analytics tracking.';
 end if;
end$$;
alter table public.exam_attempts add column if not exists study_analytics jsonb;
-- Retain existing owner RLS and service-only writes on exam_attempts.
-- One locked transaction saves existing grades plus ancillary telemetry. Retry cannot replace either.
create or replace function public.complete_exam_with_analytics(
 p_attempt_id uuid,p_user_id uuid,p_responses jsonb,p_duration_seconds integer,p_analytics jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.exam_attempts%rowtype; result jsonb;
begin
 select * into existing from public.exam_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then raise exception 'Exam not found' using errcode='42501'; end if;
 if existing.completed_at is not null then
  return jsonb_build_object('attemptId',existing.id,'earned',existing.earned,'possible',existing.possible);
 end if;
 if p_analytics is not null and (jsonb_typeof(p_analytics) is distinct from 'object' or p_analytics->>'version' is distinct from '1' or octet_length(p_analytics::text)>65536) then
  raise exception 'Invalid analytics metadata' using errcode='22023';
 end if;
 result:=public.complete_exam_review_attempt(p_attempt_id,p_user_id,p_responses,p_duration_seconds);
 update public.exam_attempts set study_analytics=p_analytics where id=p_attempt_id and user_id=p_user_id;
 return result;
end;
$$;
revoke all on function public.complete_exam_with_analytics(uuid,uuid,jsonb,integer,jsonb) from public,anon,authenticated;
grant execute on function public.complete_exam_with_analytics(uuid,uuid,jsonb,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
