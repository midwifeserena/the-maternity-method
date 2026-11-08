import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
import {VideoLessonWorkspace} from '@/components/video-lesson-workspace';
export default async function VideoLessons(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data,error}=await db.from('lessons').select('*').eq('published',true).order('created_at',{ascending:false});
 return <VideoLessonWorkspace key={user.id} owner={user.id} lessons={data??[]} error={error?'Your published lessons could not be loaded. Please refresh and try again.':''}/>;
}
