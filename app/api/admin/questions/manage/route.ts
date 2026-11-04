import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {validExamId} from '@/lib/exam-review-server';
import {categories} from '@/lib/questions';
import {questionDocument,validateQuestionDocument} from '@/lib/question-authoring.mjs';
export async function POST(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required'},{status:403});
 const body=await request.json().catch(()=>null),action=body?.action;
 if(!body||!['create','save','publish','duplicate','archive','restore'].includes(action)||!validExamId(body.id)||(!Number.isSafeInteger(body.revision)||body.revision<0))return NextResponse.json({error:'Invalid question action.'},{status:400});
 const db=admin();let question={},solution={};
 if(['create','save'].includes(action)){
  let allowed:readonly string[]=categories;
  if(action==='save'){const existing=await db.from('questions').select('category').eq('id',body.id).maybeSingle();if(existing.error)return NextResponse.json({error:'Could not verify the existing question.'},{status:500});if(existing.data)allowed=[...categories,existing.data.category];}
  const checked=validateQuestionDocument(body.document,{categories:allowed});
  if(!checked.valid)return NextResponse.json({error:'Please review the highlighted fields.',fields:checked.errors},{status:400});
  question=body.document.question;solution=body.document.solution;
 }
 if(action==='publish'){
  const [q,s]=await Promise.all([db.from('questions').select('*').eq('id',body.id).maybeSingle(),db.from('question_solutions').select('*').eq('question_id',body.id).maybeSingle()]);
  if(q.error||s.error)return NextResponse.json({error:'Could not verify the saved question.'},{status:500});
  if(!q.data)return NextResponse.json({error:'Question not found.'},{status:404});
  if(q.data.archived_at)return NextResponse.json({error:'Restore the question to a draft before publishing.'},{status:409});
  const checked=validateQuestionDocument(questionDocument(q.data,s.data??{}),{publish:true,categories:[...categories,q.data.category]});
  if(!checked.valid)return NextResponse.json({error:'Finish the required fields before publishing.',fields:checked.errors},{status:400});
 }
 const {data,error}=await db.rpc('manage_question_studio',{p_action:action,p_id:body.id,p_question:question,p_solution:solution,p_expected_revision:body.revision});
 if(error){
  const status=error.code==='40001'?409:error.code==='23505'?409:error.code==='P0002'?404:500;
  const message=error.code==='40001'?'This question changed elsewhere. Reload it before saving to avoid overwriting newer work.':error.code==='23505'?'A question with this ID already exists. Reload before creating another.':error.code==='P0002'?'Question not found.':error.code==='55000'?'Restore the archived question before editing or publishing.':'Could not save this action. Verify the Question Studio migration is installed and retry.';
  return NextResponse.json({error:message},{status});
 }
 return NextResponse.json(data,{status:action==='create'||action==='duplicate'?201:200,headers:{'Cache-Control':'no-store'}});
}
