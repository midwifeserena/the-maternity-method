import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {validExamId} from '@/lib/exam-review-server';
import {convertNgnItem} from '@/lib/ngn-standalone.mjs';
import {questionDocument,validateQuestionDocument} from '@/lib/question-authoring.mjs';
import {categories} from '@/lib/questions';
export async function POST(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required'},{status:403});
 const body=await request.json().catch(()=>null);if(!validExamId(body?.caseId))return NextResponse.json({error:'Select a source case.'},{status:400});
 const db=admin();const [c,i,a]=await Promise.all([db.from('ngn_cases').select('*').eq('id',body.caseId).maybeSingle(),db.from('ngn_items').select('*').eq('case_id',body.caseId).order('id'),db.from('ngn_answers').select('*').eq('case_id',body.caseId).order('item_id')]);
 if(c.error||i.error||a.error)return NextResponse.json({error:'Could not read the source records. Nothing was moved.'},{status:500});
 if(!c.data||!i.data?.length)return NextResponse.json({error:'Source questions not found.'},{status:404});
 if(i.data.length===6)return NextResponse.json({error:'Six-question case studies stay in NGN Case Studies.'},{status:400});
 if(i.data.every(item=>item.qbank_question_id))return NextResponse.json({ids:i.data.map(item=>item.qbank_question_id),alreadyTransferred:true});
 if(i.data.some(item=>item.qbank_question_id))return NextResponse.json({error:'This source has already been partially transferred. No records were changed.'},{status:409});
 let documents;
 try{documents=i.data.map(item=>{const converted=convertNgnItem(c.data,item,a.data?.find(answer=>answer.item_id===item.id));const {id,...question}=converted.question;const document=questionDocument(question,converted.solution);const checked=validateQuestionDocument(document,{publish:true,categories});if(!checked.valid)throw Error(Object.values(checked.errors).join(' '));return {question:{...document.question,id},solution:document.solution}})}catch(error){return NextResponse.json({error:`Transfer blocked: ${error instanceof Error?error.message:'invalid source content'}. Nothing was moved.`},{status:400})}
 const {data,error}=await db.rpc('transfer_standalone_ngn',{p_case_id:body.caseId,p_source:{case:c.data,items:i.data,answers:a.data},p_questions:documents});
 if(error)return NextResponse.json({error:error.code==='40001'?'Source content changed. Refresh and retry; nothing was moved.':error.code==='23505'?'A matching question ID already exists. Nothing was overwritten or moved.':'Transfer could not complete. Verify the standalone NGN migration is installed. Nothing was moved.'},{status:error.code==='40001'||error.code==='23505'?409:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
