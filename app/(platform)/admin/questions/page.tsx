import {redirect} from 'next/navigation';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {QuestionStudio} from '@/components/question-studio';
export default async function QuestionStudioPage(){
 if(!await requireNgnAdmin())redirect('/dashboard');
 return <><p className="uppercase tracking-[.25em] text-xs font-bold text-mauve">The Maternity Method · Administration</p><h1 className="text-4xl mt-4 mb-3">Question Bank Studio</h1><p className="text-espresso/70 mb-7">Add visual learning and nursing tips to your existing questions.</p><QuestionStudio/></>;
}
