import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLearningAnalytics,readinessProgress} from '../lib/learning-analytics.mjs';
import {summarizeExamTelemetry} from '../lib/exam-analytics.mjs';
const attempts=[{id:'a',mode:'test',earned:3,possible:5,completed_at:'2026-01-01',duration_seconds:120,question_count:4},{id:'b',mode:'study',earned:1,possible:1,completed_at:'2026-01-02',duration_seconds:60,question_count:1},{id:'c',mode:'test',completed_at:null}];
const responses=[{attempt_id:'a',question_id:'q1',response:'a',earned:1,possible:1},{attempt_id:'a',question_id:'q2',response:['a'],earned:1,possible:2},{attempt_id:'a',question_id:'v1',response:'a',earned:1,possible:1,source_kind:'ngn_case'},{attempt_id:'a',question_id:'q4',response:null,earned:0,possible:1},{attempt_id:'b',question_id:'q1',response:'a',earned:1,possible:1},{attempt_id:'c',question_id:'q4',response:'a',earned:1,possible:1},{attempt_id:'not-owned',question_id:'q4',response:'a',earned:1,possible:1}];
const snapshots=[{attempt_id:'a',question_id:'v1',category:'Intrapartum',case_context:{item_id:'i1'}}];
const bank=[{key:'question:q1',category:'Antepartum',type:'single'},{key:'question:q2',category:'Antepartum',type:'sata'},{key:'case:i1',category:'Intrapartum',type:'single'},{key:'question:q4',category:'Postpartum',type:'single'}];
const build=(extra={})=>buildLearningAnalytics({attempts,responses,snapshots,bank,...extra});
test('full-credit question percentage differs from weighted NGN points; usage deduplicates and excludes omissions',()=>{
 const d=build();assert.equal(d.questionScore.percent,60);assert.equal(d.points.percent,67);assert.deepEqual(d.questionScore,{percent:60,correct:3,partial:1,incorrect:0,omitted:1,total:5});assert.equal(d.usage.used,3);assert.equal(d.usage.percent,75);assert.equal(d.tests.percent,67);assert.equal(d.firstAttempt.count,3);assert.equal(d.firstAttempt.percent,75);assert.equal(d.subjects.find(s=>s.category==='Intrapartum').questions,1);
});
test('repeat case virtual IDs map to source item, preserving first-answer baseline',()=>{
 const d=build({responses:[...responses,{attempt_id:'b',question_id:'v2',response:'b',earned:0,possible:1,source_kind:'ngn_case'}],snapshots:[...snapshots,{attempt_id:'b',question_id:'v2',category:'Intrapartum',case_context:{item_id:'i1'}}]});assert.equal(d.usage.used,3);assert.equal(d.firstAttempt.count,3);assert.equal(d.subjects.find(s=>s.category==='Intrapartum').firstPercent,100);
});
test('empty and missing history stays unavailable, no fabricated zero score, percentile or preparedness',()=>{
 const empty=build({attempts:[],responses:[],snapshots:[],bank:[]});assert.equal(empty.questionScore.percent,null);assert.equal(empty.points.percent,null);assert.equal(empty.tests.percent,null);assert.equal(empty.usage.percent,null);assert.equal(readinessProgress(empty).label,'Building your baseline');
 const old=build({responses:[]});assert.equal(old.points.percent,67);assert.equal(old.coverage.missing,5);assert.equal(old.coverage.examsWithoutResponses,2);assert.equal(old.time.averageQuestionSeconds,null);assert(!('percentile' in old));
});
test('deduplicates records, excludes invalid scores and preserves archived subject metadata',()=>{
 const d=build({responses:[...responses,responses[0],{attempt_id:'a',question_id:'bad',response:'a',earned:3,possible:1}],snapshots:[...snapshots,{attempt_id:'a',question_id:'q1',category:'Newborn',type:'single'}]});assert.equal(d.questionScore.total,5);assert.equal(d.subjects.find(s=>s.category==='Newborn').questions,1);assert.equal(d.subjects.find(s=>s.category==='Antepartum').questions,2);
});
test('first attempt chooses earliest answered exposure, not omission; removed bank items do not inflate current usage',()=>{
 const d=build({responses:[{...responses[0],response:null,earned:0},...responses.slice(1)],bank:bank.filter(q=>q.key!=='case:i1')});assert.equal(d.firstAttempt.count,3);assert.equal(d.firstAttempt.percent,75);assert.equal(d.usage.used,2);assert.equal(d.usage.total,3);
});
test('readiness benchmarks require sample size, subject breadth and timed evidence, not just a repeated high score',()=>{
 const d=build();d.readiness={uniqueAnswered:100,timedExams:3,coveredSubjects:['Antepartum','Intrapartum','Postpartum','Newborn'],firstPercent:75,recentTimedPercent:72};assert.equal(readinessProgress(d,70).label,'Meeting your practice target');assert.equal(readinessProgress(d,80).label,'Focus your next review');d.readiness.uniqueAnswered=99;assert.equal(readinessProgress(d).label,'Building your baseline');
});
test('future timing and changes only include tracked exams; legacy session averages clearly remain separate',()=>{
 const d=build({attempts:attempts.map(a=>a.id==='a'?{...a,study_analytics:{version:1,changes:{correctToIncorrect:1,incorrectToCorrect:2,incorrectToIncorrect:3},timings:[{question_id:'q1',seconds:10},{question_id:'q2',seconds:30}]}}:a)});assert.equal(d.time.averageQuestionSeconds,20);assert.equal(d.time.measuredQuestions,2);assert.equal(d.time.sessionSecondsPerItem,36);assert.equal(d.changes.trackedExams,1);assert.equal(d.changes.untrackedExams,1);
});
test('telemetry is ancillary, bounded, scored server-side and skips NGN multi-answer changes',()=>{
 const snap=(id,key='a',extra={})=>({question_id:id,question_snapshot:{id,type:'single',options:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}],...extra},solution_snapshot:{answer_key:key,rationale:'Reason'}});
 const snapshots=[snap('q1'),snap('q2'),snap('q3'),snap('q4','a',{type:'sata'}),snap('q5')],before=structuredClone(snapshots);
 const d=summarizeExamTelemetry({version:1,firstAnswers:{q1:'a',q2:'b',q3:'b',q4:'a',q5:'x'},milliseconds:{q1:1500,q2:999999,q3:NaN,q4:-1,q5:'100'}},snapshots,{q1:'b',q2:'a',q3:'c',q4:['b'],q5:'b'},10);
 assert.deepEqual(d.changes,{correctToIncorrect:1,incorrectToCorrect:1,incorrectToIncorrect:1});assert.equal(d.timings.reduce((n,r)=>n+r.seconds,0),10);assert.equal(d.timings.length,2);assert.deepEqual(snapshots,before);assert.equal(summarizeExamTelemetry(null,snapshots,{},1),null);
});

