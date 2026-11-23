import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {studyGuideBucket,studyGuideCatalog,studyGuideVolumes,filterStudyGuides} from '../lib/study-guide-catalog.mjs';

test('the seven volumes contain the 130 supplied sheets in learning order',()=>{
 assert.deepEqual(studyGuideVolumes.map(v=>v.id),[1,2,3,4,5,6,7]);
 assert.equal(studyGuideCatalog.length,130);
 const numbers=studyGuideCatalog.map(g=>g.number);
 assert.deepEqual(numbers,[...numbers].sort());
 assert.equal(new Set(studyGuideCatalog.map(g=>g.id)).size,130);
 assert.deepEqual(studyGuideVolumes.map(v=>studyGuideCatalog.filter(g=>g.volume===v.id).length),[22,25,16,30,12,11,14]);
 for(const guide of studyGuideCatalog){
  assert.match(guide.filename,/^[a-z0-9-]+\.pdf$/);
  assert.equal(guide.file_url,'/api/study-guides/'+guide.slug);
  assert.equal(guide.download_filename,guide.number+' '+guide.title+'.pdf');
  assert.equal(guide.page_count,1);
  assert.match(guide.sha256,/^[a-f0-9]{64}$/);
 }
});
test('study sheet search matches both topic and sheet number',()=>{
 assert.equal(filterStudyGuides(studyGuideCatalog,'All','preeclampsia').length,2);
 assert.equal(filterStudyGuides(studyGuideCatalog,'All','2.25')[0].title,'Cardinal Movements');
 assert.equal(filterStudyGuides(studyGuideCatalog,'All','does not exist').length,0);
 assert.equal(filterStudyGuides(studyGuideCatalog,'All','   ').length,130);
});
function routeHarness({user={id:'student'},missing=false,guide=studyGuideCatalog[0]}={}){
 let reads=0;
 const exports={};const code=ts.transpileModule(readFileSync(new URL('../app/api/study-guides/[slug]/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 class Response{constructor(body,options={}){this.body=body;this.status=options.status??200;this.headers=options.headers??{}}static json(body,options){return new Response(body,options)}}
 vm.runInNewContext(code,{exports,process:{cwd:()=>'/test'},Uint8Array,require(name){
  if(name==='@/lib/supabase/admin')return{admin(){return{storage:{from(bucket){
   assert.equal(bucket,studyGuideBucket);
   return{async download(filename){
    reads++;assert.equal(filename,guide.filename);
    return missing?{error:Error('missing')}:{data:new Blob(['%PDF-test'])};
   }};
  }}}}};
  if(name==='next/server')return{NextResponse:Response};
  if(name==='@/lib/supabase/server')return{async createClient(){return{auth:{async getUser(){return{data:{user}}}}}}};
  if(name==='@/lib/study-guide-catalog.mjs')return{studyGuideCatalog,studyGuideBucket};
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
 const h=routeHarness();let result=await h.get(req(),params(studyGuideCatalog[0].slug));assert.equal(result.status,200);assert.equal(result.headers['Content-Type'],'application/pdf');assert.equal(result.headers['Content-Disposition'],`inline; filename="${studyGuideCatalog[0].download_filename}"`);assert.equal(result.headers['Cache-Control'],'private, no-store');assert.equal(result.headers['X-Content-Type-Options'],'nosniff');
 result=await h.get(req('?download=1'),params(studyGuideCatalog[0].slug));assert.match(result.headers['Content-Disposition'],/^attachment;/);assert.equal(h.reads(),2);
});
test('download names retain non-ASCII punctuation through an encoded header',async()=>{
 const guide=studyGuideCatalog.find(sheet=>sheet.number==='5.04');
 const response=await routeHarness({guide}).get(req('?download=1'),params(guide.slug));
 assert.equal(response.status,200);
 assert.match(response.headers['Content-Disposition'],/filename\*\=UTF-8''5\.04%20Erikson%E2%80%99s/);
});
test('missing PDF returns a controlled error without exposing a filesystem path',async()=>{const h=routeHarness({missing:true});const response=await h.get(req(),params(studyGuideCatalog[0].slug));assert.equal(response.status,503);assert(!JSON.stringify(response.body).includes('/test'));});

function pageHarness(user){
 const exports={},localRequire=createRequire(import.meta.url),Library=()=>null;
 const code=ts.transpileModule(readFileSync(new URL('../app/(platform)/study-guides/page.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require(name){
  if(name==='react/jsx-runtime')return localRequire(name);
  if(name==='next/navigation')return{redirect(location){throw Error('Redirect: '+location)}};
  if(name==='@/lib/supabase/server')return{async createClient(){return{auth:{async getUser(){return{data:{user}}}},from(){throw Error('Legacy guide rows must not be loaded into the replacement collection')}}}};
  if(name==='@/lib/study-guide-catalog.mjs')return{studyGuideCatalog};
  if(name==='@/components/study-guide-library')return{StudyGuideLibrary:Library};
  throw Error('Unexpected module '+name);
 }});return{page:exports.default,Library};
}
test('Study Guides renders only the replacement collection and does not merge legacy database rows',async()=>{
 const h=pageHarness({id:'student'}),page=await h.page(),library=page.props.children.find(child=>child.type===h.Library);assert.equal(library.props.guides,studyGuideCatalog);assert.equal(library.props.guides.length,130);
});
test('replacement Study Guides page still requires sign-in',async()=>{await assert.rejects(pageHarness(null).page(),/Redirect: \/login/)});
