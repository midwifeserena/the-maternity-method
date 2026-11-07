import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {loadLearningAnalytics} from '@/lib/learning-analytics-server';
export async function GET(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in to view your learning statistics.'},{status:401});
 try{return NextResponse.json(await loadLearningAnalytics(db,user.id),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'Your statistics could not be loaded. Your saved exams and scores are unchanged.'},{status:500,headers:{'Cache-Control':'private, no-store'}});}
}
