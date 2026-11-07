import * as caseExam from '../lib/case-exam.mjs';
import * as legacyCaseScoring from '../lib/ngn-case-scoring.mjs';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as standalone from '../lib/ngn-standalone.mjs';
import * as review from '../lib/exam-review.mjs';
import * as scoring from '../lib/scoring.mjs';
import * as education from '../lib/question-education.mjs';
import * as matrix from '../lib/matrix.mjs';
import * as questionAuthoring from '../lib/question-authoring.mjs';
import * as matrixAuthoring from '../lib/matrix-authoring.mjs';
const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',id='30000000-0000-0000-0000-000000000001',qid='20000000-0000-0000-0000-000000000001';
const original={id:qid,type:'single',category:'Antepartum',stem:'Original archived question',options:[{id:'a',label:'Original A'},{id:'b',label:'B'}],matrix_rows:[]};
const attempt={id,user_id:owner,mode:'study',earned:0,possible:0,question_count:1,snapshot_stage:'start',completed_at:null};
function harness({user=owner,attempts=[{...attempt}],responses=[],snapshots=[{attempt_id:id,question_id:qid,position:1,question_snapshot:original,solution_snapshot:{answer_key:'a',rationale:'Original rationale'}}],missing=false,historyRows=null,liveQuestions=[{...original,stem:'CURRENT EDIT',published:false}],liveSolutions=[{question_id:qid,answer_key:'b',rationale:'Current bank rationale'}],failTable=null,missingSnapshots=false,administrator=false,libraryError=null,legacyColumns=null,adminUnavailable=false,ngnCases=[],ngnItems=[],ngnAnswers=[],transferError=null,mixedReady=true,caseResponses=[]}={}){
 const calls=[],writes=[];
 function client(privileged=false){return {storage:{from(){return {createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:'https://example.test/signed/'+path})),error:null}),createSignedUrl:async path=>({data:{signedUrl:'https://example.test/signed/'+path},error:null}),upload:async(path,bytes,options)=>{writes.push({upload:path,size:bytes.length,options});return {data:{path},error:null}}}}},auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},rpc:async(name,args)=>{
  calls.push({rpc:name,privileged,args});
  if(name==='mixed_exam_session_version')return mixedReady?{data:1,error:null}:{data:null,error:{code:'PGRST202'}};
  if(name==='start_mixed_exam_attempt'){assert(privileged);writes.push(args);snapshots.splice(0,snapshots.length,...args.p_items.map((item,n)=>({...item,attempt_id:id,position:n+1})));Object.assign(attempts[0],{user_id:args.p_user_id,mode:args.p_mode,question_count:args.p_items.length,completed_at:null});return {data:{attemptId:id,questions:args.p_items.map(item=>item.question_snapshot)},error:null};}
  if(name==='transfer_standalone_ngn'){assert(privileged);if(transferError)return {data:null,error:transferError};writes.push(args);return {data:{ids:args.p_questions.map(d=>d.question.id)},error:null}}
  if(name==='manage_question_studio'){assert(privileged);writes.push(args);return {data:{id:args.p_id,revision:args.p_expected_revision+1,published:args.p_action==='publish',archived_at:args.p_action==='archive'?'2026-11-04':null},error:null}}
  if(name==='admin_question_library'&&libraryError)return {data:null,error:libraryError};
  if(name==='admin_question_library')return {data:{questions:[],total:0,counts:{all:0,draft:0,published:0,archived:0},offset:args.p_offset,limit:25},error:null};
  if(name==='create_matrix_question'){assert(privileged);writes.push(args);return {data:qid,error:null}}
  if(name==='edit_matrix_question'){assert(privileged);writes.push(args);return {data:null,error:null}}
  if(name==='edit_question_education'){assert(privileged);writes.push(args);return {data:null,error:null}}
  if(name==='start_exam_review_attempt')return missing?{data:null,error:{code:'PGRST202'}}:{data:{attemptId:id,questions:[original]},error:null};
  assert(privileged);assert.equal(name,'complete_exam_review_attempt');writes.push(args);const row=attempts.find(a=>a.id===args.p_attempt_id);row.completed_at='2026-11-04';row.earned=args.p_responses.reduce((n,r)=>n+r.earned,0);row.possible=args.p_responses.reduce((n,r)=>n+r.possible,0);return {data:{attemptId:id,earned:row.earned,possible:row.possible},error:null};
 },from(table){const call={table,privileged};calls.push(call);let filters=[],start=0,end=Infinity,single=false,columns='*',selectOptions={};
  const chain={select(value,options={}){columns=value;selectOptions=options;call.columns=value;return chain},eq(key,value){filters.push(r=>r[key]===value);return chain},in(key,value){filters.push(r=>value.includes(r[key]));return chain},not(key,_op,value){filters.push(r=>r[key]!==value);return chain},order(){return chain},limit(){return chain},ilike(){return chain},range(a,b){start=a;end=b;return chain},maybeSingle(){single=true;return chain},single(){single=true;return chain},
   then(resolve,reject){if(table==='questions'&&legacyColumns&&columns!=='*'&&columns.split(',').some(column=>!legacyColumns.includes(column)))return Promise.resolve({data:null,error:{code:'42703'}}).then(resolve,reject);if(table===failTable)return Promise.resolve({data:null,error:{code:'XX000'}}).then(resolve,reject);if(table==='exam_review_items'&&missingSnapshots)return Promise.resolve({data:null,error:{code:'PGRST205'}}).then(resolve,reject);let rows=table==='exam_attempts'?historyRows??attempts:table==='exam_responses'?responses:table==='exam_case_responses'?caseResponses:table==='exam_review_items'?snapshots:table==='questions'?liveQuestions:table==='question_solutions'?liveSolutions:table==='ngn_cases'?ngnCases:table==='ngn_items'?ngnItems:table==='ngn_answers'?ngnAnswers:[];rows=rows.filter(row=>filters.every(match=>match(row)));const count=rows.length;rows=rows.slice(start,end+1);if(columns!=='*')rows=rows.map(row=>Object.fromEntries(columns.split(',').map(column=>[column,row[column]])));return Promise.resolve({data:selectOptions.head?null:single?rows[0]??null:rows,error:null,count:selectOptions.count?count:null}).then(resolve,reject)}
  };return chain;
 }}}
 const db=client(),service=client(true),cache=new Map();
 function load(path){if(cache.has(path))return cache.get(path);const js=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const compiled={exports:{}};cache.set(path,compiled.exports);new Function('require','exports','module',js)(name=>{
   if(name==='node:crypto')return {randomUUID};
   if(name==='@/lib/case-exam.mjs')return caseExam;
   if(name==='@/lib/ngn-case-scoring.mjs')return legacyCaseScoring;
   if(name==='next/server')return {NextResponse:{json:(data,options)=>Response.json(data,options)}};
   if(name==='@/lib/supabase/server')return {createClient:async()=>db};
   if(name==='@/lib/supabase/admin')return {admin:()=>{if(adminUnavailable)throw Error('Missing server credentials');return service}};
   if(name==='@/lib/exam-review.mjs')return review;
   if(name==='@/lib/ngn-standalone.mjs'||name==='./ngn-standalone.mjs')return standalone;
   if(name==='@/lib/scoring.mjs')return scoring;
   if(name==='@/lib/ngn-admin-auth')return {requireNgnAdmin:async()=>administrator&&user?{id:user}:null};
   if(name==='@/lib/matrix.mjs')return matrix;
   if(name==='@/lib/question-library-server')return load('lib/question-library-server.ts');
   if(name==='@/lib/question-authoring.mjs')return questionAuthoring;
   if(name==='@/lib/matrix-authoring.mjs')return matrixAuthoring;
   if(name==='@/lib/questions')return {categories:['Antepartum','Intrapartum','Postpartum','Newborn']};
   if(name==='@/lib/question-education.mjs')return education;
   if(name==='@/lib/question-media-server')return load('lib/question-media-server.ts');
   if(name==='@/lib/exam-review-server')return load('lib/exam-review-server.ts');
   throw Error('Unexpected import '+name);
  },compiled.exports,compiled);return compiled.exports}
 return {load,calls,writes,attempts,db};
}
const post=(path,value)=>new Request('https://example.test/'+path,{method:'POST',body:JSON.stringify(value)});
const payload={attemptId:id,questionIds:[qid],mode:'study',answers:{[qid]:'a'},durationSeconds:120};
const reviewRequest=h=>h.load('app/api/exams/[attemptId]/review/route.ts').GET(new Request('https://example.test'),{params:Promise.resolve({attemptId:id})});
test('all review/start/history/submit endpoints require authentication before database access',async()=>{
 const h=harness({user:null});assert.equal((await reviewRequest(h)).status,401);
 for(const route of ['start','submit'])assert.equal((await h.load(`app/api/exams/${route}/route.ts`).POST(post('',payload))).status,401);
 assert.equal((await h.load('app/api/exams/history/route.ts').GET({nextUrl:new URL('https://example.test')})).status,401);assert.equal(h.calls.length,0);
});
test('other students and incomplete sessions cannot open a review, and ownership is verified before snapshot access',async()=>{
 for(const h of [harness({user:other,attempts:[{...attempt,completed_at:'2026-11-04'}]}),harness()]){assert.equal((await reviewRequest(h)).status,404);assert(!h.calls.some(c=>c.table==='exam_review_items'));assert.equal(h.writes.length,0)}
 const h=harness({user:other});assert.equal((await h.load('app/api/exams/submit/route.ts').POST(post('',payload))).status,404);assert(!h.calls.some(c=>c.privileged));
});
test('completed review returns archived content and exact saved points without accessing live bank or writing',async()=>{
 const h=harness({attempts:[{...attempt,completed_at:'2026-11-04',earned:1,possible:1}],responses:[{id:'r',attempt_id:id,user_id:owner,question_id:qid,response:'a',earned:1,possible:1}]});
 const response=await reviewRequest(h),data=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(data.items[0].question.stem,original.stem);assert.equal(data.items[0].rationale,'Original rationale');assert.equal(data.attempt.earned,1);assert(!h.calls.some(c=>['questions','question_solutions'].includes(c.table)));assert.equal(h.writes.length,0);
});
test('submission scores frozen keys, commits through trusted RPC and repeated submit preserves stored score',async()=>{
 const h=harness();const api=h.load('app/api/exams/submit/route.ts');const response=await api.POST(post('',payload));assert.equal(response.status,200);assert.equal((await response.json()).earned,1);assert.equal(h.writes[0].p_responses[0].response,'a');assert.equal(h.writes[0].p_responses[0].earned,1);assert(!h.calls.some(c=>c.table==='questions'));
 const retry=await api.POST(post('',{...payload,answers:{[qid]:'b'}}));assert.equal((await retry.json()).earned,1);assert.equal(h.writes.length,1);
});
test('study feedback uses frozen version and rejects timed or other-owned sessions',async()=>{
 const h=harness();const result=await h.load('app/api/study/check/route.ts').POST(post('',{questionId:qid,attemptId:id,answer:'a'}));assert.equal((await result.json()).rationale,'Original rationale');assert(!h.calls.some(c=>c.table==='questions'));
 const timed=harness({attempts:[{...attempt,mode:'test'}]});assert.equal((await timed.load('app/api/study/check/route.ts').POST(post('',{questionId:qid,attemptId:id,answer:'a'}))).status,403);assert(!timed.calls.some(c=>c.privileged));
});
test('start returns no solution information; compatibility is limited to genuinely missing migration',async()=>{
 const h=harness();const response=await h.load('app/api/exams/start/route.ts').POST(post('',{questionIds:[qid],mode:'study'}));const data=await response.json();assert.equal(data.attemptId,id);assert(!JSON.stringify(data).includes('rationale'));assert(!JSON.stringify(data).includes('answer_key'));
 const old=harness({missing:true,liveQuestions:[{...original,published:true}]});const fallback=await old.load('app/api/exams/start/route.ts').POST(post('',{questionIds:[qid],mode:'study'}));assert.equal((await fallback.json()).reviewSnapshotAvailable,false);
});
test('history is scoped to owner, excludes incomplete attempts, and paginates response reads beyond 500',async()=>{
 const rows=[{...attempt,completed_at:'2026-11-04',question_count:501,earned:501,possible:501},{...attempt,id:'other',user_id:other,completed_at:'2026-11-04'}, {...attempt,id:'pending'}];
 const responses=Array.from({length:501},(_,i)=>({id:String(i),attempt_id:id,user_id:owner,question_id:String(i),response:'a',earned:1,possible:1}));const h=harness({historyRows:rows,responses});
 const result=await h.load('app/api/exams/history/route.ts').GET({nextUrl:new URL('https://example.test?offset=0')}),data=await result.json();assert.equal(data.attempts.length,1);assert.equal(data.attempts[0].correctCount,501);assert.equal(h.calls.filter(c=>c.table==='exam_responses').length,2);assert.equal(h.writes.length,0);
});

