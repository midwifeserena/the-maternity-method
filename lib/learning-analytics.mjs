import {hasSavedResponse} from './exam-review.mjs';
const percentage=(n,d)=>d>0?Math.round(n/d*100):null;
const score=row=>Number.isFinite(row.earned)&&Number.isFinite(row.possible)&&row.possible>0&&row.earned>=0&&row.earned<=row.possible;
const total=(rows,key)=>rows.reduce((n,r)=>n+(Number.isFinite(r[key])?r[key]:0),0);
const rate=rows=>percentage(total(rows,'earned'),total(rows,'possible'));
export function buildLearningAnalytics({attempts=[],responses=[],snapshots=[],bank=[]}){
 const completed=attempts.filter(a=>a.completed_at).sort((a,b)=>String(a.completed_at).localeCompare(String(b.completed_at))||a.id.localeCompare(b.id));
 const owned=new Map(completed.map(a=>[a.id,a])),live=new Map(bank.map(q=>[q.key,q]));
 const frozen=new Map(snapshots.map(q=>[q.attempt_id+':'+q.question_id,q]));
 const seenResponses=new Set();const rows=responses.filter(r=>{
  const key=r.attempt_id+':'+r.question_id;if(!owned.has(r.attempt_id)||seenResponses.has(key)||!score(r))return false;seenResponses.add(key);return true;
 }).map(r=>{
  const snapshot=frozen.get(r.attempt_id+':'+r.question_id);
  const key=snapshot?.source_kind==='ngn_case'?'case:'+snapshot.source_id:snapshot?.case_context?.item_id?'case:'+snapshot.case_context.item_id:r.source_kind==='ngn_case'?null:'question:'+r.question_id;
  const current=key?live.get(key):null;
  return {...r,key,category:snapshot?.category||current?.category||'Unclassified',format:snapshot?.source_kind==='ngn_case'||snapshot?.case_context?'NGN case study':snapshot?.ngn_format||snapshot?.type||current?.type||'Unclassified',answered:hasSavedResponse(r.response)};
 });
 const grouped=new Map(completed.map(a=>[a.id,[]]));for(const row of rows)grouped.get(row.attempt_id).push(row);
 const unique=new Map(),used=new Set();
 for(const a of completed)for(const row of grouped.get(a.id)){
  // An omission is not a first answered exposure and does not inflate Qbank usage.
  if(row.answered&&row.key){if(!unique.has(row.key))unique.set(row.key,row);if(live.has(row.key))used.add(row.key);}
 }
 const first=[...unique.values()],correct=rows.filter(r=>r.answered&&r.earned===r.possible).length,partial=rows.filter(r=>r.answered&&r.earned>0&&r.earned<r.possible).length;
 const incorrect=rows.filter(r=>r.answered&&r.earned===0).length,omitted=rows.filter(r=>!r.answered).length;
 const categories=[...new Set([...bank.map(q=>q.category),...rows.map(q=>q.category)])].filter(Boolean).sort();
 const subjects=categories.map(category=>{const r=rows.filter(q=>q.category===category),f=first.filter(q=>q.category===category),pool=bank.filter(q=>q.category===category);return {category,answered:r.filter(q=>q.answered).length,questions:r.length,correct:r.filter(q=>q.answered&&q.earned===q.possible).length,earned:total(r,'earned'),possible:total(r,'possible'),percent:rate(r),firstPercent:rate(f),firstCount:f.length,used:pool.filter(q=>used.has(q.key)).length,total:pool.length};});
 const formats=[...new Set(rows.map(r=>r.format))].sort().map(format=>{const r=rows.filter(q=>q.format===format);return {format,count:r.length,percent:rate(r),earned:total(r,'earned'),possible:total(r,'possible')};});
 const sessions=completed.map(a=>{const r=grouped.get(a.id);return {id:a.id,name:a.exam_name||(a.mode==='study'?'Study practice test':'Timed practice exam'),mode:a.mode,completedAt:a.completed_at,earned:a.earned,possible:a.possible,percent:score(a)?percentage(a.earned,a.possible):null,questionCount:Number.isInteger(a.question_count)?a.question_count:r.length||null,recordedCount:r.length,durationSeconds:Math.max(0,a.duration_seconds||0)};});
 const validAttempts=completed.filter(score),timed=validAttempts.filter(a=>a.mode==='test'&&((a.question_count??grouped.get(a.id).length)>=20));
 const recent=timed.slice(-5),previous=timed.slice(-10,-5);
 const maternity=['Antepartum','Intrapartum','Postpartum','Newborn'];
 const maternityFirst=first.filter(q=>maternity.includes(q.category));
 const maternityTimed=timed.filter(a=>{const r=grouped.get(a.id);return r.length>=20&&r.length===(a.question_count??r.length)&&r.every(q=>maternity.includes(q.category))});
 const recentMaternity=maternityTimed.slice(-5);
 const tracked=completed.filter(a=>a.study_analytics?.version===1),telemetry=tracked.map(a=>a.study_analytics);
 const timing=telemetry.flatMap(t=>Array.isArray(t.timings)?t.timings:[]).filter(t=>Number.isFinite(t.seconds)&&t.seconds>=0);
 const changes={correctToIncorrect:0,incorrectToCorrect:0,incorrectToIncorrect:0};for(const t of telemetry)for(const key of Object.keys(changes))changes[key]+=Math.max(0,Number(t.changes?.[key])||0);
 const expected=completed.reduce((n,a)=>n+(Number.isInteger(a.question_count)?a.question_count:grouped.get(a.id).length),0);
 return {version:1,questionScore:{percent:percentage(correct,rows.length),correct,partial,incorrect,omitted,total:rows.length},points:{earned:total(validAttempts,'earned'),possible:total(validAttempts,'possible'),percent:rate(validAttempts)},
 usage:{used:used.size,unused:Math.max(0,bank.length-used.size),total:bank.length,percent:percentage(used.size,bank.length)},tests:{created:attempts.length,completed:completed.length,incomplete:attempts.length-completed.length,percent:percentage(completed.length,attempts.length)},
 firstAttempt:{count:first.length,percent:rate(first),earned:total(first,'earned'),possible:total(first,'possible')},
 recentTimed:{count:recent.length,percent:rate(recent),previousPercent:rate(previous)},subjects,formats,sessions,
 time:{totalSeconds:total(completed,'duration_seconds'),averageQuestionSeconds:timing.length?Math.round(total(timing,'seconds')/timing.length):null,measuredQuestions:timing.length,sessionSecondsPerItem:rows.length?Math.round(total(completed,'duration_seconds')/rows.length):null},
 changes:{...changes,trackedExams:tracked.length,untrackedExams:completed.length-tracked.length},
 coverage:{recorded:rows.length,expected,missing:Math.max(0,expected-rows.length),unclassified:rows.filter(r=>r.category==='Unclassified').length,examsWithoutResponses:completed.filter(a=>!grouped.get(a.id).length).length},
 readiness:{uniqueAnswered:maternityFirst.length,timedExams:maternityTimed.length,coveredSubjects:subjects.filter(s=>s.firstCount>=10).map(s=>s.category),firstPercent:rate(maternityFirst),firstEarned:total(maternityFirst,'earned'),firstPossible:total(maternityFirst,'possible'),recentTimedPercent:rate(recentMaternity),recentTimedEarned:total(recentMaternity,'earned'),recentTimedPossible:total(recentMaternity,'possible')}};
}
/** Transparent study benchmarks, not a calibrated NCLEX pass prediction. */
export function readinessProgress(data,target=70){
 const required=['Antepartum','Intrapartum','Postpartum','Newborn'];
 const r=data.readiness;
 const meets=(prefix,rounded)=>typeof r[prefix+'Possible']==='number'?r[prefix+'Possible']>0&&r[prefix+'Earned']/r[prefix+'Possible']*100>=target:rounded!==null&&rounded>=target;
 const display=(prefix,rounded)=>r[prefix+'Possible']>0?(Math.round(r[prefix+'Earned']/r[prefix+'Possible']*1000)/10)+'%':rounded===null?'No data':rounded+'%';
 const checks=[
  {label:'100 unique maternity questions answered',met:r.uniqueAnswered>=100,value:`${r.uniqueAnswered} / 100`},
  {label:'3 timed maternity exams with at least 20 questions',met:r.timedExams>=3,value:`${r.timedExams} / 3`},
  {label:'10 unique answers in each maternity subject',met:required.every(c=>r.coveredSubjects.includes(c)),value:`${required.filter(c=>r.coveredSubjects.includes(c)).length} / 4 subjects`},
  {label:`First-attempt points at or above ${target}%`,met:meets('first',r.firstPercent),value:display('first',r.firstPercent)},
  {label:`Recent timed points at or above ${target}%`,met:meets('recentTimed',r.recentTimedPercent),value:display('recentTimed',r.recentTimedPercent)}
 ];
 const volume=checks.slice(0,3).every(c=>c.met),met=checks.filter(c=>c.met).length;
 return {label:!volume?'Building your baseline':met===checks.length?'Meeting your practice target':'Focus your next review',checks,met,total:checks.length};
}
