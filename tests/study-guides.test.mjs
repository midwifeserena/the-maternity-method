import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {studyGuideCatalog,mergeStudyGuides,filterStudyGuides} from '../lib/study-guide-catalog.mjs';

test('all 19 catalog entries have unique titles, authenticated links, and bundled PDF bytes',()=>{
 assert.equal(studyGuideCatalog.length,19);assert.equal(new Set(studyGuideCatalog.map(g=>g.id)).size,19);assert.equal(new Set(studyGuideCatalog.map(g=>g.title)).size,19);
 for(const guide of studyGuideCatalog){assert.match(guide.filename,/^[a-z0-9-]+\.pdf$/);assert.equal(guide.file_url,'/api/study-guides/'+guide.slug);const file=new URL('../content/study-guides/'+guide.filename,import.meta.url);assert(existsSync(file));assert.equal(readFileSync(file).subarray(0,5).toString(),'%PDF-');}
});
test('published database guides are retained without duplicate ids or PDF URLs',()=>{
 const older={id:'old',title:'Existing guide',category:'Antepartum',description:'Saved earlier',file_url:'https://example.test/guide.pdf'};
 const result=mergeStudyGuides([older,older,{...studyGuideCatalog[0],id:'duplicate-url'}]);assert.equal(result.length,20);assert.deepEqual(result.at(-1),older);assert.equal(mergeStudyGuides().length,19);
});
test('search and category work together, including cross-topic guides',()=>{
 assert.equal(filterStudyGuides(studyGuideCatalog,'All','preeclampsia').length,1);assert.equal(filterStudyGuides(studyGuideCatalog,'Postpartum','preeclampsia').length,1);assert.equal(filterStudyGuides(studyGuideCatalog,'Newborn','preeclampsia').length,0);
 assert.equal(filterStudyGuides(studyGuideCatalog,'Newborn','intraamniotic').length,1);assert.equal(filterStudyGuides(studyGuideCatalog,'All','does not exist').length,0);assert.equal(filterStudyGuides(studyGuideCatalog,'All','   ').length,19);
});
function routeHarness({user={id:'student'},missing=false}={}){
 let reads=0;
 const exports={};const code=ts.transpileModule(readFileSync(new URL('../app/api/study-guides/[slug]/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 class Response{constructor(body,options={}){this.body=body;this.status=options.status??200;this.headers=options.headers??{}}static json(body,options){return new Response(body,options)}}
 vm.runInNewContext(code,{exports,process:{cwd:()=>'/test'},Uint8Array,require(name){
  if(name==='node:fs/promises')return{async readFile(file){reads++;assert.equal(path.basename(file),studyGuideCatalog[0].filename);if(missing)throw Error('missing');return new TextEncoder().encode('%PDF-test');}};
  if(name==='node:path')return path;
  if(name==='next/server')return{NextResponse:Response};
  if(name==='@/lib/supabase/server')return{async createClient(){return{auth:{async getUser(){return{data:{user}}}}}}};
  if(name==='@/lib/study-guide-catalog.mjs')return{studyGuideCatalog};
  throw Error('Unexpected module '+name);
 }});return{get:exports.GET,reads:()=>reads};
}
const req=(query='')=>({nextUrl:new URL('https://example.test/api/study-guides/test'+query)});
const params=slug=>({params:Promise.resolve({slug})});
test('PDF endpoint requires auth and never reads files for unknown or traversal slugs',async()=>{
 const anonymous=routeHarness({user:null});assert.equal((await anonymous.get(req(),params(studyGuideCatalog[0].slug))).status,401);assert.equal(anonymous.reads(),0);
 const signedIn=routeHarness();for(const slug of ['not-found','../../secrets','01-prenatal-assessment.pdf'])assert.equal((await signedIn.get(req(),params(slug))).status,404);assert.equal(signedIn.reads(),0);
});
test('PDF preview and download use private, non-cacheable responses and a safe filename',async()=>{
 const h=routeHarness();let result=await h.get(req(),params(studyGuideCatalog[0].slug));assert.equal(result.status,200);assert.equal(result.headers['Content-Type'],'application/pdf');assert.match(result.headers['Content-Disposition'],/^inline; filename="01-prenatal-assessment.pdf"$/);assert.equal(result.headers['Cache-Control'],'private, no-store');assert.equal(result.headers['X-Content-Type-Options'],'nosniff');
 result=await h.get(req('?download=1'),params(studyGuideCatalog[0].slug));assert.match(result.headers['Content-Disposition'],/^attachment;/);assert.equal(h.reads(),2);
});
test('missing PDF returns a controlled error without exposing a filesystem path',async()=>{const h=routeHarness({missing:true});const response=await h.get(req(),params(studyGuideCatalog[0].slug));assert.equal(response.status,503);assert(!JSON.stringify(response.body).includes('/test'));});
