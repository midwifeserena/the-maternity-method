'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,BookOpen,FolderOpen,MoreHorizontal,Plus,Search,Star,Trash2,Upload} from 'lucide-react';
import {pageSize} from '@/lib/notebook-pages.mjs';
import {NotebookPdfPage} from './notebook-pdf-page';

type Changes={favorite?:boolean;folder?:string;trashed?:boolean};
export function NotebookLibrary({notes,loading,busy,onCreate,onImport,onOpen,onOrganize,onRefresh}:{
 notes:any[]; loading:boolean; busy:boolean; onCreate:()=>void; onImport:()=>void;
 onOpen:(note:any)=>void; onOrganize:(note:any,changes:Changes)=>void; onRefresh:()=>void;
}){
 const [query,setQuery]=useState(''),[view,setView]=useState('all'),[folder,setFolder]=useState('');
 const [sort,setSort]=useState('date'),[newMenu,setNewMenu]=useState(false),[menu,setMenu]=useState<string|null>(null);
 const [moving,setMoving]=useState<string|null>(null),[folderName,setFolderName]=useState('');
 const folders=[...new Set<string>(notes.filter(n=>!n.content?.trashed).map(n=>n.content?.folder).filter(Boolean))].sort();
 const visible=notes.filter(n=>{
  const content=n.content;
  if(Boolean(content?.trashed)!==(view==='trash'))return false;
  if(view==='favorites'&&!content?.favorite)return false;
  if(view==='folder'&&content?.folder!==folder)return false;
  const term=query.trim().toLowerCase();
  return !term||[n.title,content?.body,content?.folder,...(Array.isArray(content?.pages)?content.pages:[]).flatMap((p:any)=>(Array.isArray(p?.elements)?p.elements:[]).filter((e:any)=>e?.kind==='text').map((e:any)=>e.text))].some(value=>typeof value==='string'&&value.toLowerCase().includes(term));
 }).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):String(b.updated_at).localeCompare(String(a.updated_at)));
 function organize(note:any,changes:Changes){onOrganize(note,changes);setMenu(null);setMoving(null);}
 return <section className="notebook-library" aria-label="Notebook document library">
  <aside className="notebook-library-nav">
   <h2>Notebook</h2>
   <nav aria-label="Document collection">
    <button aria-current={view==='all'?'page':undefined} onClick={()=>setView('all')}><BookOpen size={18}/>All documents</button>
    <button aria-current={view==='favorites'?'page':undefined} onClick={()=>setView('favorites')}><Star size={18}/>Favorites</button>
    <button aria-current={view==='trash'?'page':undefined} onClick={()=>setView('trash')}><Trash2 size={18}/>Trash</button>
    {folders.map(name=><button key={name} aria-current={view==='folder'&&folder===name?'page':undefined} onClick={()=>{setFolder(name);setView('folder')}}><FolderOpen size={18}/>{name}</button>)}
   </nav>
   <Link href="/study-studio"><ArrowLeft size={16}/>Study Studio</Link>
  </aside>
  <div className="notebook-library-content">
   <div className="notebook-library-heading"><h2>{view==='folder'?folder:view==='trash'?'Trash':view==='favorites'?'Favorites':'Documents'}</h2>
    <div className="notebook-menu-anchor"><button className="studio-button studio-primary" aria-expanded={newMenu} disabled={busy} onClick={()=>setNewMenu(!newMenu)}><Plus size={18}/>New</button>
     {newMenu&&<div className="notebook-menu"><button onClick={onCreate}><BookOpen size={16}/>Notebook</button><button onClick={()=>{setNewMenu(false);onImport()}}><Upload size={16}/>Import PDF</button></div>}
    </div>
   </div>
   <div className="notebook-library-filters">
    <label className="notebook-search"><Search size={16}/><input aria-label="Search notebooks" placeholder="Find a notebook or typed note…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label>Sort <select aria-label="Sort notebooks" value={sort} onChange={e=>setSort(e.target.value)}><option value="date">Recent</option><option value="name">Name</option></select></label>
    <button className="studio-button" disabled={loading||busy} onClick={onRefresh}>Refresh</button>
   </div>
   {loading?<p role="status">Loading your documents…</p>:!visible.length?<div className="studio-card studio-empty"><h3>{view==='trash'?'Trash is empty':query||view!=='all'?'No matching documents':'Start with a notebook or a PDF'}</h3></div>:<div className="notebook-document-grid">
    {visible.map(note=>{
     const page=note.content?.pages?.[0],size=pageSize(page);
     return <article className="notebook-document" key={note.id}>
      <button className="notebook-cover" data-cover={note.content?.cover} disabled={busy||view==='trash'} aria-label={'Open notebook '+note.title} onClick={()=>onOpen(note)}>
       <div className="notebook-cover-paper" data-paper={page?.paper} data-tone={page?.tone} style={{aspectRatio:`${size.width}/${size.height}`}}>
        {page?.background?.kind==='pdf'&&<NotebookPdfPage assetId={page.background.assetId} sourcePage={page.background.sourcePage} width={170} height={170*size.height/size.width} owner={note.owner_id} lazy/>}
        <svg viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">{(Array.isArray(page?.elements)?page.elements:[]).filter(Boolean).map((e:any)=>e.kind==='stroke'?<polyline key={e.id} points={e.points.map((p:any)=>p.join(',')).join(' ')} fill="none" stroke={e.color} strokeWidth={e.width} opacity={e.opacity}/>:e.kind==='text'?<text key={e.id} x={e.x} y={e.y} fontSize={e.fontSize} fill={e.color}>{e.text.slice(0,150)}</text>:null)}</svg>
        {!page?.background&&!page?.elements?.length&&<div className="notebook-blank-cover"><BookOpen size={27}/><span>{note.title}</span></div>}
       </div>
      </button>
      <div className="notebook-document-title"><button className="notebook-name" disabled={busy||view==='trash'} onClick={()=>onOpen(note)}>{note.title}</button>{view!=='trash'&&<button className="studio-icon" aria-label={(note.content?.favorite?'Unfavorite ':'Favorite ')+note.title} aria-pressed={Boolean(note.content?.favorite)} disabled={busy} onClick={()=>organize(note,{favorite:!note.content?.favorite})}><Star size={16} fill={note.content?.favorite?'currentColor':'none'}/></button>}</div>
      <div className="notebook-document-meta"><span>{note.content?.pages?.length??0} pages · {new Date(note.updated_at).toLocaleDateString()}</span>
       {view==='trash'?<button className="studio-button" disabled={busy} onClick={()=>organize(note,{trashed:false})}>Restore</button>:<div className="notebook-menu-anchor">
        <button className="studio-icon" aria-label={'Actions for '+note.title} aria-expanded={menu===note.id} disabled={busy} onClick={()=>{setMenu(menu===note.id?null:note.id);setMoving(null)}}><MoreHorizontal size={18}/></button>
        {menu===note.id&&<div className="notebook-menu">
         {moving===note.id?<form onSubmit={e=>{e.preventDefault();organize(note,{folder:folderName.trim()})}}><label>Folder name<input className="studio-input" autoFocus maxLength={60} value={folderName} onChange={e=>setFolderName(e.target.value)}/></label>{folders.map(name=><button type="button" key={name} onClick={()=>organize(note,{folder:name})}>{name}</button>)}<button type="submit">Move notebook</button>{note.content?.folder&&<button type="button" onClick={()=>organize(note,{folder:''})}>Remove from folder</button>}</form>:<><button onClick={()=>{setMoving(note.id);setFolderName(note.content?.folder??'')}}><FolderOpen size={16}/>Move to folder</button><button onClick={()=>organize(note,{trashed:true})}><Trash2 size={16}/>Move to trash</button></>}
        </div>}
       </div>}
      </div>
     </article>;
    })}
   </div>}
  </div>
 </section>;
}
