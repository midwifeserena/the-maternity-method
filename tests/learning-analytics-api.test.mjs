import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as model from '../lib/learning-analytics.mjs';
import {completeExamCases} from '../lib/case-exam.mjs';
function setup({user='owner',fail=null}={}){
 const calls=[],cache=new Map(),data={exam_attempts:Array.from({length:501},(_,n)=>({id:'a'+n,user_id:'owner',mode:'study',earned:1,possible:1,question_count:1,completed_at:'2026-01-01',created_at:'2026-01-01'})),questions:Array.from({length:1001},(_,n)=>({id:'q'+n,category:'Antepartum',type:'single',published:true})),exam_responses:Array.from({length:501},(_,n)=>({id:'r'+n,user_id:'owner',attempt_id:'a'+n,question_id:'q'+n,response:'a',earned:1,possible:1})),exam_case_responses:[],exam_review_items:[],ngn_cases:[],ngn_items:[]};
 data.exam_attempts.push({id:'foreign',user_id:'someone-else',mode:'test',earned:0,possible:1,completed_at:'2026-01-01'});data.exam_responses.push({id:'foreign',user_id:'someone-else',attempt_id:'foreign',question_id:'q999',response:'a',earned:1,possible:1});
 const db={auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},from(table){const call={table,filters:[],range:null,ranges:[],select:null};calls.push(call);const filters=[];let start=0,end=Infinity;const query={select(value){call.select=value;return query},eq(k,v){call.filters.push([k,v]);filters.push(r=>r[k]===v);return query},in(k,v){call.filters.push([k,v]);filters.push(r=>v.includes(r[k]));return query},order(){return query},range(a,b){start=a;end=b;call.range=[a,b];call.ranges.push([a,b]);return query},then(resolve,reject){return Promise.resolve(table===fail?{error:{code:'XX000'}}:{data:(data[table]??[]).filter(r=>filters.every(f=>f(r))).slice(start,end+1),error:null}).then(resolve,reject)}};return query}};
 function load(path){if(cache.has(path))return cache.get(path);const output=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,compiled={exports:{}};cache.set(path,compiled.exports);new Function('require','exports','module',output)(name=>{
 if(name==='next/server')return {NextResponse:{json:(d,o)=>Response.json(d,o)}};
 if(name==='@/lib/supabase/server')return {createClient:async()=>db};
 if(name==='@/lib/learning-analytics.mjs')return model;
 if(name==='@/lib/case-exam.mjs')return {completeExamCases};
 if(name==='@/lib/exam-review-server')return {missingReviewTable:e=>['42P01','PGRST205'].includes(e?.code)};
 if(name==='@/lib/learning-analytics-server')return load('lib/learning-analytics-server.ts');
 throw Error(name);
 },compiled.exports,compiled);return compiled.exports;}
 return {calls,data,get:()=>load('app/api/learning-stats/route.ts').GET()};
}
test('stats authenticate before any reads and cannot accept another student id',async()=>{const h=setup({user:null});assert.equal((await h.get()).status,401);assert.equal(h.calls.length,0)});
test('all-history pagination exceeds Supabase row defaults and every student read is owner scoped',async()=>{
 const h=setup(),r=await h.get();assert.equal(r.status,200);const d=await r.json();assert.equal(d.tests.created,501);assert.equal(d.tests.completed,501);assert.equal(d.questionScore.total,501);assert.equal(d.usage.used,501);assert.equal(d.usage.total,1001);assert.equal(d.usage.percent,50);
 for(const c of h.calls.filter(c=>['exam_attempts','exam_responses','exam_case_responses'].includes(c.table)))assert(c.filters.some(([k,v])=>k==='user_id'&&v==='owner'));
 assert(h.calls.find(c=>c.table==='questions').ranges.length>=3);assert(!h.calls.some(c=>c.table==='question_solutions'));assert(!JSON.stringify(d).includes('answer_key'));assert(!JSON.stringify(d).includes('foreign'));
});
test('database errors show an error, never fabricated zero totals',async()=>{const h=setup({fail:'exam_attempts'}),r=await h.get();assert.equal(r.status,500);const d=await r.json();assert(d.error);assert(!d.tests);assert.match(r.headers.get('Cache-Control'),/no-store/)});