test('legacy study and timed exams retrieve linked current content only after ownership and completion checks',async()=>{
 for(const mode of ['study','test']){
  const saved={...attempt,mode,snapshot_stage:null,question_count:null,completed_at:'2026-11-04',earned:1,possible:1};
  const rows=[{id:'r',attempt_id:id,user_id:owner,question_id:qid,response:'a',earned:1,possible:1}];
  const h=harness({attempts:[saved],responses:rows,snapshots:[],liveQuestions:[{...original,stem:'CURRENT EDIT',published:false,answer_key:'should never leak as a question field'},{...original,id:'unrelated'}],liveSolutions:[{question_id:qid,answer_key:'b',rationale:'Current bank rationale'},{question_id:'unrelated',answer_key:'secret',rationale:'Unrelated private rationale'}]});
  const response=await reviewRequest(h),data=await response.json();assert.equal(response.status,200);assert.equal(data.items.length,1);assert.equal(data.items[0].question.stem,'CURRENT EDIT');assert.equal(data.items[0].rationale,'Current bank rationale');assert.equal(data.items[0].correctAnswer,'b');assert.equal(data.items[0].contentSource,'current');assert.equal(data.items[0].response,'a');assert.equal(data.items[0].status,'correct');assert.equal(data.attempt.earned,1);assert(!JSON.stringify(data).includes('Unrelated private'));assert(!JSON.stringify(data).includes('should never leak'));assert.match(data.warnings.join(' '),/current question-bank content/);assert.equal(h.writes.length,0);assert.equal(saved.earned,1);
  assert(h.calls.findIndex(c=>c.table==='exam_attempts')<h.calls.findIndex(c=>c.privileged));
 }
});
test('legacy fallback works before snapshot migration and never invents missing answers or rationales',async()=>{
 const h=harness({attempts:[{...attempt,completed_at:'2026-11-04'}],responses:[{id:'r',attempt_id:id,user_id:owner,question_id:qid,response:'b',earned:0,possible:1}],missingSnapshots:true,liveSolutions:[]});
 const response=await reviewRequest(h),data=await response.json();assert.equal(response.status,200);assert.equal(data.items[0].contentSource,'current');assert.equal(data.items[0].correctAnswer,null);assert.equal(data.items[0].rationale,null);assert.equal(h.writes.length,0);
});
test('no saved response records means no current-bank solution reads; unavailable bank causes retry rather than misleading empty review',async()=>{
 const empty=harness({attempts:[{...attempt,completed_at:'2026-11-04'}],snapshots:[]});assert.equal((await reviewRequest(empty)).status,200);assert(!empty.calls.some(c=>c.privileged));
 const failing=harness({attempts:[{...attempt,completed_at:'2026-11-04'}],snapshots:[],responses:[{id:'r',attempt_id:id,user_id:owner,question_id:qid,response:'a',earned:1,possible:1}],failTable:'question_solutions'});assert.equal((await reviewRequest(failing)).status,500);assert.equal(failing.writes.length,0);
});

