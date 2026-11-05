import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {publicSnapshot} from '@/lib/exam-review.mjs';
import {resolveMediaRecords} from '@/lib/question-media-server';
import {categories} from '@/lib/questions';
export async function GET(request:NextRequest){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const category=request.nextUrl.searchParams.get('category');
 let query=supabase.from('questions').select('*').eq('published',true).order('created_at',{ascending:false}).order('id');
 if(category&&category!=='All'){
  if(!categories.some(value=>value===category))return NextResponse.json({error:'Invalid category'},{status:400});
  query=query.eq('category',category);
 }
 // Stable pages include newly transferred items even in banks over 500 rows.
 const data:Record<string,unknown>[]=[];
 for(let offset=0;;offset+=500){
  const page=await query.range(offset,offset+499);
  if(page.error)return NextResponse.json({error:'Could not load questions'},{status:500});
  data.push(...(page.data??[]));if((page.data?.length??0)<500)break;
 }
 return NextResponse.json({questions:(await resolveMediaRecords(data)).map(publicSnapshot).filter(Boolean)},{headers:{'Cache-Control':'no-store'}});
}
