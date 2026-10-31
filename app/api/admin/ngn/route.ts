import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';

const unauthorized=()=>NextResponse.json({error:'Administrator access required'},{status:403});
const statuses=['needs_review','approved'];
const validId=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s);
export async function GET(){
 if(!await requireNgnAdmin())return unauthorized();
 const db=admin();
 const [cases,items,answers]=await Promise.all([
  db.from('ngn_cases').select('*').order('case_number'),
  db.from('ngn_items').select('*').order('item_number'),
  db.from('ngn_answers').select('item_id,case_id,answer,answer_text,rationale')
 ]);
 const error=cases.error||items.error||answers.error;
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({cases:cases.data,items:items.data,answers:answers.data},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(req:NextRequest){
 if(!await requireNgnAdmin())return unauthorized();
 const body=await req.json().catch(()=>null);
 if(!body||!validId(body.id)||!['case','item','answer'].includes(body.kind)||!body.fields||typeof body.fields!=='object'||Array.isArray(body.fields))
  return NextResponse.json({error:'Invalid edit request'},{status:400});
 const db=admin();
 const fields:Record<string,unknown>={};
 const allowed=body.kind==='case'?['title','topic','intro','tabs','review_status','published']:body.kind==='item'?['stem','item_type','content','scoring_rule','review_status','published']:['answer','answer_text','rationale'];
 for(const k of allowed)if(Object.prototype.hasOwnProperty.call(body.fields,k))fields[k]=body.fields[k];
 if(!Object.keys(fields).length)return NextResponse.json({error:'No supported changes'},{status:400});
 if('review_status'in fields&&!statuses.includes(String(fields.review_status)))return NextResponse.json({error:'Invalid review status'},{status:400});
 if('published'in fields&&typeof fields.published!=='boolean')return NextResponse.json({error:'Invalid publication status'},{status:400});
 if('tabs'in fields&&(!fields.tabs||typeof fields.tabs!=='object'||Array.isArray(fields.tabs)))return NextResponse.json({error:'Invalid chart tabs'},{status:400});
 if('content'in fields&&(!fields.content||typeof fields.content!=='object'||Array.isArray(fields.content)))return NextResponse.json({error:'Invalid item content'},{status:400});
 if('answer'in fields&&(!fields.answer||typeof fields.answer!=='object'||Array.isArray(fields.answer)))return NextResponse.json({error:'Invalid answer key'},{status:400});
 const table=body.kind==='case'?'ngn_cases':body.kind==='item'?'ngn_items':'ngn_answers';
 const column=body.kind==='answer'?'item_id':'id';
 const {data:old,error:readError}=await db.from(table).select('*').eq(column,body.id).single();
 if(readError||!old)return NextResponse.json({error:'Record not found'},{status:404});
 // A text/content change invalidates review; editing an approved record cannot silently keep it published.
 const contentKeys=body.kind==='case'?['title','topic','intro','tabs']:body.kind==='item'?['stem','item_type','content','scoring_rule']:['answer','answer_text','rationale'];
 if(contentKeys.some(k=>k in fields)){
  if(body.kind!=='answer'){fields.review_status='needs_review';fields.published=false}
  else{
   const {error:e}=await db.from('ngn_items').update({review_status:'needs_review',published:false}).eq('id',body.id);
   if(e)return NextResponse.json({error:e.message},{status:500});
   const {error:ce}=await db.from('ngn_cases').update({review_status:'needs_review',published:false}).eq('id',old.case_id);
   if(ce)return NextResponse.json({error:ce.message},{status:500});
  }
 }
 if(fields.review_status==='approved'){
  if(body.kind==='item'){
   const {data:key}=await db.from('ngn_answers').select('item_id').eq('item_id',body.id).maybeSingle();
   if(!key)return NextResponse.json({error:'Cannot approve item without answer key'},{status:400});
  }
  if(body.kind==='case'){
   const {data:list}=await db.from('ngn_items').select('id,review_status').eq('case_id',body.id);
   if(!list?.length||list.some(i=>i.review_status!=='approved'))return NextResponse.json({error:'Approve every item before approving this case'},{status:400});
  }
 }
 if(fields.published===true){
  const status=fields.review_status??old.review_status;
  if(status!=='approved')return NextResponse.json({error:'Approve this record before publishing'},{status:400});
  if(body.kind==='item'){
   const {data:parent}=await db.from('ngn_cases').select('review_status').eq('id',old.case_id).single();
   // Item publication is allowed before case approval; case remains invisible until approved and published.
  }
  if(body.kind==='case'){
   const {data:list}=await db.from('ngn_items').select('id,review_status,published').eq('case_id',body.id);
   if(!list?.length||list.some(i=>i.review_status!=='approved'||!i.published))return NextResponse.json({error:'All items must be approved and published first'},{status:400});
  }
 }
 const {data,error}=await db.from(table).update(fields).eq(column,body.id).select('*').single();
 if(error)return NextResponse.json({error:error.message},{status:500});
 // Withdrawing case approval hides it from students immediately, even if individual items remain flagged published.
 if(body.kind==='case'&&(fields.review_status==='needs_review'||fields.published===false)){
  await db.from('ngn_cases').update({published:false}).eq('id',body.id);
 }
 return NextResponse.json({record:data});
}