test('question media and nursing tips are private until existing study/review authorization permits them',async()=>{
 const privateSolution={answer_key:'a',rationale:'Original rationale',nursing_tip:'Private clinical reminder',rationale_image_url:'storage://question-media/q/rationale.png',rationale_image_alt:'Protected explanation diagram'};
 const h=harness({snapshots:[{attempt_id:id,question_id:qid,position:1,question_snapshot:original,solution_snapshot:privateSolution}]});
 const opened=await h.load('app/api/exams/start/route.ts').POST(post('',{questionIds:[qid],mode:'study'})),publicData=await opened.json();assert(!JSON.stringify(publicData).includes('Private clinical'));assert(!JSON.stringify(publicData).includes('rationale.png'));
 const checked=await h.load('app/api/study/check/route.ts').POST(post('',{questionId:qid,attemptId:id,answer:'a'})),feedback=await checked.json();assert.equal(feedback.nursing_tip,'Private clinical reminder');assert.equal(feedback.rationale_images[0].alt,'Protected explanation diagram');assert.match(feedback.rationale_images[0].url,/signed/);assert.equal(feedback.earned,1);
 const timed=harness({attempts:[{...attempt,mode:'test'}]});const denied=await timed.load('app/api/study/check/route.ts').POST(post('',{questionId:qid,attemptId:id,answer:'a'}));assert.equal(denied.status,403);assert(!JSON.stringify(await denied.json()).includes('nursing_tip'));
});
test('education administration and uploads reject students before privileged reads or writes',async()=>{
 const h=harness();const route=h.load('app/api/admin/questions/route.ts');assert.equal((await route.GET({nextUrl:new URL('https://example.test?id='+qid)})).status,403);assert.equal((await route.PATCH(post('',{id:qid,fields:{nursing_tip:'text'}}))).status,403);assert.equal((await h.load('app/api/admin/questions/media/route.ts').POST(post('',{}))).status,403);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('admin education edits are field-restricted, require alt text and call one atomic RPC without score changes',async()=>{
 const h=harness({administrator:true}),api=h.load('app/api/admin/questions/route.ts');
 assert.equal((await api.PATCH(post('',{id:qid,fields:{answer_key:'b'}}))).status,400);
 assert.equal((await api.PATCH(post('',{id:qid,fields:{question_image_url:'https://example.test/diagram.png'}}))).status,400);
 assert.equal((await api.PATCH(post('',{id:qid,fields:{question_image_url:'https://example.test/diagram.png',question_image_alt:'Fetal monitoring strip',nursing_tip:'Check the maternal assessment.'}}))).status,200);
 assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].p_question,{question_image_url:'https://example.test/diagram.png',question_image_alt:'Fetal monitoring strip'});assert.equal(h.writes[0].p_solution.nursing_tip,'Check the maternal assessment.');assert.equal(h.attempts[0].earned,0);
});
test('uploads use immutable private object references and reject executable images',async()=>{
 const h=harness({administrator:true}),api=h.load('app/api/admin/questions/media/route.ts');
 const upload=file=>{const form=new FormData();form.set('questionId',qid);form.set('kind','rationale');form.set('file',file);return new Request('https://example.test',{method:'POST',body:form})};
 assert.equal((await api.POST(upload(new File(['<svg onload="alert(1)"></svg>'],'evil.svg',{type:'image/svg+xml'})))).status,400);
 const png=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0])],'example.png',{type:'image/png'});const response=await api.POST(upload(png)),data=await response.json();assert.equal(response.status,200);assert.match(data.reference,new RegExp('^storage://question-media/'+qid+'/rationale/'));assert.equal(h.writes[0].options.upsert,false);assert.equal(h.writes[0].options.contentType,'image/png');
});

