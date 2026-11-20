'use client';

import {useState} from 'react';

export const papers = [
  ['blank','Blank'], ['ruled','Ruled'], ['wide','Wide ruled'], ['dotted','Dotted'],
  ['grid','Grid'], ['cornell','Cornell'], ['planner','Planner'],
] as const;
export const paperColors = [['white','White'], ['ivory','Ivory'], ['rose','Blush']] as const;
export type NotebookSetup = {title:string; paper:string; tone:string; landscape:boolean; cover:string};

export function NotebookTemplates({busy,onCancel,onCreate}:{
  busy:boolean; onCancel:()=>void; onCreate:(setup:NotebookSetup)=>void;
}) {
  const [setup,setSetup]=useState<NotebookSetup>({title:'',paper:'ruled',tone:'ivory',landscape:false,cover:'burgundy'});
  function update(patch:Partial<NotebookSetup>){setSetup(current=>({...current,...patch}));}
  return <form className="notebook-template-picker" onSubmit={event=>{event.preventDefault();onCreate(setup)}}>
    <div className="notebook-template-settings">
      <h2>New notebook</h2>
      <label className="studio-field">Title<input className="studio-input" autoFocus maxLength={120} placeholder="Untitled notebook" value={setup.title} onChange={e=>update({title:e.target.value})}/></label>
      <label className="studio-field">Cover<select value={setup.cover} onChange={e=>update({cover:e.target.value})}><option value="burgundy">Burgundy</option><option value="rose">Dusty rose</option><option value="linen">Linen</option></select></label>
      <label className="studio-field">Paper color<select value={setup.tone} onChange={e=>update({tone:e.target.value})}>{paperColors.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="studio-field">Orientation<select value={setup.landscape?'landscape':'portrait'} onChange={e=>update({landscape:e.target.value==='landscape'})}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
    </div>
    <fieldset className="notebook-template-options"><legend>Choose your paper</legend>
      {papers.map(([value,label])=><button type="button" key={value} aria-pressed={setup.paper===value} onClick={()=>update({paper:value})}><span className="notebook-template-preview" data-paper={value} data-tone={setup.tone} data-landscape={setup.landscape}/>{label}</button>)}
    </fieldset>
    <div className="studio-actions notebook-template-footer"><button type="button" className="studio-button" disabled={busy} onClick={onCancel}>Cancel</button><button className="studio-button studio-primary" disabled={busy}>Create notebook</button></div>
  </form>;
}
