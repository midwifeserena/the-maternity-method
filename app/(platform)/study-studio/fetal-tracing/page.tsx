import Link from 'next/link';
import {ExternalLink} from 'lucide-react';

const gameUrl='https://ncc-efm.org/game/efmgame.cfm';

export const metadata={title:'Fetal Tracing | The Maternity Method'};

export default function FetalTracingPage(){
 return <section className="space-y-5">
  <header className="mauve-page-header">
   <p className="text-xs font-bold uppercase tracking-[0.18em]">Study Studio</p>
   <h1 className="mt-3 text-4xl sm:text-5xl">Fetal Tracing</h1>
   <p className="mt-3">Practice reading fetal monitor tracings with the NCC Electronic Fetal Monitoring game.</p>
  </header>
  <div className="surface border-rose p-5 sm:p-7">
   <h2 className="text-2xl">Play the NCC tracing game</h2>
   <p className="mt-2">The game opens in a new tab so NCC can start your session and display the fetal strips.</p>
   <div className="mt-5 flex flex-wrap items-center gap-3">
    <a className="btn-primary inline-flex items-center gap-2" href={gameUrl} target="_blank" rel="noopener noreferrer">
     Open on NCC’s website <ExternalLink size={16} aria-hidden="true"/>
     <span className="sr-only"> (opens in a new tab)</span>
    </a>
    <Link className="btn-outline" href="/study-studio">All study tools</Link>
   </div>
  </div>
 </section>;
}
