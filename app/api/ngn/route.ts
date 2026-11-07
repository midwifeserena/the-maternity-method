import {scoreLegacyNgn} from '@/lib/ngn-case-scoring.mjs';
import {publicSnapshot} from '@/lib/exam-review.mjs';
import {scoreQuestion} from '@/lib/scoring.mjs';
import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';

export async function GET(request:NextRequest){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {data:cases,error}=await db.from('ngn_cases').select('id,case_number,topic,intro,tabs').eq('published',true).order('case_number');
 if(error)return NextResponse.json({error:error.message},{status:500});
 const ids=(cases??[]).map(c=>c.id);
 if(!ids.length)return NextResponse.json({cases:[],items:[]});
 const {data:items,error:itemsError}=await db.from('ngn_items').select('id,case_id,item_number,item_type,stem,content,scoring_rule').in('case_id',ids).eq('published',true).order('item_number');
 if(itemsError)return NextResponse.json({error:itemsError.message},{status:500});
 const extended=request?.nextUrl.searchParams.get('formats')==='extended-v1';
 const blockedCases=new Set((items??[]).filter(i=>(i.content as any)?.question).map(i=>i.case_id));
 const visibleItems=extended?(items??[]):(items??[]).filter(i=>!blockedCases.has(i.case_id));
 const visibleCases=(cases??[]).filter(c=>visibleItems.some(i=>i.case_id===c.id));
 return NextResponse.json({cases:visibleCases,items:visibleItems.map(i=>(i.content as any)?.question?{...i,content:{format_version:2,question:publicSnapshot((i.content as any).question)}}:i)},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:NextRequest){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const payload=await request.json().catch(()=>null);
 if(!payload||typeof payload.caseId!=='string'||!payload.responses||typeof payload.responses!=='object'||Array.isArray(payload.responses))
  return NextResponse.json({error:'Invalid submission'},{status:400});
 const {data:one}=await db.from('ngn_cases').select('id').eq('id',payload.caseId).eq('published',true).maybeSingle();
 if(!one)return NextResponse.json({error:'Case unavailable'},{status:404});
 const {data:items,error}=await db.from('ngn_items').select('id,item_number,content').eq('case_id',one.id).eq('published',true).order('item_number');
 if(error)return NextResponse.json({error:error.message},{status:500});
 if(!items?.length||items.some(i=>!(i.id in payload.responses)))return NextResponse.json({error:'Answer each item before submitting'},{status:400});
 const ids=items.map(i=>i.id);
 const {data:keys,error:keyError}=await admin().from('ngn_answers').select('item_id,answer,answer_text,rationale').eq('case_id',one.id).in('item_id',ids);
 if(keyError||keys?.length!==ids.length)return NextResponse.json({error:'Answer keys are not ready for this case'},{status:503});
 const byId=new Map(keys!.map(k=>[k.item_id,k]));
 let earned=0,possible=0;
 let results;try{results=items.map(i=>{
  const key=byId.get(i.id)!;
  const canonical=(i.content as any)?.question;
  const p=canonical?scoreQuestion({...canonical,answer_key:(key.answer as any).answer_key},payload.responses[i.id]?.response):scoreLegacyNgn(key.answer as Record<string,unknown>,payload.responses[i.id] as Record<string,unknown>);
  earned+=p.earned;possible+=p.possible;
  return {itemId:i.id,...p,answer:key.answer,answerText:key.answer_text,rationale:key.rationale};
 })}catch{return NextResponse.json({error:'Question scoring configuration is unavailable. Nothing was submitted.'},{status:503})}
 return NextResponse.json({earned,possible,results},{headers:{'Cache-Control':'no-store'}});
}
