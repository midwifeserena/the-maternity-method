import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../proxy.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

function proxyFixture({user={id:'tester'},allowed=true,rpcError=null,enabled=true,configured=true}={}){
 const counts={auth:0,access:0};
 function response(props){
  const cookies=[];
  return {...props,headers:new Map(),cookies:{getAll:()=>cookies,set:(cookie,value)=>cookies.push(typeof cookie==='string'?{name:cookie,value}:cookie)}};
 }
 const module={exports:{}};
 vm.runInNewContext(code,{
  module,exports:module.exports,URL,
  process:{env:{
   COURSE_ACCESS_GATE:enabled?'1':'0',
   ...(configured?{NEXT_PUBLIC_SUPABASE_URL:'https://example.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-key'}:{}),
  }},
  require(name){
   if(name==='next/server')return{NextResponse:{
    next:()=>response({passed:true}),
    redirect:url=>response({location:url.pathname}),
    json:(body,{status})=>response({status,body}),
   }};
   if(name==='@supabase/ssr')return{createServerClient(_url,_key,options){
    return{
     auth:{getClaims:async()=>{},getUser:async()=>{
      counts.auth++;
      options.cookies.setAll([{name:'session',value:'refreshed'}]);
      return {data:{user},error:null};
     }},
     rpc:async name=>{
      assert.equal(name,'has_course_access');counts.access++;
      return {data:allowed,error:rpcError};
     },
    };
   }};
   throw Error('Unexpected import: '+name);
  },
 });
 return {
  counts,
  request:path=>module.exports.proxy({
   url:'https://example.test'+path,nextUrl:new URL('https://example.test'+path),
   cookies:{getAll:()=>[],set:()=>{}},
  }),
 };
}

test('launch, tester sign-in and auth callback stay public with the gate enabled',async()=>{
 const fixture=proxyFixture({user:null});
 for(const path of ['/','/launch','/launch/','/login','/auth/callback','/reset-password','/enrollment-closed'])
  assert.equal((await fixture.request(path)).passed,true,path);
 assert.deepEqual(fixture.counts,{auth:0,access:0});
});

test('only authorized testers reach course pages and API endpoints',async()=>{
 const tester=proxyFixture();
 assert.equal((await tester.request('/study-studio/notebook')).passed,true);
 assert.equal((await tester.request('/api/study-guides/sheet')).passed,true);
 const visitor=proxyFixture({user:null});
 assert.equal((await visitor.request('/dashboard')).location,'/login');
 assert.equal((await visitor.request('/api/questions')).status,401);
 assert.equal(visitor.counts.access,0);
 const nonTester=proxyFixture({allowed:false});
 for(const path of ['/dashboard','/previous-tests/example/resume','/admin/questions','/ngn-case-studies']){
  const result=await nonTester.request(path);
  assert.equal(result.location,'/enrollment-closed');
  assert.equal(result.headers.get('Cache-Control'),'private, no-store');
  assert.equal(result.cookies.getAll()[0].name,'session');
 }
 assert.equal((await nonTester.request('/api/exams/start')).status,403);
});

test('the gate fails closed if access cannot be verified, and can be deployed before activation',async()=>{
 const failure=proxyFixture({allowed:null,rpcError:{code:'PGRST202'}});
 assert.equal((await failure.request('/dashboard')).status,503);
 assert.equal((await failure.request('/api/ngn')).status,503);
 const missingKeys=proxyFixture({configured:false});
 assert.equal((await missingKeys.request('/dashboard')).status,503);
 const staged=proxyFixture({enabled:false});
 assert.equal((await staged.request('/dashboard')).passed,true);
 assert.equal(staged.counts.access,0);
});
