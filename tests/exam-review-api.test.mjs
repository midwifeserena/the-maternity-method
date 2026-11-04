import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as review from '../lib/exam-review.mjs';
import * as scoring from '../lib/scoring.mjs';
import * as education from '../lib/question-education.mjs';
import * as matrix from '../lib/matrix.mjs';
import * as questionAuthoring from '../lib/question-authoring.mjs';
import * as matrixAuthoring from '../lib/matrix-authoring.mjs';
const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',id='30000000-0000-0000-0000-000000000001',qid='20000000-0000-0000-0000-000000000001';
const original={id:qid,type:'single',category:'Antepartum',stem:'Original archived question',options:[{id:'a',label:'Original A'},{id:'b',label:'B'}],matrix_rows:[]};
const attempt={id,user_id:owner,mode:'study',earned:0,possible:0,question_count:1,snapshot_stage:'start',completed_at:null};
function harness({user=owner,attempts=[{...attempt}],responses=[],snapshots=[{attempt_id:id,question_id:qid,position:1,question_snapshot:original,solution_snapshot:{answer_key:'a',rationale:'Original rationale'}}],missing=false,historyRows=null,liveQuestions=[{...original,stem:'CURRENT EDIT',published:false}],liveSolutions=[{question_id:qid,answer_key:'b',rationale:'Current bank rationale'}],failTable=null,missingSnapshots=false,administrator=false}={}){
 const calls=[],writes=[];
 function client(privileged=false){return {storage:{from(){return {createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:'https://example.test/signed/'+path})),error:null}),createSignedUrl:async path=>({data:{signedUrl:'https://example.test/signed/'+path},error:null}),upload:async(path,bytes,options)=>{writes.push({upload:path,size:bytes.length,options});return {data:{path},error:null}}}}},auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},rpc:async(name,args)=>{
  calls.push({rpc:name,privileged,args});
  if(name==='manage_question_studio'){assert(privileged);writes.push(args);return {data:{id:args.p_id,revision:args.p_expected_revision+1,published:args.p_action==='publish',archived_at:args.p_action==='archive'?'2026-11-04':null},error:null}}
  if(name==='admin_question_library')return {data:{questions:[],total:0,counts:{all:0,draft:0,published:0,archived:0},offset:args.p_offset,limit:25},error:null};
  if(name==='create_matrix_question'){assert(privileged);writes.push(args);return {data:qid,error:null}}
  if(name==='edit_matrix_question'){assert(privileged);writes.push(args);return {data:null,error:null}}
  if(name==='edit_question_education'){assert(privileged);writes.push(args);return {data:null,error:null}}
  if(name==='start_exam_review_attempt')return missing?{data:null,error:{code:'PGRST202'}}:{data:{attemptId:id,questions:[original]},error:null};
  assert(privileged);assert.equal(name,'complete_exam_review_attempt');writes.push(args);const row=attempts.find(a=>a.id===args.p_attempt_id);row.completed_at='2026-11-04';row.earned=args.p_responses.reduce((n,r)=>n+r.earned,0);row.possible=args.p_responses.reduce((n,r)=>n+r.possible,0);return {data:{attemptId:id,earned:row.earned,possible:row.possible},error:null};
 },from(table){calls.push({table,privileged});let filters=[],start=0,end=Infinity,single=false;
  const chain={select(){return chain},eq(key,value){filters.push(r=>r[key]===value);return chain},in(key,value){filters.push(r=>value.includes(r[key]));return chain},not(key,_op,value){filters.push(r=>r[key]!==value);return chain},order(){return chain},limit(){return chain},ilike(){return chain},range(a,b){start=a;end=b;return chain},maybeSingle(){single=true;return chain},single(){single=true;return chain},
   then(resolve,reject){if(table===failTable)return Promise.resolve({data:null,error:{code:'XX000'}}).then(resolve,reject);if(table==='exam_review_items'&&missingSnapshots)return Promise.resolve({data:null,error:{code:'PGRST205'}}).then(resolve,reject);let rows=table==='exam_attempts'?historyRows??attempts:table==='exam_responses'?responses:table==='exam_review_items'?snapshots:table==='questions'?liveQuestions:table==='question_solutions'?liveSolutions:[];rows=rows.filter(row=>filters.every(match=>match(row))).slice(start,end+1);return Promise.resolve({data:single?rows[0]??null:rows,error:null}).then(resolve,reject)}
  };return chain;
 }}}
 const db=client(),service=client(true),cache=new Map();
 function load(path){if(cache.has(path))return cache.get(path);const js=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const module={exports:{}};cache.set(path,module.exports);new Function('require','exports','module',js)(name=>{
   if(name==='next/server')return {NextResponse:{json:(data,options)=>Response.json(data,options)}};
   if(name==='@/lib/supabase/server')return {createClient:async()=>db};
   if(name==='@/lib/supabase/admin')return {admin:()=>service};
   if(name==='@/lib/exam-review.mjs')return review;
   if(name==='@/lib/scoring.mjs')return scoring;
   if(name==='@/lib/ngn-admin-auth')return {requireNgnAdmin:async()=>administrator&&user?{id:user}:null};
   if(name==='@/lib/matrix.mjs')return matrix;
   if(name==='@/lib/question-authoring.mjs')return questionAuthoring;
   if(name==='@/lib/matrix-authoring.mjs')return matrixAuthoring;
   if(name==='@/lib/questions')return {categories:['Antepartum','Intrapartum','Postpartum','Newborn']};
   if(name==='@/lib/question-education.mjs')return education;
   if(name==='@/lib/question-media-server')return load('lib/question-media-server.ts');
   if(name==='@/lib/exam-review-server')return load('lib/exam-review-server.ts');
   throw Error('Unexpected import '+name);
  },module.exports,module);return module.exports}
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
