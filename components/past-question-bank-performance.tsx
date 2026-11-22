'use client';

import {useEffect,useState} from 'react';

type Snapshot={
 id:string;
 reset_at:string;
 summary:{
  points:{earned:number;possible:number;percent:number|null};
  questionScore:{correct:number;total:number};
  usage:{used:number;total:number};
  tests:{completed:number;created:number};
 };
};

export function PastQuestionBankPerformance(){
 const [snapshots,setSnapshots]=useState<Snapshot[]>([]);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/exams/progress',{signal:controller.signal,cache:'no-store'})
   .then(async response=>{
    if(response.ok)setSnapshots((await response.json()).snapshots??[]);
   })
   .catch(()=>{})
   .finally(()=>{if(!controller.signal.aborted)setLoaded(true)});
  return ()=>controller.abort();
 },[]);

 if(!loaded||!snapshots.length)return null;
 return <section className="stats-card space-y-4" aria-labelledby="past-performance-title">
  <h2 id="past-performance-title">Past Performance</h2>
  {snapshots.map(({id,reset_at,summary})=><details className="surface p-4" key={id}>
   <summary className="cursor-pointer font-semibold text-mauve">
    Saved {new Date(reset_at).toLocaleString()}
   </summary>
   <dl className="stats-facts mt-3">
    <div><dt>Overall points</dt><dd>{summary.points.earned} / {summary.points.possible}{summary.points.percent===null?'':` · ${summary.points.percent}%`}</dd></div>
    <div><dt>Fully correct</dt><dd>{summary.questionScore.correct} / {summary.questionScore.total}</dd></div>
    <div><dt>Unique questions used</dt><dd>{summary.usage.used} / {summary.usage.total}</dd></div>
    <div><dt>Tests completed</dt><dd>{summary.tests.completed} / {summary.tests.created}</dd></div>
   </dl>
  </details>)}
 </section>;
}
