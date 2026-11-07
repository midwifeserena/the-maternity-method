'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,LibraryBig,PencilLine,History,ClipboardList,PlayCircle,FileText,PanelsTopLeft,ChartNoAxesCombined,UserRound,Menu,X,ChevronDown,NotebookPen,Headphones,BookOpen} from 'lucide-react';
import {useState} from 'react';
import {StorkLogo} from '@/components/stork-logo';

const studentResources=[['Account & Subscription','/account',UserRound]] as const;
const studioLinks=[['Notebook','/study-studio/notebook',NotebookPen],['Flashcards','/study-studio/flashcards',BookOpen],['Video Lessons','/video-lessons',PlayCircle],['Podcast','/study-studio/podcast',Headphones],['Study Sheets','/study-studio/sheets',FileText]] as const;
const questionBankLinks=[['Create Exam','/create-exam',PencilLine],['NGN Case Studies','/ngn-case-studies',ClipboardList],['Previous Exams','/previous-tests',History],['Performance','/performance',ChartNoAxesCombined]] as const;
const adminLinks=[['Admin Questions','/admin/questions',LibraryBig],['Admin NGN Case Studies','/admin/ngn',ClipboardList],['Admin Flashcard Studio','/admin/flashcards',PanelsTopLeft]] as const;
const linkClass=(active:boolean)=>`flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold ${active?'bg-blush text-mauve':'text-mauve hover:bg-blush/70'}`;

