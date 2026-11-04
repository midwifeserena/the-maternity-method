import {notFound} from 'next/navigation';
import {validExamId} from '@/lib/exam-review-server';
import {QuestionEditor} from '@/components/question-editor';
export default async function EditQuestionPage({params,searchParams}:{params:Promise<{questionId:string}>;searchParams:Promise<{tab?:string}>}){const {questionId}=await params;if(!validExamId(questionId))notFound();const query=await searchParams;return <QuestionEditor questionId={questionId} initialTab={query.tab==='preview'?'preview':'question'}/>}