test('readiness uses unrounded credit, so 69.6% does not meet a 70% goal',()=>{
 const d=build();d.readiness={uniqueAnswered:100,timedExams:3,coveredSubjects:['Antepartum','Intrapartum','Postpartum','Newborn'],firstPercent:70,firstEarned:87,firstPossible:125,recentTimedPercent:80,recentTimedEarned:80,recentTimedPossible:100};const r=readinessProgress(d,70);assert.equal(r.label,'Focus your next review');assert.equal(r.checks[3].value,'69.6%');assert.equal(r.checks[3].met,false);
});

test('non-maternity items and unrecorded timed exams cannot inflate maternity readiness',()=>{
 const attempts=[{id:'m',mode:'test',earned:20,possible:20,question_count:20,completed_at:'2026-01-01'},{id:'p',mode:'test',earned:20,possible:20,question_count:20,completed_at:'2026-01-02'},{id:'missing',mode:'test',earned:20,possible:20,question_count:20,completed_at:'2026-01-03'}];
 const bank=Array.from({length:40},(_,i)=>({key:'question:q'+i,category:i<20?'Antepartum':'Pediatrics',type:'single'}));const responses=bank.map((q,i)=>({attempt_id:i<20?'m':'p',question_id:'q'+i,response:'a',earned:1,possible:1}));const d=buildLearningAnalytics({attempts,responses,snapshots:[],bank});assert.equal(d.firstAttempt.count,40);assert.equal(d.readiness.uniqueAnswered,20);assert.equal(d.readiness.timedExams,1);
});
