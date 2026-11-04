import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../app/api/admin/flashcards/route.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const id='f32d10aa-981c-5505-a19c-9dd2fbc1ad7f';
const original={id,card_number:1,topic:'Antepartum',front:'GTPAL',back:'Original answer',high_yield:true,review_status:'approved',published:true};

function setup({authorized=true,rows=[],dbError=null}={}){
 const saved=new Map(rows.map(card=>[card.id,{...card}]));const writes=[];
 const client={from(table){
  assert.equal(table,'flashcard_library');let mode='read',input,ids,start=0,end=Infinity;
  const query={select(){return query},order(){return query},range(a,b){start=a;end=b;return query},in(key,values){assert.equal(key,'id');ids=values;return query},
   upsert(cards,options){assert.deepEqual(options,{onConflict:'id',ignoreDuplicates:true});mode='insert';input=cards;return query},
   update(changes){mode='update';input=changes;return query},
   then(resolve,reject){
    let result;
    if(dbError)result={data:null,error:dbError};
    else if(mode==='insert'){
     const inserted=[];for(const card of input)if(!saved.has(card.id)){saved.set(card.id,{...card});inserted.push({id:card.id})}
     writes.push(input);result={data:inserted,error:null};
    }else if(mode==='update'){
     for(const key of ids)saved.set(key,{...saved.get(key),...input});writes.push(input);result={data:null,error:null};
    }else result={data:[...saved.values()].filter(card=>!ids||ids.includes(card.id)).slice(start,end+1),error:null};
    return Promise.resolve(result).then(resolve,reject);
   }
  };return query;
 }};
 const module={exports:{}};
 new Function('require','exports','module',js)(name=>{
  if(name==='next/server')return {NextResponse:{json:(value,options)=>Response.json(value,options)}};
  if(name==='@/lib/ngn-admin-auth')return {requireNgnAdmin:async()=>authorized?{id:'admin'}:null};
  if(name==='@/lib/supabase/admin')return {admin:()=>{assert(authorized,'Unauthorized database access');return client}};
  throw Error('Unexpected import '+name);
 },module.exports,module);
 return {...module.exports,saved,writes};
}
const request=(method,value)=>new Request('https://example.test/api/admin/flashcards',{method,body:JSON.stringify(value)});

test('flashcard administration rejects unauthorized reads, imports and publication',async()=>{
 const api=setup({authorized:false});
 assert.equal((await api.GET()).status,403);
 assert.equal((await api.POST(request('POST',{cards:[original]}))).status,403);
 assert.equal((await api.PATCH(request('PATCH',{id,action:'approve_publish'}))).status,403);
 assert.equal(api.writes.length,0);
});

test('SQL import extracts only flashcard literals and forces new content to drafts',async()=>{
 const api=setup();
 const sql="drop table flashcards; insert into flashcards (id, card_number, topic, front, back, high_yield) values ($mm$"+id+"$mm$, 1, $mm$Antepartum$mm$, $mm$Patient's question$mm$, $mm$Answer; with punctuation$mm$, true) on conflict (id) do nothing;";
 const response=await api.POST(request('POST',{source:sql}));assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{inserted:1,skipped:0});
 assert.equal(api.saved.get(id).front,"Patient's question");assert.equal(api.saved.get(id).review_status,'needs_review');assert.equal(api.saved.get(id).published,false);
 assert.equal(api.writes.length,1);
});

test('CSV import handles commas, quotes and newlines, and preserves existing IDs',async()=>{
 const api=setup({rows:[original]});
 const csv='id,card_number,topic,front,back,high_yield\n'+id+',1,Antepartum,"Question, with comma","Answer with ""quotes""\nand a newline",false';
 const response=await api.POST(request('POST',{source:csv}));assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{inserted:0,skipped:1});assert.equal(api.saved.get(id).back,'Original answer');
 const fresh=setup();await fresh.POST(request('POST',{source:csv}));assert.equal(fresh.saved.get(id).back,'Answer with "quotes"\nand a newline');
});

test('JSON import cannot publish cards, and malformed or duplicate rows are rejected',async()=>{
 const api=setup();const response=await api.POST(request('POST',{cards:[original]}));assert.equal(response.status,200);assert.equal(api.saved.get(id).published,false);
 for(const body of [null,{cards:[]},{cards:[original,original]},{cards:[{...original,card_number:0}]},{cards:[{...original,back:' '}]},{source:'id,card_number,topic,front,back\n"unclosed'}]){
  assert.equal((await setup().POST(request('POST',body))).status,400);
 }
});

test('saving edits removes approval/publication; publishing and unpublishing operate on selected cards',async()=>{
 const api=setup({rows:[original]});
 assert.equal((await api.PATCH(request('PATCH',{id,action:'save',card:{...original,front:'Edited'}}))).status,200);
 assert.equal(api.saved.get(id).published,false);assert.equal(api.saved.get(id).review_status,'needs_review');
 assert.equal((await api.PATCH(request('PATCH',{ids:[id],action:'approve_publish'}))).status,200);assert.equal(api.saved.get(id).published,true);
 assert.equal((await api.PATCH(request('PATCH',{id,action:'unpublish'}))).status,200);assert.equal(api.saved.get(id).published,false);
 const invalid=setup({rows:[{...original,back:' '}]});assert.equal((await invalid.PATCH(request('PATCH',{id,action:'approve_publish'}))).status,400);assert.equal(invalid.writes.length,0);
 assert.equal((await api.PATCH(request('PATCH',null))).status,400);
});

test('missing library reports an actionable admin error without leaking database details',async()=>{
 const api=setup({dbError:{code:'42P01',message:'internal detail'}});const response=await api.GET();assert.equal(response.status,500);
 const result=await response.json();assert(result.error.includes('Set up'));assert(!result.error.includes('internal detail'));
});