export function Sidebar({isAdmin=false}:{isAdmin?:boolean}){
 const pathname=usePathname(),[open,setOpen]=useState(false),[bankOpen,setBankOpen]=useState<boolean|null>(null),[studioOpen,setStudioOpen]=useState<boolean|null>(null);
 const adminPortal=isAdmin&&(pathname==='/admin'||pathname.startsWith('/admin/'));
 const inQuestionBank=pathname==='/question-bank'||questionBankLinks.some(([,url])=>pathname===url||pathname.startsWith(url+'/'));
 const expanded=bankOpen??inQuestionBank;
 const inStudio=pathname.startsWith('/study-studio')||['/flashcards','/video-lessons','/study-guides'].includes(pathname),studioExpanded=studioOpen??inStudio;
 return <>
  <button className="md:hidden fixed top-4 left-4 z-[60] rounded-xl bg-oatmeal p-3 shadow" onClick={()=>setOpen(!open)} aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="main-sidebar">{open?<X/>:<Menu/>}</button>
  {open&&<button className="fixed inset-0 z-30 bg-espresso/30 md:hidden" onClick={()=>setOpen(false)} aria-label="Close menu"/>}
  <aside id="main-sidebar" className={`fixed z-40 inset-y-0 left-0 w-[min(85vw,270px)] md:w-[270px] bg-oatmeal border-r border-espresso/10 flex flex-col p-4 md:translate-x-0 transition-transform ${open?'translate-x-0':'-translate-x-full'}`}>
   <Link onClick={()=>setOpen(false)} href={adminPortal?'/admin/questions':'/dashboard'} className="flex shrink-0 items-center gap-3 px-3 pt-5 pb-6"><StorkLogo className="h-12 w-12 shrink-0"/><span className="font-display text-[21px] leading-[1.05]">The Maternity<br/>Method</span></Link>
   {isAdmin&&<nav aria-label="Switch portal" className="mb-5 grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-mauve/20 bg-blush/40 p-1">
    {([['Student','/dashboard',!adminPortal],['Admin','/admin/questions',adminPortal]] as const).map(([label,href,active])=><Link key={label} href={href} onClick={()=>setOpen(false)} aria-label={`${label} portal`} aria-current={active?'true':undefined} className={`rounded-lg px-2 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mauve ${active?'bg-mauve text-white shadow-sm':'text-mauve hover:bg-blush'}`}>{label}</Link>)}
   </nav>}
   <nav className="min-h-0 space-y-1 overflow-y-auto pb-4" aria-label={adminPortal?'Admin navigation':'Student navigation'}>
    {adminPortal?adminLinks.map(([label,url,Icon])=><Link key={url} onClick={()=>setOpen(false)} href={url} aria-current={pathname===url||pathname.startsWith(url+'/')?'page':undefined} className={linkClass(pathname===url||pathname.startsWith(url+'/'))}><Icon className="shrink-0" size={19} strokeWidth={1.8}/><span>{label}</span></Link>):<>
     <Link onClick={()=>setOpen(false)} href="/dashboard" aria-current={pathname==='/dashboard'?'page':undefined} className={linkClass(pathname==='/dashboard')}><LayoutDashboard size={19} strokeWidth={1.8}/><span>Dashboard</span></Link>
     <div>
      <div className={'flex items-center rounded-xl '+(inQuestionBank?'bg-blush':'hover:bg-blush/70')}>
       <Link href="/question-bank" onClick={()=>setBankOpen(true)} aria-current={pathname==='/question-bank'?'page':undefined} aria-expanded={expanded} aria-controls="question-bank-submenu" className="flex flex-1 items-center gap-3 px-4 py-3 text-[14px] font-semibold text-mauve"><LibraryBig className="shrink-0" size={19} strokeWidth={1.8}/><span>Question Bank</span></Link>
       <button type="button" onClick={()=>setBankOpen(!expanded)} aria-label={expanded?'Collapse Question Bank menu':'Expand Question Bank menu'} aria-expanded={expanded} aria-controls="question-bank-submenu" className="p-3 text-mauve rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-mauve"><ChevronDown size={17} className={expanded?'rotate-180':''}/></button>
      </div>
      <ul id="question-bank-submenu" hidden={!expanded} className="ml-6 mt-1 space-y-1 border-l border-mauve/20 pl-2">{questionBankLinks.map(([label,url,Icon])=>{const active=pathname===url||pathname.startsWith(url+'/');return <li key={url}><Link href={url} onClick={()=>{setBankOpen(true);setOpen(false);}} aria-current={active?'page':undefined} className={linkClass(active)}><Icon className="shrink-0" size={17} strokeWidth={1.8}/><span>{label}</span></Link></li>})}</ul>
     </div>
     <div><div className={'flex items-center rounded-xl '+(inStudio?'bg-blush':'hover:bg-blush/70')}><Link href="/study-studio" onClick={()=>setStudioOpen(true)} aria-current={pathname==='/study-studio'?'page':undefined} aria-expanded={studioExpanded} aria-controls="study-studio-submenu" className="flex flex-1 items-center gap-3 px-4 py-3 text-[14px] font-semibold text-mauve"><NotebookPen className="shrink-0" size={19} strokeWidth={1.8}/><span>Study Studio</span></Link><button type="button" onClick={()=>setStudioOpen(!studioExpanded)} aria-label={studioExpanded?'Collapse Study Studio menu':'Expand Study Studio menu'} aria-expanded={studioExpanded} aria-controls="study-studio-submenu" className="p-3 text-mauve rounded-xl"><ChevronDown size={17} className={studioExpanded?'rotate-180':''}/></button></div><ul id="study-studio-submenu" hidden={!studioExpanded} className="ml-6 mt-1 space-y-1 border-l border-mauve/20 pl-2">{studioLinks.map(([label,url,Icon])=>{const active=pathname===url||(label==='Flashcards'&&pathname==='/flashcards')||(label==='Study Sheets'&&pathname==='/study-guides');return <li key={url}><Link href={url} onClick={()=>{setStudioOpen(true);setOpen(false)}} aria-current={active?'page':undefined} className={linkClass(active)}><Icon className="shrink-0" size={17} strokeWidth={1.8}/><span>{label}</span></Link></li>})}</ul></div>
     {studentResources.map(([label,url,Icon])=><Link key={url} onClick={()=>setOpen(false)} href={url} aria-current={pathname===url?'page':undefined} className={linkClass(pathname===url)}><Icon className="shrink-0" size={19} strokeWidth={1.8}/><span>{label}</span></Link>)}
    </>}
   </nav>
   <div className="mt-auto shrink-0 px-4 pt-5 text-xs text-espresso/55">Made for the moments that matter. ♡</div>
  </aside>
 </>;
}
