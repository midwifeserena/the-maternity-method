import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {mergeStudyGuides} from '@/lib/study-guide-catalog.mjs';
import {StudyGuideLibrary} from '@/components/study-guide-library';
export const metadata={title:'Study Guides | The Maternity Method'};
export default async function StudyGuidesPage(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login');
 const {data,error}=await db.from('guides').select('id,title,category,description,file_url').eq('published',true).order('created_at',{ascending:false});
 return <>
  <header className="mb-9"><div className="uppercase tracking-[.28em] font-bold text-mauve text-[11px]">The Maternity Method</div><h1 className="text-4xl md:text-[48px] leading-tight mt-5">Study Guides</h1><p className="text-espresso/65 mt-3 text-sm md:text-base">Clear, focused nursing references. Choose a topic to preview or download its cheat sheet.</p></header>
  {error&&<p role="status" className="surface p-4 mb-5">Your uploaded guides couldn’t load. The included cheat sheets are available below. Refresh to try loading your other guides again.</p>}
  <StudyGuideLibrary guides={mergeStudyGuides(data??[])}/>
 </>;
}
