import {NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {studyGuideBucket} from '@/lib/study-guide-catalog.mjs';
import {maxStudyGuideArchiveBytes,readStudyGuideArchive} from '@/lib/study-guide-upload';

export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};

export async function POST(request:Request){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required.'},{status:403,headers});
 if(Number(request.headers.get('content-length'))>maxStudyGuideArchiveBytes){
  return NextResponse.json({error:'Choose a study sheet ZIP under 3 MB.'},{status:413,headers});
 }

 let sheets;
 try{
  sheets=readStudyGuideArchive(new Uint8Array(await request.arrayBuffer()));
 }catch(error){
  return NextResponse.json({
   error:error instanceof Error&&/^Choose|^Use|^The ZIP|^A PDF/.test(error.message)?error.message:'The ZIP could not be read. Download a fresh copy.',
  },{status:400,headers});
 }

 try{
  const storage=admin().storage;
  const current=await storage.getBucket(studyGuideBucket);
  if(!current.data){
   const created=await storage.createBucket(studyGuideBucket,{
    public:false,allowedMimeTypes:['application/pdf'],fileSizeLimit:2_000_000,
   });
   if(created.error)throw created.error;
  }else if(current.data.public){
   throw Error('Study sheet bucket must be private');
  }
  const bucket=storage.from(studyGuideBucket);
  for(let start=0;start<sheets.length;start+=6){
   const results=await Promise.all(sheets.slice(start,start+6).map(({name,data})=>
    bucket.upload(name,Buffer.from(data),{contentType:'application/pdf',upsert:true})));
   const failure=results.find(result=>result.error);
   if(failure)throw failure.error;
  }
  return NextResponse.json({uploaded:sheets.length},{headers});
 }catch{
  return NextResponse.json({error:'The upload could not finish. Retry with the same ZIP to finish the remaining sheets.'},{status:503,headers});
 }
}
