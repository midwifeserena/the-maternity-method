import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';

export async function GET(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {data:cases,error}=await db.from('ngn_cases').select('id,case_number,topic,title,intro,tabs').eq('published',true).order('case_number');
 if(error)return NextResponse.json({error:error.message},{status:500});
 const ids=(cases??[]).map(c=>c.id);
 if(!ids.length)return NextResponse.json({cases:[],items:[]});
 const {data:items,error:itemsError}=await db.from('ngn_items').select('id,case_id,item_number,item_type,stem,content,scoring_rule').in('case_id',ids).eq('published',true).order('item_number');
 if(itemsError)return NextResponse.json({error:itemsError.message},{status:500});
 return NextResponse.json({cases,items:items??[]},{headers:{'Cache-Control':'no-store'}});
}

function points(expected:Record<string,unknown>,given:Record<string,unknown>){
 let earned=0,possible=0;
 const check=(a:unknown,b:unknown)=>{possible++;if(JSON.stringify(a)===JSON.stringify(b))earned++};
 if(Array.isArray(expected.correct)){
  const right=new Set(expected.correct as string[]);
  const got=new Set(Array.isArray(given.correct)?given.correct as string[]:[]);
  // NCLEX +/- credit: correct selections minus incorrect selections, floor at zero.
  possible=right.size;
  earned=Math.max(0,[...got].filter(v=>right.has(v)).length-[...got].filter(v=>!right.has(v)).length);
 }else if(Array.isArray(expected.highlight_segments)){
  const right=new Set((expected.highlight_segments as number[]).map(String));
  const got=new Set((Array.isArray(given.highlight_segments)?given.highlight_segments:[]).map(String));
  possible=right.size;earned=Math.max(0,[...got].filter(v=>right.has(v)).length-[...got].filter(v=>!right.has(v)).length);
 }else if(Array.isArray(expected.rows)){
  const rows=expected.rows as unknown[];const answers=Array.isArray(given.rows)?given.rows:[];
  rows.forEach((r,i)=>{const clean=(v:unknown)=>Array.isArray(v)?[...v].sort():[];check(clean(r),clean(answers[i]))});
 }else if(Array.isArray(expected.blanks)){
  const answers=Array.isArray(given.blanks)?given.blanks:[];
  expected.blanks.forEach((v,i)=>check(v,answers[i]));
 }else{
  for(const key of ['actions_to_take','potential_conditions','parameters_to_monitor']){
   const right=Array.isArray(expected[key])?(expected[key] as string[]):[];
   const got=Array.isArray(given[key])?(given[key] as string[]):[];
   if(right.length){possible+=right.length;earned+=Math.max(0,got.filter(v=>right.includes(v)).length-got.filter(v=>!right.includes(v)).length)}
  }
 }
 return {earned,possible};
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
 const {data:items,error}=await db.from('ngn_items').select('id,item_number').eq('case_id',one.id).eq('published',true).order('item_number');
 if(error)return NextResponse.json({error:error.message},{status:500});
 if(!items?.length||items.some(i=>!(i.id in payload.responses)))return NextResponse.json({error:'Answer each item before submitting'},{status:400});
 const ids=items.map(i=>i.id);
 const {data:keys,error:keyError}=await admin().from('ngn_answers').select('item_id,answer,answer_text,rationale').eq('case_id',one.id).in('item_id',ids);
 if(keyError||keys?.length!==ids.length)return NextResponse.json({error:'Answer keys are not ready for this case'},{status:503});
 const byId=new Map(keys!.map(k=>[k.item_id,k]));
 let earned=0,possible=0;
 const results=items.map(i=>{
  const key=byId.get(i.id)!;
  const p=points(key.answer as Record<string,unknown>,payload.responses[i.id] as Record<string,unknown>);
  earned+=p.earned;possible+=p.possible;
  return {itemId:i.id,...p,answer:key.answer,answerText:key.answer_text,rationale:key.rationale};
 });
 return NextResponse.json({earned,possible,results},{headers:{'Cache-Control':'no-store'}});
}
