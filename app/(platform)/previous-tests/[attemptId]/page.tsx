import {ExamReview} from '@/components/exam-review';
export default async function ReviewPage({params}:{params:Promise<{attemptId:string}>}){const {attemptId}=await params;return <ExamReview attemptId={attemptId}/>}
