'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,LibraryBig,PencilLine,History,ClipboardList,PlayCircle,FileText,PanelsTopLeft,ChartNoAxesCombined,UserRound,Menu,X} from 'lucide-react';
import {useState} from 'react';
import {StorkLogo} from '@/components/stork-logo';

const studentLinks=[['Dashboard','/dashboard',LayoutDashboard],['Question Bank','/question-bank',LibraryBig],['Create Exam','/create-exam',PencilLine],['Previous Tests','/previous-tests',History],['NGN Case Studies','/ngn-case-studies',ClipboardList],['Video Lessons','/video-lessons',PlayCircle],['Study Guides','/study-guides',FileText],['Flashcards','/flashcards',PanelsTopLeft],['Performance','/performance',ChartNoAxesCombined],['Account & Subscription','/account',UserRound]] as const;
const adminLinks=[['Admin Questions','/admin/questions',LibraryBig],['Admin NGN Case Studies','/admin/ngn',ClipboardList],['Admin Flashcard Studio','/admin/flashcards',PanelsTopLeft]] as const;

export function Sidebar({isAdmin=false}:{isAdmin?:boolean}){
 const pathname=usePathname(),[open,setOpen]=useState(false);
 const adminPortal=isAdmin&&(pathname==='/admin'||pathname.startsWith('/admin/'));
 const links=adminPortal?adminLinks:studentLinks;
 return <>
  <button className="md:hidden fixed top-4 left-4 z-[60] rounded-xl bg-oatmeal p-3 shadow" onClick={()=>setOpen(!open)} aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="main-sidebar">{open?<X/>:<Menu/>}</button>
  {open&&<button className="fixed inset-0 z-30 bg-espresso/30 md:hidden" onClick={()=>setOpen(false)} aria-label="Close menu"/>}
  <aside id="main-sidebar" className={`fixed z-40 inset-y-0 left-0 w-[min(85vw,270px)] md:w-[270px] bg-oatmeal border-r border-espresso/10 flex flex-col p-4 md:translate-x-0 transition-transform ${open?'translate-x-0':'-translate-x-full'}`}>
   <Link onClick={()=>setOpen(false)} href={adminPortal?'/admin/questions':'/dashboard'} className="flex shrink-0 items-center gap-3 px-3 pt-5 pb-6"><StorkLogo className="h-12 w-12 shrink-0"/><span className="font-display text-[21px] leading-[1.05]">The Maternity<br/>Method</span></Link>
   {isAdmin&&<nav aria-label="Switch portal" className="mb-5 grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-mauve/20 bg-blush/40 p-1">
    {([['Student','/dashboard',!adminPortal],['Admin','/admin/questions',adminPortal]] as const).map(([label,href,active])=><Link key={label} href={href} onClick={()=>setOpen(false)} aria-label={`${label} portal`} aria-current={active?'true':undefined} className={`rounded-lg px-2 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mauve ${active?'bg-mauve text-white shadow-sm':'text-mauve hover:bg-blush'}`}>{label}</Link>)}
   </nav>}
   <nav className="min-h-0 space-y-1 overflow-y-auto pb-4" aria-label={adminPortal?'Admin navigation':'Student navigation'}>
    {links.map(([label,url,Icon])=>{
     const active=pathname===url||(adminPortal&&pathname.startsWith(`${url}/`));
     return <Link key={url} onClick={()=>setOpen(false)} href={url} aria-current={active?'page':undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold ${active?'bg-blush text-mauve':'text-mauve hover:bg-blush/70'}`}><Icon className="shrink-0" size={19} strokeWidth={1.8}/><span>{label}</span></Link>;
    })}
   </nav>
   <div className="mt-auto shrink-0 px-4 pt-5 text-xs text-espresso/55">Made for the moments that matter. ♡</div>
  </aside>
 </>;
}
