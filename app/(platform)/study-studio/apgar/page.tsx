import Link from 'next/link';
import {ApgarPractice} from '@/components/apgar-practice';

export const metadata={title:'Apgar Simulator | The Maternity Method'};

export default function ApgarPage(){
 return <div className="space-y-6">
  <header className="mauve-page-header">
   <p className="text-xs font-bold uppercase tracking-[0.18em]">Study Studio</p>
   <h1 className="mt-3 text-4xl sm:text-5xl">Apgar Simulator</h1>
   <p className="mt-3">Practice scoring a newborn at 1 and 5 minutes. Answers and scores aren’t saved.</p>
  </header>
  <ApgarPractice/>
  <Link className="btn-outline inline-flex" href="/study-studio">All study tools</Link>
 </div>;
}
