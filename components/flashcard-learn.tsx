'use client';

import {useRef,useState} from 'react';
import {ArrowRight,Check,RotateCcw,Square,Volume2,X} from 'lucide-react';
import {buildLearnQuestion,type CardRating,type StudyCard} from '@/lib/flashcard-study.mjs';
import {useFlashcardSpeech} from './use-flashcard-speech';

export function FlashcardLearn({cards,pool,visible,onMark}:{
 cards:StudyCard[]; pool:StudyCard[]; visible:boolean; onMark:(id:string,rating:CardRating)=>void;
}){
 const [round,setRound]=useState(cards);
 const [index,setIndex]=useState(0);
 const [question,setQuestion]=useState(()=>cards.length?buildLearnQuestion(cards[0],pool):null);
 const [result,setResult]=useState<{choice:string|null;correct:boolean}|null>(null);
 const [missed,setMissed]=useState<StudyCard[]>([]);
 const [reveal,setReveal]=useState(false);
 const title=useRef<HTMLHeadingElement>(null);
 const feedback=useRef<HTMLDivElement>(null);
 const speech=useFlashcardSpeech(`${visible}:${index}:${question?.card.id??'complete'}`);
 const complete=index>=round.length;
 const answered=index+Number(result!==null);

 function grade(choice:string|null,correct:boolean){
  if(!question||result)return;
  speech.stop();
  setResult({choice,correct});
  if(!correct)setMissed(items=>[...items,question.card]);
  onMark(question.card.id,correct?'known':'learning');
  requestAnimationFrame(()=>feedback.current?.focus());
 }
 function advance(){
  speech.stop();
  const next=index+1;
  setIndex(next);
  setResult(null);
  setReveal(false);
  setQuestion(next<round.length?buildLearnQuestion(round[next],pool):null);
  requestAnimationFrame(()=>title.current?.focus());
 }
 function restart(selection:StudyCard[]){
  speech.stop();
  setRound(selection);
  setIndex(0);
  setMissed([]);
  setResult(null);
  setReveal(false);
  setQuestion(buildLearnQuestion(selection[0],pool));
  requestAnimationFrame(()=>title.current?.focus());
 }
 if(!round.length)return null;

 return <div hidden={!visible} className="fc-learn">
  <div className="fc-learn-progress">
   <div><strong>Learn practice</strong><span>{answered} of {round.length} answered</span></div>
   <progress aria-label="Learn round progress" value={answered} max={round.length}/>
  </div>
  {complete?<section className="fc-surface fc-learn-result" aria-label="Learn results">
   <h2 tabIndex={-1} ref={title}>Round complete</h2>
   <p className="fc-results-score">{round.length-missed.length} / {round.length}</p>
   <p className="fc-muted">Correct in this round</p>
   <div className="fc-test-actions">
    {missed.length>0&&<button type="button" className="fc-button fc-primary" onClick={()=>restart(missed)}>Retry {missed.length} missed {missed.length===1?'card':'cards'}</button>}
    <button type="button" className="fc-button" onClick={()=>restart(cards)}><RotateCcw size={16}/>Restart practice</button>
   </div>
  </section>:question&&<section className="fc-surface fc-learn-question" aria-label="Learn question">
   <div className="fc-learn-meta"><span className="fc-eyebrow">Question {index+1} of {round.length}</span><span className="fc-tag">{question.card.topic}</span>
    <button type="button" className="fc-icon" aria-label="Read term" disabled={!speech.supported} onClick={()=>speech.speak(question.card.front)}><Volume2 size={18}/></button>
   </div>
   <h2 className="fc-quiz-stem" ref={title} tabIndex={-1}>{question.card.front}</h2>
   {question.choices.length>0?<fieldset className="fc-learn-fieldset">
    <legend>Choose an answer</legend>
    <div className="fc-learn-choices">{question.choices.map((choice,i)=>{
     const isCorrect=Boolean(result)&&choice.id===question.correctId;
     const isWrong=Boolean(result)&&choice.id===result?.choice&&!isCorrect;
     return <button type="button" key={choice.id} className="fc-learn-choice" data-result={isCorrect?'correct':isWrong?'incorrect':undefined}
       aria-disabled={Boolean(result)} onClick={()=>grade(choice.id,choice.id===question.correctId)}>
      <span className="fc-choice-number" aria-hidden="true">{i+1}</span><span>{choice.text}</span>
      {isCorrect&&<Check size={18} aria-label="Correct answer"/>}{isWrong&&<X size={18} aria-label="Incorrect answer"/>}
     </button>;
    })}</div>
   </fieldset>:!result&&<div className="fc-learn-recall">
    <p className="fc-muted">Recall the definition, then reveal it to check your answer.</p>
    {reveal?<><p className="fc-learn-definition">{question.card.back}</p><div className="fc-test-actions">
     <button type="button" className="fc-button" onClick={()=>grade(null,false)}>Still learning</button>
     <button type="button" className="fc-button fc-primary" onClick={()=>grade(null,true)}>Know it</button>
    </div></>:<button type="button" className="fc-button" onClick={()=>setReveal(true)}>Reveal definition</button>}
   </div>}
   {result?<div className="fc-learn-feedback" data-correct={result.correct} tabIndex={-1} ref={feedback}>
    <strong>{result.correct?'Correct':result.choice?'Still learning':'Review this definition'}</strong>
    <p className="fc-learn-definition">{question.card.back}</p>
   </div>:question.choices.length>0&&<div className="fc-learn-footer"><button type="button" className="fc-button" onClick={()=>grade(null,false)}>I don’t know</button></div>}
   {result&&<div className="fc-learn-footer"><button type="button" className="fc-button fc-primary" onClick={advance}>{index+1===round.length?'See results':'Next question'}<ArrowRight size={16}/></button></div>}
  </section>}
  {speech.reading&&<button type="button" className="fc-button mt-3" onClick={speech.stop}><Square size={14}/>Stop reading</button>}
  {speech.error&&<p className="fc-alert" role="alert">{speech.error}</p>}
 </div>;
}
