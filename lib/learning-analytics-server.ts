import {buildLearningAnalytics} from '@/lib/learning-analytics.mjs';
import {completeExamCases} from '@/lib/case-exam.mjs';
import {missingReviewTable,type UserDatabase} from '@/lib/exam-review-server';
// All reads use the authenticated client and retain RLS. Never select answer keys.
async function pages(query:any){const rows:any[]=[];for(let start=0;;start+=500){const {data,error}=await query.range(start,start+499);if(error)throw error;rows.push(...data??[]);if((data?.length??0)<500)return rows;}}
export async function loadLearningAnalytics(db:UserDatabase,userId:string){
 const warnings:string[]=[];
 const [attempts,questions]=await Promise.all([
  pages(db.from('exam_attempts').select('*').eq('user_id',userId).order('created_at').order('id')),
  pages(db.from('questions').select('id,category,type').eq('published',true).order('id'))
 ]);
 const bank=questions.map(q=>({key:'question:'+q.id,category:q.category,type:q.type}));
 try{
  const cases=await pages(db.from('ngn_cases').select('id,topic').eq('published',true).order('id'));
  const items:any[]=[];for(let start=0;start<cases.length;start+=100)items.push(...await pages(db.from('ngn_items').select('id,case_id,item_number').in('case_id',cases.slice(start,start+100).map(c=>c.id)).eq('published',true).order('id')));
  const complete=new Set(completeExamCases(cases,items).map(c=>c.id)),topics=new Map(cases.map(c=>[c.id,c.topic]));
  for(const i of items)if(complete.has(i.case_id))bank.push({key:'case:'+i.id,category:topics.get(i.case_id),type:'NGN case study'});
 }catch(error){if(!missingReviewTable(error as any))throw error;warnings.push('Case-library counts are unavailable until the NGN setup is installed.');}
 const ids=attempts.filter(a=>a.completed_at).map(a=>a.id),responses:any[]=[],snapshots:any[]=[];
 for(let start=0;start<ids.length;start+=100){
  const batch=ids.slice(start,start+100);
  for(const table of ['exam_responses','exam_case_responses']){
   try{const rows=await pages(db.from(table).select('id,attempt_id,question_id,response,earned,possible').eq('user_id',userId).in('attempt_id',batch).order('id'));responses.push(...rows.map(r=>({...r,source_kind:table==='exam_case_responses'?'ngn_case':'question'})));}
   catch(error){if(table!=='exam_case_responses'||!missingReviewTable(error as any))throw error;}
  }
  try{
   const rows=await pages(db.from('exam_review_items').select('attempt_id,question_id,question_snapshot').in('attempt_id',batch).order('attempt_id').order('position'));
   for(const row of rows){const q=row.question_snapshot??{};snapshots.push({attempt_id:row.attempt_id,question_id:row.question_id,category:q.category,type:q.type,ngn_format:q.ngn_format,case_context:q.case_context});}
  }catch(error){if(!missingReviewTable(error as any))throw error;warnings.push('Some older exams have no archived subject or format details.');}
 }
 return {...buildLearningAnalytics({attempts,responses,snapshots,bank}),warnings:[...new Set(warnings)]};
}
