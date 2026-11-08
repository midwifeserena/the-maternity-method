import {Exam} from '@/components/exam';
export default async function ResumeExam({params}:{params:Promise<{attemptId:string}>}){return <Exam resumeAttemptId={(await params).attemptId}/>}
