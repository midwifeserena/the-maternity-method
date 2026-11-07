import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {studyGuideCatalog} from '@/lib/study-guide-catalog.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401,headers:{'Cache-Control':'private, no-store'}});
 const {slug}=await params;
 const guide=studyGuideCatalog.find(item=>item.slug===slug);
 if(!guide)return NextResponse.json({error:'Study guide not found'},{status:404,headers:{'Cache-Control':'private, no-store'}});
 try{
  // Filename comes exclusively from the bundled allowlist, never from a request path.
  const file=await readFile(path.join(process.cwd(),'content','study-guides',guide.filename));
  const disposition=request.nextUrl.searchParams.get('download')==='1'?'attachment':'inline';
  return new NextResponse(new Uint8Array(file),{headers:{'Content-Type':'application/pdf','Content-Disposition':`${disposition}; filename="${guide.filename}"`,'Content-Length':String(file.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{
  return NextResponse.json({error:'This study guide is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
 }
}
