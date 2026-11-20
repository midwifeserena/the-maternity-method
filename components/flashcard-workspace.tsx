'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {BookOpen,Check,ChevronLeft,ChevronRight,ListChecks,RotateCcw,Search,Shuffle,Square,Star,Volume2} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import {readCardProgress,shuffled,type StudyCard,type CardRating,type CardProgress} from '@/lib/flashcard-study.mjs';
import {useFlashcardSpeech} from '@/components/use-flashcard-speech';
import {FlashcardLearn} from '@/components/flashcard-learn';
import {FlashcardTest} from '@/components/flashcard-test';
import '@/components/flashcard-study.css';
import {studioRequest} from './studio-client';
export function FlashcardWorkspace({personal=false,embedded=false}:{personal?:boolean;embedded?:boolean}){
 const [cards,setCards]=useState<StudyCard[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0),[userId,setUserId]=useState('');
 const [mode,setMode]=useState<'cards'|'learn'|'test'>('cards'),[topic,setTopic]=useState('All'),[search,setSearch]=useState(''),[highYield,setHighYield]=useState(false),[starredOnly,setStarredOnly]=useState(false);
 const [progress,setProgress]=useState<CardProgress>({ratings:{},starred:[]}),[saveNotice,setSaveNotice]=useState('');
 const [order,setOrder]=useState<string[]>([]),[position,setPosition]=useState(0),[flipped,setFlipped]=useState(false),[reviewIds,setReviewIds]=useState<string[]|null>(null),[learnVersion,setLearnVersion]=useState(0),[notice,setNotice]=useState('');
 useEffect(()=>{const controller=new AbortController();let unsubscribe:(()=>void)|undefined;setStatus('loading');setError('');setCards([]);setUserId('');setProgress({ratings:{},starred:[]});(async()=>{
  try{
   const db=createClient();const {data:{user}}=await db.auth.getUser();if(controller.signal.aborted)return;if(!user)throw Error('Please sign in again to study flashcards.');
   let activeUser=user.id;
   const subscription=db.auth.onAuthStateChange?.((_event,session)=>{const nextUser=session?.user?.id??'';if(!controller.signal.aborted&&nextUser!==activeUser){activeUser=nextUser;controller.abort();setMode('cards');setOrder([]);setPosition(0);setReviewIds(null);setFlipped(false);setNotice('');setStatus('loading');setUserId('');setCards([]);setProgress({ratings:{},starred:[]});setRetry(n=>n+1);}});
   unsubscribe=()=>subscription?.data.subscription.unsubscribe();
   let saved:CardProgress={ratings:{},starred:[]};try{saved=readCardProgress(localStorage.getItem('tmm:flashcards:v1:'+user.id))}catch{setSaveNotice('Progress can’t be saved in this browser. You can still study.');}
   const loaded:StudyCard[]=[];
   if(personal){const data=await studioRequest('flashcards');loaded.push(...data.items.map((c:any,i:number)=>({...c,card_number:i+1})));}
   else {for(let start=0;;start+=500){const {data,error:loadError}=await db.from('flashcard_library').select('id,card_number,topic,front,back,high_yield').eq('published',true).eq('review_status','approved').order('card_number',{ascending:true}).order('id',{ascending:true}).range(start,start+499).abortSignal(controller.signal);if(controller.signal.aborted)return;if(loadError)throw Error('Flashcards could not load. Please try again.');loaded.push(...data??[]);if((data?.length??0)<500)break;}
}
   if(!controller.signal.aborted){setProgress(saved);setUserId(user.id);setCards(loaded);setStatus('ready');}
  }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Flashcards could not load. Please try again.');setStatus('error');}}
 })();return()=>{controller.abort();unsubscribe?.();};},[retry,personal]);
 useEffect(()=>{if(status!=='ready'||!userId)return;try{localStorage.setItem('tmm:flashcards:v1:'+userId,JSON.stringify(progress))}catch{setSaveNotice('Progress can’t be saved in this browser. You can still study.');}},[progress,userId,status]);
 const topics=useMemo(()=>[...new Set(cards.map(c=>c.topic))],[cards]);
 const filtered=useMemo(()=>{const term=search.trim().toLowerCase();return cards.filter(c=>(topic==='All'||c.topic===topic)&&(!highYield||c.high_yield)&&(!starredOnly||progress.starred.includes(c.id))&&(!term||c.front.toLowerCase().includes(term)||c.back.toLowerCase().includes(term)));},[cards,topic,search,highYield,starredOnly,progress.starred]);
 const deck=useMemo(()=>{if(!order.length)return filtered;const map=new Map(filtered.map(c=>[c.id,c]));return order.flatMap(id=>map.has(id)?[map.get(id)!]:[]);},[filtered,order]);
 const byId=useMemo(()=>new Map(cards.map(c=>[c.id,c])),[cards]);
 const active=deck[Math.min(position,Math.max(0,deck.length-1))];
 const learnCards=reviewIds?reviewIds.flatMap(id=>{const card=byId.get(id);return card?[card]:[]}):deck;
 const flashcardTextId=useId();
 const flipCard=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(flipCard.current)flipCard.current.scrollTop=0;},[active?.id,flipped]);
 const known=filtered.filter(c=>progress.ratings[c.id]==='known').length,learning=filtered.filter(c=>progress.ratings[c.id]==='learning').length;
 const speech=useFlashcardSpeech([mode,active?.id??'',topic,search,highYield,starredOnly,order.join(','),flipped].join(':'));
 function reset(){speech.stop();setOrder([]);setPosition(0);setFlipped(false);setReviewIds(null);setNotice('');}
 function mark(id:string,rating:CardRating){setProgress(old=>({...old,ratings:{...old.ratings,[id]:rating}}));}
 function star(id:string){setProgress(old=>({...old,starred:old.starred.includes(id)?old.starred.filter(v=>v!==id):[...old.starred,id]}));if(starredOnly)reset();}
 function rate(rating:CardRating){
  if(!active||!flipped)return;
  mark(active.id,rating);speech.stop();setFlipped(false);
  if(position<deck.length-1)setPosition(position+1);
  setNotice(rating==='known'?'Marked Know it.':'Marked Still learning.');
 }
 function chooseTopic(value:string){setTopic(value);reset();}
 function move(next:number){speech.stop();setPosition(next);setFlipped(false);setNotice('');}
 function review(ids:string[]){speech.stop();setTopic('All');setSearch('');setHighYield(false);setStarredOnly(false);setMode('learn');setOrder([]);setPosition(0);setReviewIds(ids);setLearnVersion(v=>v+1);setFlipped(false);setNotice('');}
 const cardControls=active?<div className="fc-card-actions"><button type="button" className="fc-icon" aria-label={flipped?'Read definition':'Read term'} disabled={!speech.supported} onClick={()=>speech.speak(flipped?active.back:active.front)}><Volume2 size={19}/></button><button type="button" className="fc-icon" aria-label={progress.starred.includes(active.id)?'Unstar card':'Star card'} aria-pressed={progress.starred.includes(active.id)} onClick={()=>star(active.id)}><Star size={18} fill={progress.starred.includes(active.id)?'currentColor':'none'}/></button></div>:null;
 return <div className="flashcard-page">
  {!embedded&&<header className="fc-header"><div>{personal?<h2>Study my flashcards</h2>:<h1>Flashcards</h1>}</div></header>}
  <nav className="fc-tabs" aria-label="Flashcard study modes">
   {([['cards','Flashcards',BookOpen],['learn','Learn',RotateCcw],['test','Test',ListChecks]] as const).map(([value,label,Icon])=>
    <button type="button" key={value} aria-pressed={mode===value} onClick={()=>{speech.stop();setMode(value);setFlipped(false);setNotice('')}}><Icon size={18}/>{label}</button>)}
  </nav>
  {status==='loading'?<div className="fc-surface" role="status">Loading flashcards…</div>:status==='error'?<div className="fc-surface" role="alert">
   <p>{error}</p><button type="button" className="fc-button mt-4" onClick={()=>setRetry(n=>n+1)}>Try again</button>
  </div>:!cards.length?<div className="fc-surface" role="status">{personal?'Create personal flashcards above to start studying.':'No published flashcards are available yet. Please check back soon.'}</div>:<>
   <section className="fc-filters" aria-label="Flashcard filters">
    <label className="fc-search"><Search size={17}/><input type="search" aria-label="Search cards" placeholder="Search terms or definitions" value={search} onChange={e=>{setSearch(e.target.value);reset();}}/></label>
    <label>Topic<select aria-label="Topic" value={topic} onChange={e=>chooseTopic(e.target.value)}><option value="All">All topics</option>{topics.map(t=><option key={t}>{t}</option>)}</select></label>
    <label><input type="checkbox" checked={highYield} onChange={e=>{setHighYield(e.target.checked);reset();}}/>High-yield only</label>
    <label><input type="checkbox" checked={starredOnly} onChange={e=>{setStarredOnly(e.target.checked);reset();}}/><Star size={14}/>Starred only</label>
   </section>
   {!filtered.length&&mode!=='test'&&<section className="fc-surface"><h2>No cards match these filters.</h2><button type="button" className="fc-button" onClick={()=>{setTopic('All');setSearch('');setHighYield(false);setStarredOnly(false);reset();}}>Clear filters</button></section>}
   {mode==='cards'&&active&&<section className="fc-deck" aria-label="Flashcard study area">
    <div className="fc-deck-caption"><span>{filtered.length} {filtered.length===1?'card':'cards'} · {known} known</span><span>{learning} still learning</span></div>
    <div className="fc-card">
     <div className="fc-card-top"><div className="fc-tags"><span className="fc-eyebrow">{flipped?'Definition':'Term'}</span><span className="fc-tag">{active.topic}</span>{active.high_yield&&<span className="fc-tag fc-tag-yield">High yield</span>}</div>{cardControls}</div>
     <button type="button" className="fc-flip" ref={flipCard} aria-describedby={flashcardTextId} aria-label={flipped?'Flip to term':'Flip to definition'} aria-pressed={flipped} onClick={()=>setFlipped(v=>!v)}>
      <span id={flashcardTextId} className={flipped?'fc-definition':'fc-term'}>{flipped?active.back:active.front}</span>
     </button>
     <div className="fc-card-foot"><span className="fc-hint"><RotateCcw size={13}/>{flipped?'Tap card to show term':'Tap card to show definition'}</span></div>
    </div>
    <div className="fc-deck-nav">
     <button type="button" className="fc-icon" aria-label="Previous card" disabled={position===0} onClick={()=>move(position-1)}><ChevronLeft size={20}/></button>
     <span className="fc-deck-number" aria-live="polite">{Math.min(position+1,deck.length)} / {deck.length}</span>
     <button type="button" className="fc-icon" aria-label="Next card" disabled={position>=deck.length-1} onClick={()=>move(position+1)}><ChevronRight size={20}/></button>
    </div>
    <div className="fc-rating"><button type="button" className="fc-button" disabled={!flipped} onClick={()=>rate('learning')}><RotateCcw size={16}/>Still learning</button><button type="button" className="fc-button fc-primary" disabled={!flipped} onClick={()=>rate('known')}><Check size={16}/>Know it</button></div>
    <div className="fc-deck-tools">
     <button type="button" className="fc-button" disabled={!speech.supported} onClick={()=>speech.speak(`Term. ${active.front}. Definition. ${active.back}`)}><Volume2 size={16}/>Read both sides</button>
     <button type="button" className="fc-button" disabled={filtered.length<2} onClick={()=>{speech.stop();setOrder(shuffled(filtered.map(c=>c.id)));setPosition(0);setReviewIds(null);setFlipped(false);setNotice('Cards shuffled.');}}><Shuffle size={16}/>Shuffle cards</button>
     <button type="button" className="fc-button" onClick={reset}>Start again</button>
    </div>
    {notice&&<p className="fc-audio-status" role="status">{notice}</p>}
    <div className="fc-audio-controls">
     {speech.reading&&<button type="button" className="fc-button" onClick={speech.stop}><Square size={14}/>Stop reading</button>}
     {speech.supported&&<label className="fc-muted">Reading speed <select aria-label="Reading speed" value={speech.rate} onChange={e=>{speech.stop();speech.setRate(Number(e.target.value));}}><option value={0.8}>Slower</option><option value={1}>Normal</option><option value={1.2}>Faster</option></select></label>}
    </div>
    {speech.error&&<p className="fc-alert" role="alert">{speech.error}</p>}
   </section>}
   <FlashcardLearn key={JSON.stringify([learnVersion,learnCards.map(c=>c.id)])} cards={learnCards} pool={reviewIds?cards:filtered} visible={mode==='learn'} onMark={mark}/>
   <FlashcardTest cards={filtered} visible={mode==='test'} onMark={mark} onReview={review}/>
   <p className="fc-muted fc-storage-note">{saveNotice||'Card progress and stars are saved in this browser. Flashcard practice is separate from exam scores.'}</p>
  </>}
 </div>;
}
