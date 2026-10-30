import {notFound} from 'next/navigation';import {SectionView} from '@/components/section-view';import {createClient} from '@/lib/supabase/server';
const sections=['dashboard','question-bank','create-exam','previous-tests','ngn-case-studies','video-lessons','study-guides','flashcards','performance','account'];
export default async function Page({params}:{params:Promise<{section:string}>}){
 const {section}=await params;if(!sections.includes(section))notFound();
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 let lessons:null|unknown[]=null,guides:null|unknown[]=null,history:null|unknown[]=null;
 if(section==='video-lessons')lessons=(await db.from('lessons').select('id,title,category,description,video_url,thumbnail_url').eq('published',true).order('created_at',{ascending:false})).data;
 if(section==='study-guides')guides=(await db.from('guides').select('id,title,category,description,file_url').eq('published',true).order('created_at',{ascending:false})).data;
 if(['dashboard','previous-tests','performance'].includes(section))history=(await db.from('exam_attempts').select('id,mode,earned,possible,completed_at').eq('user_id',user!.id).not('completed_at','is',null).order('completed_at',{ascending:false}).limit(50)).data;
 return <SectionView section={section} email={user!.email??''} lessons={lessons??[]} guides={guides??[]} history={history??[]}/>;
}
