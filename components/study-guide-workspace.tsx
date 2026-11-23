'use client';

import {useRef,useState} from 'react';
import {ChevronDown,Download,ExternalLink,FileText,Search} from 'lucide-react';
import {filterStudyGuides,studyGuideVolumes,type StudyGuide} from '@/lib/study-guide-catalog.mjs';
import styles from './study-guide-workspace.module.css';

export function StudyGuideWorkspace({guides}:{guides:StudyGuide[]}){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState<StudyGuide|null>(null);
 const [expanded,setExpanded]=useState<number[]>([]);
 const heading=useRef<HTMLHeadingElement>(null);
 const searching=Boolean(query.trim());
 const matches=filterStudyGuides(guides,'All',query);

 function search(value:string){
  setQuery(value);
  if(value.trim())setExpanded([...new Set(filterStudyGuides(guides,'All',value).map(guide=>guide.volume))]);
 }

 function selectGuide(guide:StudyGuide){
  setSelected(guide);
  requestAnimationFrame(()=>heading.current?.focus());
 }

 return <section className={styles.workspace} aria-label="Course study sheet workspace">
  <aside className={styles.sidebar} aria-label="Study sheet topics">
   <h2 className={styles.sidebarTitle}>Course Sheets</h2>
   <label className={styles.search}>
    <Search size={17} aria-hidden="true"/>
    <span className="sr-only">Search study sheets</span>
    <input type="search" value={query} onChange={event=>search(event.target.value)} placeholder="Find a study sheet…"/>
   </label>
   <div className={styles.topics}>
    {studyGuideVolumes.map(volume=>{
     const sheets=matches.filter(guide=>guide.volume===volume.id);
     if(searching&&!sheets.length)return null;
     const open=expanded.includes(volume.id);
     return <div className={styles.volume} key={volume.id}>
      <button type="button" className={styles.volumeButton} aria-expanded={open}
       aria-controls={'sheet-volume-'+volume.id}
       onClick={()=>setExpanded(current=>open?current.filter(id=>id!==volume.id):[...current,volume.id])}>
       <span>{volume.title}</span><ChevronDown size={17} aria-hidden="true"/>
      </button>
      <div className={styles.sheetList} id={'sheet-volume-'+volume.id} hidden={!open}>
       {sheets.length?sheets.map(guide=><button className={styles.sheet} key={guide.id}
        type="button" aria-pressed={selected?.id===guide.id} onClick={()=>selectGuide(guide)}>
        <span className={styles.number}>{guide.number}</span>
        <span>{guide.title}</span>
       </button>):<p className={styles.emptyVolume}>No study sheets yet.</p>}
      </div>
     </div>;
    })}
    {searching&&!matches.length&&<p className={styles.emptyVolume} role="status">No study sheets match your search.</p>}
   </div>
  </aside>

  <section className={styles.main} aria-labelledby="study-sheet-preview">
   {selected?<><header className={styles.previewHeader}>
    <div>
     <p className={styles.sheetMeta}>{selected.number} · {selected.page_count}-page PDF</p>
     <h2 id="study-sheet-preview" tabIndex={-1} ref={heading}>{selected.title}</h2>
    </div>
    <div className={styles.actions}>
     <a className="btn-outline inline-flex items-center gap-2" href={selected.file_url} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={16} aria-hidden="true"/> Open preview
     </a>
     <a className="btn-primary inline-flex items-center gap-2" href={selected.file_url+'?download=1'} download>
      <Download size={16} aria-hidden="true"/> Download
     </a>
    </div>
   </header>
   <iframe key={selected.id} className={styles.preview} src={selected.file_url} title={selected.title+' PDF preview'}/>
   </>:<div className={styles.emptyPreview}>
    <FileText size={34} aria-hidden="true"/>
    <h2 id="study-sheet-preview">Choose a study sheet</h2>
    <p>Open a volume and select a topic to preview the PDF.</p>
   </div>}
  </section>
 </section>;
}
