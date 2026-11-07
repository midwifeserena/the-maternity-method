'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import Link from 'next/link';
import {BookOpen,FileText,Headphones,NotebookPen,PlayCircle} from 'lucide-react';
import {StudyGuideLibrary} from './study-guide-library';
import {studyGuideCatalog} from '@/lib/study-guide-catalog.mjs';
import {StudioNotebook} from './studio-notebook';
import {StudioAssets} from './studio-assets';
import {StudioFlashcards} from './studio-flashcards';
import {StudioPodcast} from './studio-podcast';
import './study-studio.css';
const cards=[{title:'Notebook',href:'/study-studio/notebook',Icon:NotebookPen,text:'Draw, type, arrange images, and keep your own notes in one place.'},{title:'Flashcards',href:'/study-studio/flashcards',Icon:BookOpen,text:'Make your own cards, then flip, learn or test yourself. Course cards stay available.'},{title:'Video Lessons',href:'/video-lessons',Icon:PlayCircle,text:'Return to your maternity lessons and turn new ideas into personal notes.'},{title:'Podcast',href:'/study-studio/podcast',Icon:Headphones,text:'Create a narrated audio recap from text you choose. No paid AI service.'},{title:'Study Sheets',href:'/study-studio/sheets',Icon:FileText,text:'Explore course cheat sheets or upload your own private PDFs, images and text.'}];
export function StudyStudio({section='home'}:{section?:string}){
 const [owner,setOwner]=useState<string|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;let unsubscribe:(()=>void)|undefined;const db=createClient();db.auth.getUser().then(({data:{user}})=>{if(!active)return;setOwner(user?.id??null);setReady(true);const sub=db.auth.onAuthStateChange?.((_event,session)=>{if(active)setOwner(session?.user?.id??null)});unsubscribe=()=>sub?.data.subscription.unsubscribe();}).catch(()=>{if(active)setReady(true)});return()=>{active=false;unsubscribe?.()};},[]);
 if(!ready)return <p role="status">Opening your Study Studio…</p>;
 if(!owner)return <p role="alert">Please sign in to open your private Study Studio.</p>;
 return <StudioContent key={owner} section={section}/>;
}
function StudioContent({section='home'}:{section?:string}){
 const [sheets,setSheets]=useState('personal');const title=section==='home'?'Your Study Studio':cards.find(c=>c.href.endsWith('/'+section))?.title??'Study Studio';
 return <div className="studio"><header className="studio-header"><p className="studio-eyebrow">The Maternity Method · Study Studio</p><h1>{title}</h1><p className="studio-muted">A personal space to make maternity make sense, in the way you learn best.</p>{section!=='home'&&<Link className="studio-button mt-4" href="/study-studio">All study tools</Link>}</header>
 {section==='home'&&<><div className="studio-grid">{cards.map(({title,href,Icon,text})=><article key={href} className="studio-card"><Link href={href}><Icon size={27}/><h2 className="mt-6">{title}</h2><p className="studio-muted">{text}</p></Link></article>)}</div><p className="studio-notice">Your personal notes, flashcards and uploads belong to your account. Course resources stay available alongside them. Audio recaps use browser narration, with no paid AI service.</p></>}
 {section==='notebook'&&<StudioNotebook/>}{section==='flashcards'&&<StudioFlashcards/>}{section==='podcast'&&<StudioPodcast/>}{section==='sheets'&&<><nav className="studio-tabs" aria-label="Study sheet collection"><button className="studio-button" aria-pressed={sheets==='personal'} onClick={()=>setSheets('personal')}>My uploads</button><button className="studio-button" aria-pressed={sheets==='course'} onClick={()=>setSheets('course')}>Course sheets</button></nav>{sheets==='personal'?<StudioAssets/>:<StudyGuideLibrary guides={studyGuideCatalog}/>}</>}
 </div>;
}
