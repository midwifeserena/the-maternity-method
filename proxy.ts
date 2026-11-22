import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

const publicPages=new Set(['','/launch','/login','/reset-password','/enrollment-closed','/auth/callback']);
const protectedSections=new Set([
 'dashboard','question-bank','create-exam','previous-tests','ngn-case-studies',
 'pediatrics','video-lessons','study-guides','flashcards','performance','account','study-studio','admin',
]);

export async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname.replace(/\/+$/,'');
 // The public launch page never needs a Supabase session refresh.
 if(path==='/launch')return NextResponse.next({request});
 const section=path.split('/')[1];
 const protect=process.env.COURSE_ACCESS_GATE==='1'&&!publicPages.has(path)&&(section==='api'||protectedSections.has(section));
 const failure=(location:string,status:number,message:string)=>{
  const denied=section==='api'||status===503
   ?NextResponse.json({error:message},{status})
   :NextResponse.redirect(new URL(location,request.url));
  denied.headers.set('Cache-Control','private, no-store');
  return denied;
 };
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return protect?failure('/enrollment-closed',503,'Course access is temporarily unavailable.'):NextResponse.next({request});
 let response=NextResponse.next({request});
 const supabase=createServerClient(url,key,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(items){
    items.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   },
  },
 });
 if(!protect){
  await supabase.auth.getClaims();
  return response;
 }

 let denied:NextResponse;
 try{
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(!user){
   denied=authError?.name==='AuthRetryableFetchError'
    ?failure('/enrollment-closed',503,'Course access is temporarily unavailable.')
    :failure('/login',401,'Sign in required.');
  }else{
   const {data,error}=await supabase.rpc('has_course_access');
   if(!error&&data===true)return response;
   denied=error||typeof data!=='boolean'
    ?failure('/enrollment-closed',503,'Course access is temporarily unavailable.')
    :failure('/enrollment-closed',403,'Course access is limited to invited testers.');
  }
 }catch{
  denied=failure('/enrollment-closed',503,'Course access is temporarily unavailable.');
 }
 for(const cookie of response.cookies.getAll())denied.cookies.set(cookie);
 return denied;
}

export const config={matcher:['/api/:path*','/study-studio/:path*','/previous-tests/:path*','/admin/:path*','/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)']};
