import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as review from '../lib/exam-review.mjs';
import * as scoring from '../lib/scoring.mjs';
const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',id='30000000-0000-0000-0000-000000000001',qid='20000000-0000-0000-0000-000000000001';
const original={id:qid,type:'single',category:'Antepartum',stem:'Original archived question',options:[{id:'a',label:'Original A'},{id:'b',label:'B'}],matrix_rows:[]};
const attempt={id,user_id:owner,mode:'study',earned:0,possible:0,question_count:1,snapshot_stage:'start',completed_at:null};
function harness({user=owner,attempts=[{...attempt}],responses=[],snapshots=[{attempt_id:id,question_id:qid,position:1,question_snapshot:original,solution_snapshot:{answer_key:'a',rationale:'Original rationale'}}],missing=false,historyRows=null}={}){
 const calls=[],writes=[];
 function client(privileged=false){return {auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},rpc:async(name,args)=>{
  calls.push({rpc:name,privileged,args});
  if(name==='start_exam_review_attempt')return missing?{data:null,error:{code:'PGRST202'}}:{data:{attemptId:id,questions:[original]},error:null};
  assert(privileged);assert.equal(name,'complete_exam_review_attempt');writes.push(args);const row=attempts.find(a=>a.id===args.p_attempt_id);row.completed_at='2026-11-04';row.earned=args.p_responses.reduce((n,r)=>n+r.earned,0);row.possible=args.p_responses.reduce((n,r)=>n+r.possible,0);return {data:{attemptId:id,earned:row.earned,possible:row.possible},error:null};
 },from(table){calls.push({table,privileged});let filters=[],start=0,end=Infinity,single=false;
  const chain={select(){return chain},eq(key,value){filters.push(r=>r[key]===value);return chain},in(key,value){filters.push(r=>value.includes(r[key]));return chain},not(key,_op,value){filters.push(r=>r[key]!==value);return chain},order(){return chain},range(a,b){start=a;end=b;return chain},maybeSingle(){single=true;return chain},single(){single=true;return chain},
   then(resolve,reject){let rows=table==='exam_attempts'?historyRows??attempts:table==='exam_responses'?responses:table==='exam_review_items'?snapshots:table==='questions'?[{...original,stem:'CURRENT EDIT',published:true}]:[];rows=rows.filter(row=>filters.every(match=>match(row))).slice(start,end+1);return Promise.resolve({data:single?rows[0]??null:rows,error:null}).then(resolve,reject)}
  };return chain;
 }}}
 const db=client(),service=client(true),cache=new Map();
 function load(path){if(cache.has(path))return cache.get(path);const js=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const module={exports:{}};cache.set(path,module.exports);new Function('require','exports','module',js)(name=>{
   if(name==='next/server')return {NextResponse:{json:(data,options)=>Response.json(data,options)}};
   if(name==='@/lib/supabase/server')return {createClient:async()=>db};
   if(name==='@/lib/supabase/admin')return {admin:()=>service};
   if(name==='@/lib/exam-review.mjs')return review;
   if(name==='@/lib/scoring.mjs')return scoring;
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
 const old=harness({missing:true});const fallback=await old.load('app/api/exams/start/route.ts').POST(post('',{questionIds:[qid],mode:'study'}));assert.equal((await fallback.json()).reviewSnapshotAvailable,false);
});
test('history is scoped to owner, excludes incomplete attempts, and paginates response reads beyond 500',async()=>{
 const rows=[{...attempt,completed_at:'2026-11-04',question_count:501,earned:501,possible:501},{...attempt,id:'other',user_id:other,completed_at:'2026-11-04'}, {...attempt,id:'pending'}];
 const responses=Array.from({length:501},(_,i)=>({id:String(i),attempt_id:id,user_id:owner,question_id:String(i),response:'a',earned:1,possible:1}));const h=harness({historyRows:rows,responses});
 const result=await h.load('app/api/exams/history/route.ts').GET({nextUrl:new URL('https://example.test?offset=0')}),data=await result.json();assert.equal(data.attempts.length,1);assert.equal(data.attempts[0].correctCount,501);assert.equal(h.calls.filter(c=>c.table==='exam_responses').length,2);assert.equal(h.writes.length,0);
});
