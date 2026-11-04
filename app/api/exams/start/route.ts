import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {validExamId,startReviewAttempt,missingReviewFunction} from '@/lib/exam-review-server';

export async function POST(request:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await request.json().catch(()=>null);const ids=body?.questionIds;
 if(!Array.isArray(ids)||!ids.length||ids.length>50||ids.some(id=>!validExamId(id))||new Set(ids).size!==ids.length||!['study','test'].includes(body.mode))return NextResponse.json({error:'Invalid exam request'},{status:400});
 const result=await startReviewAttempt(db,ids,body.mode);
 if(!result.error)return NextResponse.json({...result.data,reviewSnapshotAvailable:true},{headers:{'Cache-Control':'no-store'}});
 if(!missingReviewFunction(result.error))return NextResponse.json({error:'This test could not be prepared. One or more questions may no longer be available.'},{status:400});
 // Compatibility until the proposed migration is explicitly approved and installed.
 const {data,error}=await db.from('questions').select('id,category,type,stem,options,matrix_rows,chart').eq('published',true).in('id',ids);
 if(error||data?.length!==ids.length)return NextResponse.json({error:'One or more questions are unavailable'},{status:400});
 const byId=new Map(data.map(question=>[question.id,question]));
 return NextResponse.json({attemptId:null,questions:ids.map(id=>byId.get(id)),reviewSnapshotAvailable:false},{headers:{'Cache-Control':'no-store'}});
}
