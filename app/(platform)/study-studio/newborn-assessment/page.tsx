import Link from 'next/link';
import {NewbornAssessmentPractice} from '@/components/newborn-assessment-practice';

export const metadata={title:'Newborn Assessment | The Maternity Method'};

export default function NewbornAssessmentPage(){
 return <div className="space-y-6">
  <header className="mauve-page-header">
   <p className="text-xs font-bold uppercase tracking-[0.18em]">Study Studio</p>
   <h1 className="mt-3 text-4xl sm:text-5xl">Newborn Assessment</h1>
   <p className="mt-3">Examine the baby in the warmer, then document what you see at each exam area.</p>
  </header>
  <NewbornAssessmentPractice/>
  <Link className="btn-outline inline-flex" href="/study-studio">All study tools</Link>
 </div>;
}
