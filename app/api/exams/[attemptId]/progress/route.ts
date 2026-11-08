import {examDraftRequest} from '@/lib/exam-draft-server';
async function handle(request:Request,{params}:{params:Promise<{attemptId:string}>}){return examDraftRequest(request,(await params).attemptId)}
export {handle as GET,handle as POST};
