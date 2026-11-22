import {DraftBankImport} from '@/components/draft-bank-import';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {QuestionStudio} from '@/components/question-studio';
export default async function QuestionStudioPage(){return <>{await requireNgnAdmin()&&<DraftBankImport/>}<QuestionStudio/></>}
