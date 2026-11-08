import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {validExamId,missingReviewTable,missingReviewFunction} from '@/lib/exam-review-server';
import {validateLessonProgress} from '@/lib/video-lessons.mjs';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Unauthorized'},401);const {data,error}=await db.from('lesson_progress').select('lesson_id,notes,completed,position,duration,revision,updated_at').eq('user_id',user.id);if(error)return reply({error:missingReviewTable(error)?'Notes and completion tracking are not available yet. You can still watch lessons.':'Could not load your lesson notes and progress. Please reload before making changes.'},503);return reply({items:data??[]});}
export async function POST(request:Request){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return reply({error:'Unauthorized'},401);const body=await request.json().catch(()=>null);if(!validExamId(body?.lessonId))return reply({error:'Invalid lesson'},400);
 let state;try{state=validateLessonProgress(body)}catch{return reply({error:'Invalid notes or progress'},400)}
 const {data:lesson,error:lessonError}=await db.from('lessons').select('id').eq('id',body.lessonId).eq('published',true).maybeSingle();if(lessonError)return reply({error:'Could not verify this lesson.'},500);if(!lesson)return reply({error:'Lesson unavailable'},404);
 const {data,error}=await db.rpc('save_lesson_progress',{p_lesson_id:body.lessonId,p_revision:body.revision,p_notes:state.notes,p_completed:state.completed,p_position:state.position,p_duration:state.duration});
 if(error)return reply({error:missingReviewFunction(error)?'Notes and completion tracking are not available yet. You can still watch lessons.':error.code==='40001'?'This lesson changed in another window. Copy your notes, then reload to avoid overwriting them.':'Could not save this lesson. Your notes are still here; please try again.'},error.code==='40001'?409:503);
 return reply({item:data});
}
