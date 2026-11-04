import {matrixDefinition} from '@/lib/matrix-authoring.mjs';
import {categories} from '@/lib/questions';
import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {validExamId} from '@/lib/exam-review-server';
import {educationPatch} from '@/lib/question-education.mjs';
import {resolveMediaRecords} from '@/lib/question-media-server';
const deny=()=>NextResponse.json({error:'Administrator access required'},{status:403});
export async function GET(request:NextRequest){
 if(!await requireNgnAdmin())return deny();
 const db=admin(),id=request.nextUrl.searchParams.get('id');
 if(id){
  if(!validExamId(id))return NextResponse.json({error:'Invalid question ID'},{status:400});
  const [question,solution]=await Promise.all([db.from('questions').select('*').eq('id',id).maybeSingle(),db.from('question_solutions').select('*').eq('question_id',id).maybeSingle()]);
  if(question.error||solution.error)return NextResponse.json({error:'Could not load question.'},{status:500});
  if(!question.data)return NextResponse.json({error:'Question not found.'},{status:404});
  const savedSolution=solution.data??{question_id:id,answer_key:null,rationale:''};
  const [previewQuestion,previewSolution]=await resolveMediaRecords([question.data,savedSolution]);
  return NextResponse.json({question:question.data,solution:savedSolution,previewQuestion,previewSolution},{headers:{'Cache-Control':'no-store'}});
 }
 const offset=Number(request.nextUrl.searchParams.get('offset')??0),search=(request.nextUrl.searchParams.get('search')??'').trim().slice(0,200);
 if(!Number.isSafeInteger(offset)||offset<0)return NextResponse.json({error:'Invalid page'},{status:400});
 let query=db.from('questions').select('id,stem,category,type,published').order('created_at',{ascending:false}).order('id').range(offset,offset+25);
 if(search)query=query.ilike('stem','%'+search.replace(/[\\%_]/g,'\\$&')+'%');
 const {data,error}=await query;
 if(error)return NextResponse.json({error:'Could not load question bank.'},{status:500});
 return NextResponse.json({questions:(data??[]).slice(0,25),hasMore:(data?.length??0)>25,nextOffset:offset+25},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request:NextRequest){
 if(!await requireNgnAdmin())return deny();
 const body=await request.json().catch(()=>null);
 if(!validExamId(body?.id))return NextResponse.json({error:'Invalid question ID'},{status:400});
 if(Object.hasOwn(body,'matrix')||Object.hasOwn(body,'matrixAction')){if(body.fields)return NextResponse.json({error:'Save matrix content and education separately.'},{status:400});return editMatrix(body)}
 let patch;try{patch=educationPatch(body.fields)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid edit'},{status:400})}
 const db=admin();
 const [question,solution]=await Promise.all([db.from('questions').select('*').eq('id',body.id).maybeSingle(),db.from('question_solutions').select('*').eq('question_id',body.id).maybeSingle()]);
 if(question.error||solution.error)return NextResponse.json({error:'Could not verify the question.'},{status:500});
 if(!question.data||!solution.data)return NextResponse.json({error:'Question or solution not found.'},{status:404});
 for(const [record,fields,prefix] of [[question.data,patch.question,'question'],[solution.data,patch.solution,'rationale']] as const){
  const merged={...record,...fields};
  if(merged[prefix+'_image_url']&&!String(merged[prefix+'_image_alt']??'').trim())return NextResponse.json({error:'Add descriptive alt text for each image.'},{status:400});
 }
 const {error}=await db.rpc('edit_question_education',{p_question_id:body.id,p_question:patch.question,p_solution:patch.solution});
 if(error)return NextResponse.json({error:'Could not save education fields. Check the question education migration is installed.'},{status:500});
 return NextResponse.json({saved:true},{headers:{'Cache-Control':'no-store'}});
}

async function editMatrix(body:{id:string;matrix?:unknown;matrixAction?:string}){
 const db=admin();
 const [question,solution]=await Promise.all([db.from('questions').select('*').eq('id',body.id).maybeSingle(),db.from('question_solutions').select('*').eq('question_id',body.id).maybeSingle()]);
 if(question.error||solution.error)return NextResponse.json({error:'Could not load matrix.'},{status:500});
 if(question.data?.type!=='matrix'||!solution.data)return NextResponse.json({error:'Matrix question not found.'},{status:404});
 let patch;
 try{
  if(body.matrixAction){
   if(!['publish','unpublish'].includes(body.matrixAction)||body.matrix)throw Error('Invalid publication action.');
   if(body.matrixAction==='publish'&&question.data.archived_at)return NextResponse.json({error:'Restore the question before publishing.'},{status:409});
   if(body.matrixAction==='publish')matrixDefinition({stem:question.data.stem,options:question.data.options,matrix_rows:question.data.matrix_rows,matrix_mode:question.data.matrix_mode??'single',answer_key:solution.data.answer_key,rationale:solution.data.rationale,row_explanations:solution.data.row_explanations??{}});
   patch={question:{published:body.matrixAction==='publish'},solution:{}};
  }else patch=matrixDefinition(body.matrix);
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid matrix'},{status:400})}
 const {error}=await db.rpc('edit_matrix_question',{p_question_id:body.id,p_question:patch.question,p_solution:patch.solution});
 if(error)return NextResponse.json({error:'Could not save matrix. Check the matrix migration is installed.'},{status:500});
 return NextResponse.json({saved:true,published:patch.question.published},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
 if(!await requireNgnAdmin())return deny();
 const body=await request.json().catch(()=>null);
 if(!body||!categories.some(category=>category===body.category))return NextResponse.json({error:'Choose a supported category.'},{status:400});
 let patch;try{patch=matrixDefinition(body.matrix)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid matrix'},{status:400})}
 const {data,error}=await admin().rpc('create_matrix_question',{p_category:body.category,p_question:patch.question,p_solution:patch.solution});
 if(error)return NextResponse.json({error:'Could not create matrix. Check the matrix migration is installed.'},{status:500});
 return NextResponse.json({id:data,published:false},{status:201,headers:{'Cache-Control':'no-store'}});
}
