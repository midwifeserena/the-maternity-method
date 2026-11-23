import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {admin} from '@/lib/supabase/admin';
import {studyGuideBucket,studyGuideCatalog} from '@/lib/study-guide-catalog.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'private, no-store'};

export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401,headers:privateHeaders});

 const {slug}=await params;
 const guide=studyGuideCatalog.find(item=>item.slug===slug);
 if(!guide)return NextResponse.json({error:'Study sheet not found'},{status:404,headers:privateHeaders});

 try{
  const {data:file,error}=await admin().storage.from(studyGuideBucket).download(guide.filename);
  if(error||!file)throw Error('Study sheet unavailable');
  const disposition=request.nextUrl.searchParams.get('download')==='1'?'attachment':'inline';
  const filename=guide.download_filename;
  const safeName=filename.replace(/[^ -~]|["\\]/g,'_');
  const encodedName=encodeURIComponent(filename).replace(/['()*]/g,character=>
   '%'+character.charCodeAt(0).toString(16).toUpperCase());
  const contentDisposition=`${disposition}; filename="${safeName}"`+
   (safeName===filename?'':`; filename*=UTF-8''${encodedName}`);
  return new NextResponse(file,{headers:{
   ...privateHeaders,
   'Content-Type':'application/pdf',
   'Content-Disposition':contentDisposition,
   'Content-Length':String(file.size),
   'X-Content-Type-Options':'nosniff',
  }});
 }catch{
  return NextResponse.json({error:'This study sheet is not available yet.'},{status:503,headers:privateHeaders});
 }
}
