import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {existingQuestionLibrary} from '@/lib/question-library-server';
import {categories} from '@/lib/questions';
export async function GET(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required'},{status:403});
 const params=request.nextUrl.searchParams,offset=Number(params.get('offset')??0),search=(params.get('search')??'').trim();
 const category=params.get('category')||null,type=params.get('type')||null,status=params.get('status')||'active',difficulty=params.get('difficulty')||null;
 if(!Number.isSafeInteger(offset)||offset<0||search.length>200||(category&&!categories.some(value=>value===category))||(type&&!['single','sata','matrix-single','matrix-multiple','ngn','bowtie','highlight','cloze','drag-cloze','drag-select','calculation','ordered','dyad-cloze'].includes(type))||!['all','active','draft','published','archived'].includes(status)||(difficulty&&!['easy','medium','hard','unset'].includes(difficulty)))return NextResponse.json({error:'Invalid library filters.'},{status:400});
 let db:ReturnType<typeof admin>;
 try{db=admin()}catch{return NextResponse.json({error:'The server connection for Question Studio is not configured on this deployment. Check its Supabase connection and server-only access key in Vercel. Existing question records have not been changed.'},{status:503})}
 const {data,error}=await db.rpc('admin_question_library',{p_search:search,p_category:category,p_type:type,p_status:status,p_difficulty:difficulty,p_offset:offset,p_limit:25});
 const valid=data&&Array.isArray(data.questions)&&typeof data.total==='number'&&data.counts&&['all','published','draft','archived'].every(key=>typeof data.counts[key]==='number');
 let reason=error?(error.code||'LIBRARY_ERROR'):!valid?'INVALID_LIBRARY_RESPONSE':null;
 // An empty function result must not hide rows that are present in the bank.
 if(!reason&&data.total===0&&data.counts.all===0&&!search&&!category&&!type&&!difficulty&&['all','active'].includes(status)){
  const check=await db.from('questions').select('id',{count:'exact',head:true});
  if(check.error)return NextResponse.json({error:'Could not verify the question bank connection. Please retry.'},{status:503});
  if((check.count??0)>0)reason='INVALID_LIBRARY_RESPONSE';
 }
 if(reason){
  if(['PGRST202','42883','42703','PGRST204','INVALID_LIBRARY_RESPONSE'].includes(reason)){
   const existing=await existingQuestionLibrary(db,{search,category,type,status,difficulty,offset});
   if(existing.data)return NextResponse.json(existing.data,{headers:{'Cache-Control':'no-store'}});
  }
  return NextResponse.json({error:'The question library could not be loaded. This does not mean your questions are missing. Verify this deployment is connected to the Supabase project containing your question bank, then retry.'},{status:503});
 }
 return NextResponse.json({...data,managementReady:true,filtersReady:{difficulty:true}},{headers:{'Cache-Control':'no-store'}});
}
