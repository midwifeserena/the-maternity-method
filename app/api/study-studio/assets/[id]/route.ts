import {admin} from '@/lib/supabase/admin';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {uuid,STUDIO_BUCKET,validAssetPath} from '@/lib/study-studio.mjs';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;if(!uuid(id))return new NextResponse('Not found',{status:404});
 const {data:asset,error}=await db.from('studio_assets').select('*').eq('id',id).eq('owner_id',user.id).maybeSingle();if(error||!asset||!validAssetPath(asset.path,user.id,id))return new NextResponse('Not found',{status:404});
 let bucket,service;try{service=admin();bucket=service.storage.from(STUDIO_BUCKET)}catch{return new NextResponse('File unavailable',{status:503})}
 const {data:file,error:downloadError}=await bucket.download(asset.path);if(downloadError||!file)return new NextResponse('File unavailable',{status:404});
 const attachment=request.nextUrl.searchParams.get('download')==='1';return new NextResponse(new Uint8Array(await file.arrayBuffer()),{headers:{'Content-Type':asset.mime,'Content-Disposition':`${attachment?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(asset.name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox; frame-ancestors 'self'"}});
}
export async function DELETE(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;if(!uuid(id))return new NextResponse('Not found',{status:404});const {data:asset}=await db.from('studio_assets').select('path').eq('id',id).eq('owner_id',user.id).maybeSingle();if(!asset||!validAssetPath(asset.path,user.id,id))return new NextResponse('Not found',{status:404});
 let bucket,service;try{service=admin();bucket=service.storage.from(STUDIO_BUCKET)}catch{return new NextResponse('File unavailable',{status:503})}
 const removed=await bucket.remove([asset.path]);if(removed.error)return NextResponse.json({error:'Could not delete file'},{status:500});const result=await service.from('studio_assets').delete().eq('id',id).eq('owner_id',user.id);return NextResponse.json(result.error?{error:'Could not remove file record'}:{deleted:true},{status:result.error?500:200});
}
