import Link from 'next/link';
import {ExternalLink} from 'lucide-react';
import {FetalTracingPractice} from '@/components/fetal-tracing-practice';

export const metadata={title:'Fetal Tracing | The Maternity Method'};

export default function FetalTracingPage(){
 return <div className="space-y-6">
  <header className="mauve-page-header">
   <p className="text-xs font-bold uppercase tracking-[0.18em]">Study Studio</p>
   <h1 className="mt-3 text-4xl sm:text-5xl">Fetal Tracing</h1>
   <p className="mt-3">Start the monitor and practice interpreting simulated fetal strips. Answers and scores aren’t saved.</p>
  </header>
  <FetalTracingPractice/>
  <nav aria-label="Fetal tracing resources" className="flex flex-wrap items-center gap-3">
   <Link className="btn-outline" href="/study-studio">All study tools</Link>
   <p className="text-sm">For more fetal tracing practice, try the {' '}
   <a className="inline-flex items-center gap-1 font-semibold text-mauve underline underline-offset-4 hover:text-espresso" href="https://ncc-efm.org/game/efmgame.cfm" target="_blank" rel="noopener noreferrer">
    NCC EFM Tracing Game <ExternalLink size={16} aria-hidden="true"/>
    <span className="sr-only"> (opens in a new tab)</span>
   </a>.
   </p>
  </nav>
 </div>;
}
