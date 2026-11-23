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
  <aside aria-label="More fetal tracing practice" className="rounded-2xl bg-mauve px-5 py-6 text-center text-[#fff9f2]">
   <p>For more fetal tracing practice, try the NCC EFM Tracing Game.</p>
   <a className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#fff9f2] px-5 py-3 font-semibold text-mauve hover:bg-blush focus-visible:outline-[#fff9f2]"
    href="https://ncc-efm.org/game/efmgame.cfm" target="_blank" rel="noopener noreferrer">
    NCC EFM Tracing Game <ExternalLink size={16} aria-hidden="true"/>
    <span className="sr-only"> (opens in a new tab)</span>
   </a>
  </aside>
  <Link className="btn-outline inline-flex" href="/study-studio">All study tools</Link>
 </div>;
}
