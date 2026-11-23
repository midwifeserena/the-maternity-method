'use client';

import {useState} from 'react';
import {ChevronDown,Download,ExternalLink,FileText,Search} from 'lucide-react';
import {filterStudyGuides,studyGuideVolumes,type StudyGuide} from '@/lib/study-guide-catalog.mjs';
import './study-guide-library.css';

export function StudyGuideLibrary({guides}:{guides:StudyGuide[]}){
 const [query,setQuery]=useState('');
 const searching=Boolean(query.trim());
 const visible=filterStudyGuides(guides,'All',query);

 return <section className="study-guide-library" aria-label="Study sheet library">
  <div className="study-guide-tools">
   <label className="study-guide-search">
    <Search size={18} aria-hidden="true"/>
    <span className="study-guide-sr">Search study sheets</span>
    <input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find a topic…"/>
   </label>
  </div>
  {searching&&<p className="study-guide-count" role="status">Showing {visible.length} of {guides.length} study sheets</p>}
  <div className="space-y-3">
   {studyGuideVolumes.map(volume=>{
    const sheets=visible.filter(guide=>guide.volume===volume.id);
    if(searching&&!sheets.length)return null;

    return <details key={volume.id} open={searching?true:undefined} className="study-guide-volume">
     <summary>
      <span>{volume.title}</span>
      <ChevronDown size={19} aria-hidden="true"/>
     </summary>
     {sheets.length?<ol className="study-guide-list">{sheets.map(guide=><li key={guide.id} className="study-guide-row">
      <span className="study-guide-number" aria-hidden="true">{guide.number}</span>
      <div className="study-guide-copy">
       <h2><FileText size={19} aria-hidden="true"/>{guide.title}</h2>
       <p>{guide.page_count}-page PDF</p>
      </div>
      <div className="study-guide-actions">
       <a href={guide.file_url} target="_blank" rel="noopener noreferrer" aria-label={'Preview '+guide.title}>
        <ExternalLink size={16} aria-hidden="true"/>Preview
       </a>
       <a className="study-guide-download" href={guide.file_url+'?download=1'} download aria-label={'Download '+guide.title}>
        <Download size={16} aria-hidden="true"/>Download
       </a>
      </div>
     </li>)}</ol>:<p className="p-5 text-sm">No study sheets have been added to this volume yet.</p>}
    </details>;
   })}
  </div>
  {!visible.length&&searching&&<div className="study-guide-empty">
   <h2>No sheets match your search</h2>
   <button type="button" onClick={()=>setQuery('')}>Clear search</button>
  </div>}
 </section>;
}
