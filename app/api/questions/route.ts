import {NextRequest,NextResponse} from 'next/server';import {createClient} from '@/lib/supabase/server';import {publicQuestion} from '@/lib/scoring.mjs';
export async function GET(request:NextRequest){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const category=request.nextUrl.searchParams.get('category');let query=supabase.from('questions').select('id,category,type,stem,options,matrix_rows,chart').eq('published',true).limit(50);
 if(category&&category!=='All'){if(!['Antepartum','Intrapartum','Postpartum','Newborn'].includes(category))return NextResponse.json({error:'Invalid category'},{status:400});query=query.eq('category',category)}
 const {data,error}=await query;if(error)return NextResponse.json({error:'Could not load questions'},{status:500});return NextResponse.json({questions:(data??[]).map(publicQuestion)},{headers:{'Cache-Control':'no-store'}})}