const matrixQuestion={...original,type:'matrix',matrix_mode:'multiple',options:[{id:'a',label:'Appropriate'},{id:'b',label:'Monitor'},{id:'c',label:'Avoid'}],matrix_rows:[{id:'r1',label:'Assess the patient'},{id:'r2',label:'Notify the clinician'}]};
const matrixSolution={answer_key:{r1:['a','b'],r2:['a']},rationale:'Overall matrix rationale',row_explanations:{r1:'Assessment establishes priorities.',r2:'Escalate concerning findings.'}};
const matrixEdit={...matrixQuestion,answer_key:matrixSolution.answer_key,rationale:matrixSolution.rationale,row_explanations:matrixSolution.row_explanations};delete matrixEdit.id;delete matrixEdit.type;delete matrixEdit.category;
test('matrix multiple-response submissions persist all selections and frozen-key partial points',async()=>{
 const rows=[{attempt_id:id,question_id:qid,position:1,question_snapshot:matrixQuestion,solution_snapshot:matrixSolution}],answer={r1:['a','b','c'],r2:['a']};
 const h=harness({snapshots:rows}),result=await h.load('app/api/exams/submit/route.ts').POST(post('',{...payload,answers:{[qid]:answer}}));const data=await result.json();assert.equal(result.status,200);assert.equal(data.earned,2);assert.equal(data.possible,3);assert.deepEqual(h.writes[0].p_responses[0].response,answer);
 const completed=harness({attempts:[{...attempt,completed_at:'2026-11-04',earned:2,possible:3}],snapshots:rows,responses:[{id:'r',user_id:owner,attempt_id:id,question_id:qid,response:answer,earned:2,possible:3}]});
 const review=await reviewRequest(completed),saved=await review.json();assert.equal(saved.items[0].question.matrix_mode,'multiple');assert.deepEqual(saved.items[0].response,answer);assert.equal(saved.items[0].rowExplanations.r1,matrixSolution.row_explanations.r1);assert.equal(saved.items[0].status,'partial');assert.equal(completed.writes.length,0);
});
test('permitted matrix study reveal returns protected row explanations and keeps timed feedback blocked',async()=>{
 const h=harness({snapshots:[{attempt_id:id,question_id:qid,position:1,question_snapshot:matrixQuestion,solution_snapshot:matrixSolution}]});
 const checked=await h.load('app/api/study/check/route.ts').POST(post('',{questionId:qid,attemptId:id,answer:{r1:['a'],r2:['a']}})),data=await checked.json();assert.equal(data.earned,2);assert.equal(data.possible,3);assert.deepEqual(data.row_explanations,matrixSolution.row_explanations);
 const publicView=review.publicSnapshot({...matrixQuestion,row_explanations:matrixSolution.row_explanations,matrix_rows:[{id:'r1',label:'Finding',explanation:'Should never be public'}]});assert(!JSON.stringify(publicView).includes('Should never'));assert(!('row_explanations' in publicView));
});
test('only admins create validated draft matrices and explicitly publish; edits do not touch scoring history',async()=>{
 const denied=harness();assert.equal((await denied.load('app/api/admin/questions/route.ts').POST(post('',{category:'Antepartum',matrix:matrixEdit}))).status,403);assert.equal(denied.writes.length,0);
 const h=harness({administrator:true,liveQuestions:[{...matrixQuestion,published:true}],liveSolutions:[{question_id:qid,...matrixSolution}]}),api=h.load('app/api/admin/questions/route.ts');
 const created=await api.POST(post('',{category:'Antepartum',matrix:matrixEdit}));assert.equal(created.status,201);assert.equal(h.writes[0].p_question.published,false);
 assert.equal((await api.PATCH(post('',{id:qid,matrix:matrixEdit}))).status,200);assert.equal(h.writes[1].p_question.published,false);
 assert.equal((await api.PATCH(post('',{id:qid,matrixAction:'publish'}))).status,200);assert.deepEqual(h.writes[2].p_question,{published:true});assert.deepEqual(h.writes[2].p_solution,{});assert.equal(h.attempts[0].earned,0);
 assert.equal((await api.POST(post('',{category:'Antepartum',matrix:{...matrixEdit,answer_key:{r1:[],r2:['a']}}}))).status,400);
});

