import {NextRequest,NextResponse} from 'next/server';import {createClient} from '@/lib/supabase/server';import {publicSnapshot} from '@/lib/exam-review.mjs';import {resolveMediaRecords} from '@/lib/question-media-server';
import {categories} from '@/lib/questions';
export async function GET(request:NextRequest){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const category=request.nextUrl.searchParams.get('category');let query=supabase.from('questions').select('*').eq('published',true).limit(500);
 if(category&&category!=='All'){if(!categories.some(value=>value===category))return NextResponse.json({error:'Invalid category'},{status:400});query=query.eq('category',category)}
 const {data,error}=await query;if(error)return NextResponse.json({error:'Could not load questions'},{status:500});return NextResponse.json({questions:(await resolveMediaRecords(data??[])).map(publicSnapshot).filter(Boolean)},{headers:{'Cache-Control':'no-store'}})}
