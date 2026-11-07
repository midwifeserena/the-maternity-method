import {admin} from '@/lib/supabase/admin';
import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {STUDIO_BUCKET,MAX_UPLOAD_BYTES,detectStudioUpload} from '@/lib/study-studio.mjs';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
 const items:any[]=[];for(let start=0;;start+=100){const {data,error}=await db.from('studio_assets').select('id,name,mime,size,created_at').eq('owner_id',user.id).order('created_at',{ascending:false}).order('id').range(start,start+99);if(error)return reply({error:'Personal uploads need the Study Studio database and private storage setup.'},503);items.push(...data??[]);if((data?.length??0)<100)break;}return reply({items});
}
export async function POST(request:NextRequest){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
 const form=await request.formData().catch(()=>null),file=form?.get('file');if(!(file instanceof File)||file.size<1||file.size>MAX_UPLOAD_BYTES)return reply({error:'Choose a PDF, PNG, JPG, WebP or UTF-8 text file, up to 3 MB.'},400);
 let bucket,service;try{service=admin();bucket=service.storage.from(STUDIO_BUCKET)}catch{return reply({error:'Private uploads are temporarily unavailable.'},503)}
 const bytes=new Uint8Array(await file.arrayBuffer()),format=detectStudioUpload(bytes,file.type);if(!format)return reply({error:'This file type is not supported or does not match its contents.'},400);
 const id=randomUUID(),path=`${user.id}/${id}.${format.extension}`,name=file.name.replace(/[\r\n\x00-\x1f]/g,'').slice(0,180)||'Study upload';
 const {error:reserved}=await db.from('studio_assets').insert({id,owner_id:user.id,path,name,mime:format.mime,size:file.size});if(reserved)return reply({error:reserved.code==='23514'?'Your personal upload allowance is full (50 MB). Remove unused files before adding more.':'Your private upload workspace is not available yet. Check the Study Studio setup.'},503);
 const {error}=await bucket.upload(path,bytes,{contentType:format.mime,upsert:false});if(error){const cleanup=await bucket.remove([path]);if(!cleanup.error)await service.from('studio_assets').delete().eq('id',id).eq('owner_id',user.id);return reply({error:'Could not upload this file. Please try again.'},503);}return reply({item:{id,name,mime:format.mime,size:file.size}});
}