test('private media signing never transforms stored responses, answer identifiers, rationale text or alt text',async()=>{
 const h=harness(),uri='storage://question-media/q/reference.png',source={question_image_url:uri,question_image_alt:uri,stem:uri,answer_key:uri,response:uri,nursing_tip:uri,options:[{id:uri,label:'Original',images:[{url:uri,alt:'Diagram'}]}]};
 const [resolved]=await h.load('lib/question-media-server.ts').resolveMediaRecords([source]);assert.match(resolved.question_image_url,/signed/);assert.match(resolved.options[0].images[0].url,/signed/);assert.equal(resolved.options[0].id,uri);assert.equal(resolved.question_image_alt,uri);assert.equal(resolved.stem,uri);assert.equal(resolved.answer_key,uri);assert.equal(resolved.response,uri);assert.equal(resolved.nursing_tip,uri);assert.equal(source.question_image_url,uri);assert.equal(h.writes.length,0);
});

test('full studio library and all management actions reject students before privileged access',async()=>{
 const h=harness();assert.equal((await h.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test')})).status,403);
 for(const action of ['create','save','publish','archive','duplicate','restore'])assert.equal((await h.load('app/api/admin/questions/manage/route.ts').POST(post('',{action,id:qid,revision:0,document:questionAuthoring.questionDocument()}))).status,403);
 assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('draft creation can preserve incomplete work; publishing validates the stored question intentionally',async()=>{
 const h=harness({administrator:true}),api=h.load('app/api/admin/questions/manage/route.ts');
 const draft=questionAuthoring.questionDocument();assert.equal((await api.POST(post('',{action:'create',id:qid,revision:0,document:draft}))).status,201);assert.equal(h.writes[0].p_action,'create');assert(!('published' in h.writes[0].p_question));
 const valid=await api.POST(post('',{action:'publish',id:qid,revision:0}));assert.equal(valid.status,200);assert.equal(h.writes[1].p_action,'publish');
 const invalid=harness({administrator:true,liveSolutions:[{question_id:qid,answer_key:null,rationale:''}]});const rejected=await invalid.load('app/api/admin/questions/manage/route.ts').POST(post('',{action:'publish',id:qid,revision:0}));assert.equal(rejected.status,400);assert((await rejected.json()).fields.answer_key);assert.equal(invalid.writes.length,0);
});
test('save keeps stable IDs and revision; archive/duplicate never request deletion or student score changes',async()=>{
 const h=harness({administrator:true}),api=h.load('app/api/admin/questions/manage/route.ts'),doc=questionAuthoring.questionDocument(original,{answer_key:'a',rationale:'Existing rationale'});
 assert.equal((await api.POST(post('',{action:'save',id:qid,revision:4,document:doc}))).status,200);assert.equal(h.writes[0].p_id,qid);assert.equal(h.writes[0].p_expected_revision,4);assert.deepEqual(h.writes[0].p_question.options,original.options);
 for(const action of ['duplicate','archive','restore'])assert([200,201].includes((await api.POST(post('',{action,id:qid,revision:4}))).status));
 assert(h.writes.every(write=>write.p_action!=='delete'));assert.equal(h.attempts[0].earned,0);
 assert.equal((await api.POST(post('',{action:'delete',id:qid,revision:4}))).status,400);
});
test('library validates filters and pagination and requests an exact-count service query',async()=>{
 const h=harness({administrator:true}),api=h.load('app/api/admin/questions/library/route.ts');const response=await api.GET({nextUrl:new URL('https://example.test?category=Antepartum&type=matrix-multiple&status=draft&difficulty=hard&offset=25&search=bleeding')});assert.equal(response.status,200);const call=h.calls.find(call=>call.rpc==='admin_question_library');assert.equal(call.args.p_offset,25);assert.equal(call.args.p_type,'matrix-multiple');assert.equal(call.args.p_search,'bleeding');
 assert.equal((await api.GET({nextUrl:new URL('https://example.test?difficulty=impossible')})).status,400);assert.equal((await api.GET({nextUrl:new URL('https://example.test?offset=-1')})).status,400);
});
test('new teaching fields never appear in student question payloads and are revealed only by the existing permitted study path',async()=>{
 const q={...original,published:true,clinical_scenario:'Clinical scenario',content_format:'markdown',test_taking_tip:'Private exam strategy',answer_explanations:{a:'Private explanation'}};
 const h=harness({liveQuestions:[q],liveSolutions:[{question_id:qid,answer_key:'a',rationale:'Rationale',test_taking_tip:'Private exam strategy',answer_explanations:{a:'Private explanation'},rationale_format:'markdown'}]});
 const publicResponse=await h.load('app/api/questions/route.ts').GET({nextUrl:new URL('https://example.test?category=All')}),data=await publicResponse.json();assert.equal(data.questions[0].clinical_scenario,'Clinical scenario');assert(!JSON.stringify(data).includes('Private exam'));assert(!JSON.stringify(data).includes('Private explanation'));
 const checked=await h.load('app/api/study/check/route.ts').POST(post('',{questionId:qid,answer:'a'})),feedback=await checked.json();assert.equal(feedback.test_taking_tip,'Private exam strategy');assert.equal(feedback.answer_explanations.a,'Private explanation');assert.equal(feedback.earned,1);
});

test('missing Studio SQL still lists the existing bank without reading solutions or writing data',async()=>{
 const questions=[{...original,published:true,created_at:'2026-01-01'},{...original,id:'20000000-0000-0000-0000-000000000002',published:false,created_at:'2026-01-02'}];
 const h=harness({administrator:true,libraryError:{code:'PGRST202'},liveQuestions:questions,legacyColumns:['id','stem','category','type','published','created_at']});
 const response=await h.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test?status=all')}),data=await response.json();assert.equal(response.status,200);assert.equal(data.total,2);assert.equal(data.counts.published,1);assert.equal(data.counts.draft,1);assert.equal(data.managementReady,false);assert.equal(data.filtersReady.difficulty,false);assert.equal(data.questions[0].id,questions[0].id);assert.match(data.notice,/view-only/);assert(!h.calls.some(call=>call.table==='question_solutions'));assert.equal(h.writes.length,0);
});
test('fallback reads beyond 1000 rows and applies category/type/status/search filters before pagination',async()=>{
 const questions=Array.from({length:1005},(_,i)=>({...original,id:String(i),stem:'Existing maternity question '+i,published:i%2===0,created_at:'2026-01-01'}));
 const h=harness({administrator:true,libraryError:{code:'42883'},liveQuestions:questions});
 const result=await h.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test?status=all&offset=1000&category=Antepartum&type=single&search=maternity')}),data=await result.json();assert.equal(data.total,1005);assert.equal(data.questions.length,5);assert.equal(h.calls.filter(call=>call.table==='questions').length,3);assert.equal(h.writes.length,0);
});
test('a misleading zero-result RPC cannot hide question records that exist in the source table',async()=>{
 const h=harness({administrator:true,liveQuestions:[{...original,published:true}]});const result=await h.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test')}),data=await result.json();assert.equal(result.status,200);assert.equal(data.total,1);assert.equal(data.managementReady,false);assert.equal(data.questions[0].id,qid);
});
test('real database errors return unavailable rather than a fabricated empty question bank',async()=>{
 const h=harness({administrator:true,libraryError:{code:'PGRST202'},failTable:'questions'});const response=await h.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test')});assert.equal(response.status,503);assert.match((await response.json()).error,/does not mean your questions are missing/);assert.equal(h.writes.length,0);
 const empty=harness({administrator:true,libraryError:{code:'PGRST202'},liveQuestions:[]});const result=await empty.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test')}),data=await result.json();assert.equal(data.total,0);assert.equal(data.questions.length,0);
});

test('an unconfigured admin server connection returns a clear setup error without claiming the bank is empty',async()=>{
 const h=harness({administrator:true,adminUnavailable:true});const response=await h.load('app/api/admin/questions/library/route.ts').GET({nextUrl:new URL('https://example.test')});assert.equal(response.status,503);const data=await response.json();assert.match(data.error,/server connection/);assert(!('total' in data));assert.equal(h.writes.length,0);
});

const sourceCase={id:qid,topic:'Antepartum',intro:'Patient assessment',tabs:{Notes:'Clinical chart'},published:false};
const sourceItem={id:'20000000-0000-0000-0000-000000000002',case_id:qid,stem:'Priority action?',item_type:'Multiple Choice',content:{options:['Assess','Wait']},review_status:'approved',published:false};
const sourceAnswer={item_id:sourceItem.id,case_id:qid,answer:{correct:['A']},rationale:'Assess first'};
const transfer=h=>h.load('app/api/admin/ngn/transfer/route.ts').POST(post('',{caseId:qid}));
test('NGN transfer is administrator-only and never reads or writes for students',async()=>{
 const h=harness();assert.equal((await transfer(h)).status,403);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('NGN transfer converts current source keys and retains chart, IDs and draft publication',async()=>{
 const h=harness({administrator:true,ngnCases:[sourceCase],ngnItems:[sourceItem],ngnAnswers:[sourceAnswer]});assert.equal((await transfer(h)).status,200);assert.equal(h.writes.length,1);const d=h.writes[0].p_questions[0];assert.equal(d.question.id,sourceItem.id);assert.equal(d.question.bank_section,'ngn');assert.deepEqual(d.question.chart,sourceCase.tabs);assert.equal(d.solution.answer_key,'o1');assert.equal(d.solution.rationale,'Assess first');assert(!d.question.published);assert.deepEqual(h.writes[0].p_source.items,[sourceItem]);
});
test('six-question cases, incomplete approvals, published sources and unsupported content cannot transfer',async()=>{
 for(const items of [Array.from({length:6},(_,i)=>({...sourceItem,id:String(i)})),[{...sourceItem,review_status:'needs_review'}],[{...sourceItem,published:true}],[{...sourceItem,item_type:'Unknown'}]]){
  const h=harness({administrator:true,ngnCases:[sourceCase],ngnItems:items,ngnAnswers:[sourceAnswer]});assert.equal((await transfer(h)).status,400);assert.equal(h.writes.length,0);
 }
});
test('transferred sources are hidden only when mapped, with existing six-item cases retained',async()=>{
 const c2={...sourceCase,id:'other'};const h=harness({administrator:true,ngnCases:[sourceCase,c2],ngnItems:[{...sourceItem,qbank_question_id:sourceItem.id},{...sourceItem,id:'second',case_id:'other'}],ngnAnswers:[sourceAnswer]});const response=await h.load('app/api/admin/ngn/route.ts').GET(),data=await response.json();assert.deepEqual(data.cases.map(c=>c.id),['other']);assert.equal(data.items.length,1);assert.equal(data.answers.length,0);assert.equal(h.writes.length,0);
});
test('stale transfer or duplicate IDs are reported without overwriting or publishing',async()=>{
 for(const code of ['40001','23505']){const h=harness({administrator:true,ngnCases:[sourceCase],ngnItems:[sourceItem],ngnAnswers:[sourceAnswer],transferError:{code}});assert.equal((await transfer(h)).status,409);assert.equal(h.writes.length,0)}
});

test('all new NGN formats submit original selections and points through existing study/timed archives',async()=>{
 for(const mode of ['study','test'])for(const format of standalone.ngnFormats){const d=standalone.ngnTemplate(format);d.question.id=qid;const key=d.solution.answer_key,expected=scoring.scoreQuestion({...d.question,answer_key:key},key);const h=harness({attempts:[{...attempt,mode}],snapshots:[{attempt_id:id,question_id:qid,position:1,question_snapshot:d.question,solution_snapshot:d.solution}]});
 const result=await h.load('app/api/exams/submit/route.ts').POST(post('',{...payload,mode,answers:{[qid]:key}}));assert.equal(result.status,200);assert.equal((await result.json()).earned,expected.earned);assert.deepEqual(h.writes[0].p_responses[0].response,key);assert.equal(h.writes[0].p_responses[0].possible,expected.possible);
 }
});

test('canonical six-case player uses private numeric/ordered/paired keys only after submission',async()=>{
 for(const format of ['calculation','ordered','dyad-cloze']){const d=standalone.ngnTemplate(format),itemId=sourceItem.id;d.question.id=itemId;const cases=[{...sourceCase,published:true}],items=[{...sourceItem,published:true,content:{format_version:2,question:{...d.question,answer_key:'PRIVATE_FAKE',ngn_config:{...d.question.ngn_config,answer_key:'PRIVATE_FAKE'}}}}],answers=[{...sourceAnswer,answer:{answer_key:d.solution.answer_key,nursing_tip:'Private tip'},rationale:'Private case rationale'}];
 const h=harness({ngnCases:cases,ngnItems:items,ngnAnswers:answers});const visible=await h.load('app/api/ngn/route.ts').GET({nextUrl:new URL('https://example.test?formats=extended-v1')}),data=await visible.json();assert.equal(visible.status,200);assert(!JSON.stringify(data).includes('PRIVATE'));assert(!h.calls.some(c=>c.table==='ngn_answers'));assert.equal(data.items[0].content.question.ngn_format,format);
 items[0].content.question=d.question;
 const result=await h.load('app/api/ngn/route.ts').POST(post('',{caseId:qid,responses:{[itemId]:{response:d.solution.answer_key}}})),feedback=await result.json();assert.equal(result.status,200);assert.equal(feedback.earned,feedback.possible);assert.equal(feedback.results[0].rationale,'Private case rationale');assert.deepEqual(feedback.results[0].answer.answer_key,d.solution.answer_key);
 }
 const anonymous=harness({user:null});assert.equal((await anonymous.load('app/api/ngn/route.ts').GET()).status,401);assert.equal((await anonymous.load('app/api/ngn/route.ts').POST(post('',{}))).status,401);assert.equal(anonymous.calls.length,0);
});

test('older question clients are not offered new formats until requesting extended capability',async()=>{
 const d=standalone.ngnTemplate('calculation');const h=harness({liveQuestions:[{...original,published:true},{...d.question,id:'numeric',published:true}]});const get=url=>h.load('app/api/questions/route.ts').GET({nextUrl:new URL(url)});assert.equal((await (await get('https://example.test?category=All')).json()).questions.length,1);assert.equal((await (await get('https://example.test?category=All&formats=extended-v1')).json()).questions.length,2);
 const c=harness({ngnCases:[{...sourceCase,published:true}],ngnItems:[{...sourceItem,published:true,content:{question:d.question}}]});assert.equal((await (await c.load('app/api/ngn/route.ts').GET()).json()).cases.length,0);
});

const caseId='60000000-0000-0000-0000-000000000001';
function caseFixtures(){const c={id:caseId,case_number:1,topic:'Antepartum',intro:'Case story',tabs:{Notes:'Case notes'},published:true};const items=Array.from({length:6},(_,n)=>({id:`70000000-0000-0000-0000-${String(n+1).padStart(12,'0')}`,case_id:caseId,item_number:n+1,item_type:'Multiple Choice',stem:'Case item '+(n+1),content:{options:['Assess','Wait']},published:true}));const keys=items.map(i=>({item_id:i.id,case_id:caseId,answer:{correct:['A']},rationale:'Case reason',answer_text:'Assess'}));return{ngnCases:[c],ngnItems:items,ngnAnswers:keys};}
test('combined start archives one standalone plus all six ordered case items without leaking keys',async()=>{
 const h=harness({liveQuestions:[{...original,published:true}],...caseFixtures()});const response=await h.load('app/api/exams/start/route.ts').POST(post('api/exams/start',{questionIds:[qid],caseIds:[caseId],mode:'test'}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.questions.length,7);assert.equal(data.questions[0].id,qid);assert.deepEqual(data.questions.slice(1).map(q=>q.case_context.item_number),[1,2,3,4,5,6]);assert(!JSON.stringify(data).includes('answer_key'));assert(!JSON.stringify(data).includes('Case reason'));assert.equal(h.writes.length,1);
 const answers=Object.fromEntries(data.questions.map((q,n)=>[q.id,n===0?'a':'o1']));const submitted=await h.load('app/api/exams/submit/route.ts').POST(post('api/exams/submit',{attemptId:id,questionIds:data.questions.map(q=>q.id),answers,mode:'test'}));assert.equal(submitted.status,200);const result=await submitted.json();assert.equal(result.earned,6);assert.equal(result.possible,7);
});
test('case-only start is supported; incomplete or unpublished cases never create an attempt',async()=>{
 const fixtures=caseFixtures(),h=harness(fixtures);const response=await h.load('app/api/exams/start/route.ts').POST(post('api/exams/start',{questionIds:[],caseIds:[caseId],mode:'study'}));assert.equal(response.status,200);assert.equal((await response.json()).questions.length,6);
 for(const items of [fixtures.ngnItems.slice(1),fixtures.ngnItems.map((item,n)=>n===0?{...item,published:false}:item)]){const denied=harness({...fixtures,ngnItems:items});assert.equal((await denied.load('app/api/exams/start/route.ts').POST(post('api/exams/start',{questionIds:[],caseIds:[caseId],mode:'test'}))).status,400);assert.equal(denied.writes.length,0);}
});
test('setup guard preserves standalone start and blocks cases until the migration is installed',async()=>{
 const h=harness({mixedReady:false,...caseFixtures()});assert.equal((await h.load('app/api/exams/start/route.ts').POST(post('api/exams/start',{questionIds:[],caseIds:[caseId],mode:'study'}))).status,503);assert.equal(h.writes.length,0);assert.equal((await h.load('app/api/exams/start/route.ts').POST(post('api/exams/start',{questionIds:[qid],mode:'study'}))).status,200);
});
test('case solutions remain hidden during study mode until full exam submission',async()=>{
 const h=harness({...caseFixtures(),attempts:[{...attempt,mode:'study'}]});const started=await h.load('app/api/exams/start/route.ts').POST(post('api/exams/start',{questionIds:[],caseIds:[caseId],mode:'study'}));const data=await started.json();const denied=await h.load('app/api/study/check/route.ts').POST(post('api/study/check',{attemptId:id,questionId:data.questions[0].id,answer:'o1'}));assert.equal(denied.status,403);assert(!(await denied.text()).includes('Case reason'));
});
test('completed mixed history and review include both response stores with original snapshots',async()=>{
 const fixture=caseFixtures(),docs=fixture.ngnItems.map((item,n)=>caseExam.caseItemDocument(fixture.ngnCases[0],item,fixture.ngnAnswers[n],`80000000-0000-0000-0000-${String(n+1).padStart(12,'0')}`));
 const saved=docs.map((d,n)=>({id:`90000000-0000-0000-0000-${String(n+1).padStart(12,'0')}`,attempt_id:id,user_id:owner,question_id:d.question.id,response:'o1',earned:1,possible:1}));
 const snapshots=[{question_id:qid,position:1,question_snapshot:original,solution_snapshot:{answer_key:'a',rationale:'Original rationale'}},...docs.map((d,n)=>({question_id:d.question.id,position:n+2,question_snapshot:d.question,solution_snapshot:d.solution}))].map(row=>({...row,attempt_id:id}));
 const h=harness({attempts:[{...attempt,question_count:7,earned:7,possible:7,completed_at:'2026-11-07'}],responses:[{id:qid,attempt_id:id,user_id:owner,question_id:qid,response:'a',earned:1,possible:1}],caseResponses:saved,snapshots});
 const history=await (await h.load('app/api/exams/history/route.ts').GET({nextUrl:new URL('https://example.test?offset=0')})).json();assert.equal(history.attempts[0].recordedCount,7);assert.equal(history.attempts[0].correctCount,7);
 const review=await (await reviewRequest(h)).json();assert.equal(review.items.length,7);assert.equal(review.items[1].question.case_context.case_id,caseId);assert.equal(review.items[1].rationale,'Case reason');assert.equal(review.items[1].response,'o1');
});

test('exam APIs accept 150 and reject 151 before database writes',async()=>{
 const questions=Array.from({length:151},(_,n)=>({...original,id:`22000000-0000-0000-0000-${String(n).padStart(12,'0')}`}));
 const h=harness();let response=await h.load('app/api/exams/start/route.ts').POST(post('',{questionIds:questions.slice(0,150).map(q=>q.id),mode:'study'}));assert.equal(response.status,200);assert.equal(h.calls.find(c=>c.rpc==='start_exam_review_attempt').args.p_question_ids.length,150);
 const reject=harness();for(const route of ['start','submit']){response=await reject.load(`app/api/exams/${route}/route.ts`).POST(post('',{questionIds:questions.map(q=>q.id),mode:'study',answers:{}}));assert.equal(response.status,400);}assert.equal(reject.calls.length,0);
 const snapshots=questions.slice(0,150).map((q,n)=>({attempt_id:id,question_id:q.id,position:n+1,question_snapshot:q,solution_snapshot:{answer_key:'a',rationale:'Original rationale'}}));const submit=harness({attempts:[{...attempt,question_count:150}],snapshots});
 response=await submit.load('app/api/exams/submit/route.ts').POST(post('',{attemptId:id,questionIds:questions.slice(0,150).map(q=>q.id),mode:'study',answers:Object.fromEntries(questions.slice(0,150).map(q=>[q.id,'a']))}));assert.equal(response.status,200);assert.equal((await response.json()).earned,150);assert.equal(submit.writes[0].p_responses.length,150);
});
