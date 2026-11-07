'use client';
import {useState} from 'react';
import {Download,ExternalLink,FileText,Search} from 'lucide-react';
import {filterStudyGuides,type StudyGuide} from '@/lib/study-guide-catalog.mjs';
import './study-guide-library.css';
const categories=['All','Antepartum','Intrapartum','Postpartum','Newborn'];
export function StudyGuideLibrary({guides}:{guides:StudyGuide[]}){
 const [category,setCategory]=useState('All'),[query,setQuery]=useState('');
 const visible=filterStudyGuides(guides,category,query);
 return <section className="study-guide-library" aria-label="Study guide library">
  <div className="study-guide-tools"><label className="study-guide-search"><Search size={18} aria-hidden="true"/><span className="study-guide-sr">Search study guides</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find a topic…"/></label><div className="study-guide-filters" aria-label="Filter by topic">{categories.map(value=><button type="button" key={value} aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}</div></div>
  <p className="study-guide-count" role="status">Showing {visible.length} of {guides.length} study guides</p>
  <ol className="study-guide-list">{visible.map((guide,index)=>{
   const bundled=guide.file_url.startsWith('/api/study-guides/');
   return <li key={guide.id} className="study-guide-row"><span className="study-guide-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div className="study-guide-copy"><h2><FileText size={19} aria-hidden="true"/>{guide.title}</h2><p>{(guide.categories??[guide.category]).join(' · ')}{guide.page_count?` · ${guide.page_count}-page PDF`:bundled?' · PDF':''}</p>{guide.draft&&<span className="study-guide-draft">Clinical review draft</span>}</div><div className="study-guide-actions"><a href={guide.file_url} target="_blank" rel="noopener noreferrer" aria-label={'Preview '+guide.title}><ExternalLink size={16} aria-hidden="true"/>Preview</a><a className="study-guide-download" href={bundled?guide.file_url+'?download=1':guide.file_url} download target={bundled?undefined:'_blank'} rel="noopener noreferrer" aria-label={'Download '+guide.title}><Download size={16} aria-hidden="true"/>Download</a></div></li>;
  })}</ol>
  {!visible.length&&<div className="study-guide-empty"><h2>No guides match your search</h2><p>Try another topic or clear your filters.</p><button type="button" onClick={()=>{setCategory('All');setQuery('');}}>Show all guides</button></div>}
 </section>;
}
