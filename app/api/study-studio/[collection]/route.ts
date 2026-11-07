import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {uuid,validateStudioRecord} from '@/lib/study-studio.mjs';
const tables:Record<string,string>={notes:'studio_notes',flashcards:'studio_flashcards'};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(_request:NextRequest,{params}:{params:Promise<{collection:string}>}){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
 const {collection}=await params,table=tables[collection];if(!table)return reply({error:'Not found'},404);
 const rows:Record<string,unknown>[]=[];for(let start=0;;start+=100){const {data,error}=await db.from(table).select('*').eq('owner_id',user.id).order('updated_at',{ascending:false}).order('id').range(start,start+99);if(error)return reply({error:'Your Study Studio needs its database setup before personal content can be saved.'},503);rows.push(...data??[]);if((data?.length??0)<100)break;}
 return reply({items:rows});
}
export async function POST(request:NextRequest,{params}:{params:Promise<{collection:string}>}){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
 const {collection}=await params,table=tables[collection];if(!table)return reply({error:'Not found'},404);
 const body=await request.json().catch(()=>null);if(!body||!validateStudioRecord(collection,body))return reply({error:'Check the title and content. Notebook limits are 100 pages and 500 elements per page.'},400);
 const values=collection==='notes'?{title:body.title.trim(),kind:body.kind,content:body.content}:{topic:body.topic.trim(),front:body.front.trim(),back:body.back.trim(),high_yield:body.high_yield};
 let query;if(body.id){if(!uuid(body.id)||!Number.isInteger(body.revision)||body.revision<1)return reply({error:'Invalid saved item'},400);query=db.from(table).update({...values,revision:body.revision+1,updated_at:new Date().toISOString()}).eq('id',body.id).eq('owner_id',user.id).eq('revision',body.revision);}
 else query=db.from(table).insert({...values,owner_id:user.id});
 const {data,error}=await query.select('*').maybeSingle();if(error)return reply({error:'Could not save your personal content. Please check the Study Studio setup.'},503);if(!data)return reply({error:'This item changed in another tab. Reload the saved copy or save your work as a new item.'},409);
 return reply({item:data});
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{collection:string}>}){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Sign in required'},401);
 const {collection}=await params,table=tables[collection],id=request.nextUrl.searchParams.get('id');if(!table||!uuid(id))return reply({error:'Invalid item'},400);
 const {data,error}=await db.from(table).delete().eq('id',id).eq('owner_id',user.id).select('id');if(error)return reply({error:'Could not delete item'},500);if(!data?.length)return reply({error:'Item not found'},404);return reply({deleted:true});
}
