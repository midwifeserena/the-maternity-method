'use client';
import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type PointerEvent} from 'react';
import {Download,Eraser,Hand,Highlighter,ImagePlus,PenLine,Plus,Redo2,Save,Trash2,Type,Undo2,ArrowLeft,ArrowUp,ArrowDown,Upload,Maximize2,MousePointer2,Shapes,Lasso,Move,ArrowLeftRight,MoveDiagonal} from 'lucide-react';
import {assetUrl,blankNotebook,validNotebook,noteText,MAX_UPLOAD_BYTES} from '@/lib/study-studio.mjs';
import {strokeTouchesEraser,MAX_NOTEBOOK_PAGES,pageSize,makeBlankPage,insertNotebookPages,reorderNotebookPage,pdfPageDescriptor} from '@/lib/notebook-pages.mjs';
import {notebookTextLayout} from '@/lib/notebook-text';
import {inspectNotebookPdf} from '@/lib/notebook-pdf';
import {NotebookPdfPage} from './notebook-pdf-page';
import {NotebookTemplates,papers,paperColors,type NotebookSetup} from './notebook-templates';
import './notebook-workspace.css';
import {NotebookLibrary} from './notebook-library';
import {NotebookPdfPicker} from './notebook-pdf-picker';
import {studioRequest,studioSave,studioUpload} from './studio-client';
function strokeBounds(points:number[][]){
 return points.reduce((bounds,[x,y])=>({minX:Math.min(bounds.minX,x),minY:Math.min(bounds.minY,y),maxX:Math.max(bounds.maxX,x),maxY:Math.max(bounds.maxY,y)}),{minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity});
}
function insideLasso([x,y]:number[],path:number[][]){
 let inside=false;
 for(let i=0,j=path.length-1;i<path.length;j=i++){
  const [ax,ay]=path[i],[bx,by]=path[j];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function elementBounds(element:any,pageWidth:number){
 if(element.kind==='stroke')return strokeBounds(element.points);
 if(element.kind==='image')return {minX:element.x,minY:element.y,maxX:element.x+element.w,maxY:element.y+element.h};
 const layout=notebookTextLayout(element,pageWidth);
 return {minX:element.x,minY:layout.top,maxX:element.x+layout.width,maxY:layout.top+layout.height};
}
function sizeNotebookImage(image:{x:number;y:number;w:number;h:number},width:number,pageWidth:number,pageHeight:number){
 const ratio=image.h/image.w;
 const maxWidth=Math.max(20,Math.min(2400,pageWidth-image.x));
 const maxHeight=Math.max(20,Math.min(3400,pageHeight-image.y));
 const maxProportionalWidth=Math.min(maxWidth,maxHeight/ratio);
 const minProportionalWidth=Math.max(20,20/ratio);
 const w=Math.min(maxProportionalWidth,Math.max(minProportionalWidth,width));
 return {w:Math.max(20,w),h:Math.max(20,w*ratio)};
}
async function privatePdfFile(asset:any){const response=await fetch(assetUrl(asset.id),{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw Error('This private PDF is unavailable.');return new File([await response.arrayBuffer()],asset.name,{type:'application/pdf'});}
export function StudioNotebook(){
 const [notes,setNotes]=useState<any[]>([]),[active,setActive]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[importing,setImporting]=useState(false),[status,setStatus]=useState(''),[creating,setCreating]=useState(false);
 async function load(){setLoading(true);try{setNotes((await studioRequest('notes')).items.filter((n:any)=>n.kind==='notebook'));setError('')}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function create(setup:NotebookSetup){setBusy(true);try{const content={...blankNotebook(),cover:setup.cover,pages:[{...makeBlankPage(),paper:setup.paper,tone:setup.tone,...(setup.landscape?{width:1697,height:1200}:{})}]};const note=(await studioSave('notes',{title:setup.title.trim()||'Untitled notebook',kind:'notebook',content})).item;setCreating(false);setNotes(old=>[note,...old]);setActive(note);setError('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function importPdf(file:File,existing?:any){setBusy(true);setError('');setStatus('Reading PDF pages…');try{if(file.size>MAX_UPLOAD_BYTES)throw Error('Choose a PDF up to 3 MB.');const sizes=await inspectNotebookPdf(file,MAX_NOTEBOOK_PAGES);setStatus('Saving your private PDF…');const asset=existing??await studioUpload(file),pages=sizes.map((size,i)=>pdfPageDescriptor(asset.id,i+1,size.width,size.height,'PDF page '+(i+1))),note=(await studioSave('notes',{title:file.name.replace(/\.pdf$/i,'').slice(0,120)||'Imported notebook',kind:'notebook',content:{version:1,body:'',pages,attachments:[{id:asset.id,name:asset.name}]}})).item;setNotes(old=>[note,...old]);setActive(note);setImporting(false);}catch(e){setError((e as Error).message)}finally{setBusy(false);setStatus('')}}
 async function existingPdf(asset:any){setBusy(true);try{await importPdf(await privatePdfFile(asset),asset)}catch(e){setError((e as Error).message);setBusy(false)}}
 async function organize(note:any,changes:{favorite?:boolean;folder?:string;trashed?:boolean}) {
  setBusy(true);setError('');
  try {
   const item=(await studioSave('notes',{id:note.id,revision:note.revision,title:note.title,kind:'notebook',content:{...note.content,...changes}})).item;
   setNotes(old=>old.map(n=>n.id===item.id?item:n));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="notebook-workspace">{error&&<p className="studio-notice" role="alert">{error}</p>}{status&&<p className="studio-notice" role="status">{status}</p>}{active?<><div className="studio-actions"><button className="studio-button" onClick={()=>setActive(null)}><ArrowLeft size={16}/>Documents</button></div>{validNotebook(active.content)?<NotebookEditor key={active.id} note={active} onSaved={n=>{setActive((current:any)=>current?.id===active.id?n:current);setNotes(old=>old.some(item=>item.id===n.id)?old.map(item=>item.id===n.id?n:item):[n,...old])}}/>:<p role="alert" className="studio-notice">This notebook’s saved format is unavailable. Its original record has not been changed.</p>}</>:creating?<NotebookTemplates busy={busy} onCancel={()=>setCreating(false)} onCreate={setup=>void create(setup)}/>:<>
 <NotebookLibrary notes={notes} loading={loading} busy={busy} onCreate={()=>{setImporting(false);setCreating(true)}} onImport={()=>setImporting(true)} onOpen={n=>{setError('');setImporting(false);setActive(n)}} onOrganize={(note,changes)=>void organize(note,changes)} onRefresh={()=>void load()}/>
 {importing&&<NotebookPdfPicker busy={busy} onFile={f=>void importPdf(f)} onExisting={a=>void existingPdf(a)} onClose={()=>setImporting(false)}/>}
 </>}</div>;

}
function NotebookEditor({note,onSaved}:{note:any;onSaved:(note:any)=>void}){
 const [content,setContent]=useState<any>(note.content),[title,setTitle]=useState(note.title),[revision,setRevision]=useState(note.revision),[saved,setSaved]=useState(JSON.stringify({title:note.title,content:note.content}));
 const [page,setPage]=useState(0),[tool,setTool]=useState('pen'),[color,setColor]=useState('#4e3629'),[width,setWidth]=useState(3),[zoom,setZoom]=useState(0),[canvasWidth,setCanvasWidth]=useState(760),[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draftNotice,setDraftNotice]=useState(''),[pdfImport,setPdfImport]=useState(false),[deletePage,setDeletePage]=useState(false);
 const [editingText,setEditingText]=useState(false),[group,setGroup]=useState<string[]>([]),[lassoPath,setLassoPath]=useState<number[][]>([]);
 const [exporting,setExporting]=useState(''),[exportError,setExportError]=useState(''),[gestureVersion,setGestureVersion]=useState(0);
 const [history,setHistory]=useState<any[]>([]),[future,setFuture]=useState<any[]>([]),[draft,setDraft]=useState<any>(null);
 const savePending=useRef(false),wroteLocalDraft=useRef(false);
 const shell=useRef<HTMLElement>(null),scroller=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),gesture=useRef<any>(null),imageInput=useRef<HTMLInputElement>(null),fileInput=useRef<HTMLInputElement>(null);
 const current=content.pages[page]??content.pages[0],element=current.elements.find((e:any)=>e.id===selected),serialized=JSON.stringify({title,content}),dirty=serialized!==saved;
 const selectedItems=current.elements.filter((item:any)=>group.includes(item.id));
 const {width:pageWidth,height:pageHeight}=pageSize(current);
 const textLayout=element?.kind==='text'?notebookTextLayout(element,pageWidth):null;
 const scale=zoom||Math.min(1,Math.max(.05,(canvasWidth-36)/pageWidth));
 useEffect(()=>{
  const node=scroller.current;if(!node)return;
  const observer=new ResizeObserver(()=>setCanvasWidth(node.clientWidth));
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 const pageIndex=content.pages.findIndex((p:any)=>p.id===current.id);
 const draftKey='tmm:studio-draft:'+note.owner_id+':'+note.id;
 useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem(draftKey)||'null');if(raw&&validNotebook(raw.content)){setDraft(raw);setDraftNotice('A local draft is available. Restore it or keep the saved version.')}}catch{}},[draftKey]);
 useEffect(()=>{
  if(draft||gesture.current)return;
  try{
   if(dirty){
    localStorage.setItem(draftKey,JSON.stringify({title,content,revision}));
    wroteLocalDraft.current=true;
   }else if(wroteLocalDraft.current){
    localStorage.removeItem(draftKey);
    wroteLocalDraft.current=false;
   }
  }catch{
   if(dirty)setDraftNotice('This browser cannot keep a local draft. Use Save notebook to protect your work.');
  }
 },[dirty,draft,draftKey,title,content,revision,gestureVersion]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 function commit(next:any){setHistory(old=>[...old.slice(-29),content]);setFuture([]);setContent(next);setSelected(null);setGroup([]);setEditingText(false)}
 function elements(next:any[]){return {...content,pages:content.pages.map((p:any)=>p.id===current.id?{...p,elements:next}:p)}}
 function updateSelected(changes:any){
  if(!element)return;
  const next=elements(current.elements.map((e:any)=>e.id===element.id?{...e,...changes}:e));
  if(editingText)setContent(next);
  else{commit(next);setSelected(element.id);}
 }
 function editText(){setHistory(old=>[...old.slice(-29),content]);setFuture([]);setEditingText(true);}
 function removeSelection(){
  commit(elements(current.elements.filter((item:any)=>item.id!==selected&&!group.includes(item.id))));
 }
 function point(event:{clientX:number;clientY:number}){const rect=svg.current!.getBoundingClientRect();return [Math.max(0,Math.min(pageWidth,(event.clientX-rect.left)*pageWidth/rect.width)),Math.max(0,Math.min(pageHeight,(event.clientY-rect.top)*pageHeight/rect.height))]}
 // Use page-space geometry, rather than requiring an exact hit on thin SVG ink.
 function eraseAt(g:any,to:number[],target?:string|null){const from=g.last;g.last=to;const ids=current.elements.filter((e:any)=>e.kind==='stroke'?strokeTouchesEraser(e,from,to,g.radius):e.id===target).map((e:any)=>e.id);if(!ids.length)return;g.moved=true;setSelected(null);setContent((old:any)=>({...old,pages:old.pages.map((p:any)=>p.id===g.pageId?{...p,elements:p.elements.filter((e:any)=>!ids.includes(e.id))}:p)}));}
 function addText(x=60,y=100){if(current.elements.length>=500)return;const e={id:crypto.randomUUID(),kind:'text',x:Math.min(x,pageWidth-80),y:Math.max(24,Math.min(y,pageHeight-30)),boxWidth:Math.min(320,Math.max(80,pageWidth-x)),text:'',fontSize:24,color:tool==='highlight'?'#4e3629':color};commit(elements([...current.elements,e]));setSelected(e.id);setTool('select');setEditingText(true)}
 function beginObjectGesture(event:PointerEvent,moving:any[],kind='move'){
  if(busy||gesture.current||event.button!==0)return;
  if(event.currentTarget instanceof HTMLButtonElement){
   event.preventDefault();
   setEditingText(false);
   svg.current?.focus({preventScroll:true});
  }
  const bounds=moving.map(item=>elementBounds(item,pageWidth));
  gesture.current={
   kind,pointerId:event.pointerId,items:moving,start:point(event),before:content,
   pageId:current.id, bounds:{
    minX:Math.min(...bounds.map(b=>b.minX)),minY:Math.min(...bounds.map(b=>b.minY)),
    maxX:Math.max(...bounds.map(b=>b.maxX)),maxY:Math.max(...bounds.map(b=>b.maxY)),
   },
  };
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function adjustTextBox(event:KeyboardEvent<HTMLButtonElement>,resize=false){
  if(!textLayout||busy||gesture.current)return;
  const directions:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const direction=directions[event.key];
  if(!direction||(resize&&!direction[0]))return;
  event.preventDefault();
  const step=event.shiftKey?24:6;
  const [dx,dy]=direction.map(value=>value*step);
  if(resize){
   updateSelected({boxWidth:Math.min(Math.max(48,pageWidth-element.x),Math.max(48,textLayout.width+dx))});
  }else{
   updateSelected({
    x:Math.max(0,Math.min(Math.max(0,pageWidth-textLayout.width),element.x+dx)),
    y:Math.max(element.fontSize,Math.min(Math.max(element.fontSize,pageHeight-textLayout.height+element.fontSize),element.y+dy)),
   });
  }
 }
 function down(event:PointerEvent<SVGSVGElement>){
  if(event.button!==0)return;
  const inking=tool==='pen'||tool==='highlight'||tool==='shape';
  // Default focus can scroll the full SVG into view partway through a stroke.
  if(inking)event.preventDefault();
  if(busy||gesture.current)return;
  if(inking)event.currentTarget.focus({preventScroll:true});
  const p=point(event),target=(event.target as SVGElement).closest('[data-element]')?.getAttribute('data-element');
  if(tool==='pan'){if(event.pointerType==='touch')return;const parent=scroller.current!;gesture.current={kind:'pan',pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:parent.scrollLeft,top:parent.scrollTop};event.currentTarget.setPointerCapture(event.pointerId);return;}
  if(tool==='lasso'){
   setSelected(null);setGroup([]);
   gesture.current={kind:'lasso',pointerId:event.pointerId,points:[p]};
   event.currentTarget.setPointerCapture(event.pointerId);return;
  }
  if(tool==='select'){
   const e=current.elements.find((item:any)=>item.id===target);
   const moving=target&&group.includes(target)?selectedItems:e?[e]:[];
   if(moving.length<2){setGroup([]);setSelected(target??null);}
   if(moving.length){
    beginObjectGesture(event,moving);
   }
   return;
  }
  if(tool==='erase'){const rect=svg.current!.getBoundingClientRect(),g={kind:'erase',pointerId:event.pointerId,pageId:current.id,last:p,radius:8*pageWidth/rect.width,before:content,moved:false};gesture.current=g;event.currentTarget.setPointerCapture(event.pointerId);eraseAt(g,p,target);return;}
  if(tool==='text')return;
  if(current.elements.length>=500)return;gesture.current={kind:'stroke',pointerId:event.pointerId,highlight:tool==='highlight',shape:tool==='highlight'?'line':tool==='shape'?shape:null,id:crypto.randomUUID(),points:[p],color,width:tool==='highlight'?Math.max(width,12):width,opacity:tool==='highlight'?.3:1};event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event:PointerEvent){
  const g=gesture.current;if(!g||g.pointerId!==event.pointerId||busy||!event.currentTarget.hasPointerCapture(event.pointerId))return;
  if(g.kind==='pan'){const parent=scroller.current!;parent.scrollLeft=g.left+g.x-event.clientX;parent.scrollTop=g.top+g.y-event.clientY;return;}
  const p=point(event);
  if(g.kind==='erase'){eraseAt(g,p);return;}
  if(g.kind==='lasso'){
   const last=g.points.at(-1);
   if(g.points.length<1200&&Math.hypot(p[0]-last[0],p[1]-last[1])>=2){g.points.push(p);setLassoPath([...g.points]);}
   return;
  }
  if(g.kind==='stroke'){
   if(g.shape){
    const [x,y]=g.points[0], [u,v]=p;
    if(g.shape==='line')g.points=[[x,y],[u,v]];
    if(g.shape==='rectangle')g.points=[[x,y],[u,y],[u,v],[x,v],[x,y]];
    if(g.shape==='ellipse')g.points=[[x,y],...Array.from({length:49},(_,i)=>{
     const angle=i/48*Math.PI*2;
     return [(x+u)/2+(u-x)/2*Math.cos(angle),(y+v)/2+(v-y)/2*Math.sin(angle)];
    })];
   }else if(g.points.length<4000){
    const last=g.points.at(-1);
    if(Math.hypot(p[0]-last[0],p[1]-last[1])<.75)return;
    g.points.push(p);
   }
   setStroke({...g,points:g.shape==='ellipse'&&g.points.length>1?g.points.slice(1):[...g.points]});return;
  }
  const dx=p[0]-g.start[0],dy=p[1]-g.start[1];
  g.moved=g.moved||Math.abs(dx)+Math.abs(dy)>1;if(!g.moved)return;
  if(g.kind==='resize-text'||g.kind==='resize-image'){
   const item=g.items[0];
   const changes=g.kind==='resize-image'
    ?sizeNotebookImage(item,item.w+(dx+dy*(item.h/item.w))/(1+(item.h/item.w)**2),pageWidth,pageHeight)
    :{boxWidth:Math.min(Math.max(48,pageWidth-item.x),Math.max(48,g.bounds.maxX-item.x+dx))};
   setContent((old:any)=>({...old,pages:old.pages.map((pge:any)=>pge.id===g.pageId?{...pge,elements:pge.elements.map((e:any)=>e.id===item.id?{...e,...changes}:e)}:pge)}));
   return;
  }
  const shiftX=Math.max(Math.min(0,-g.bounds.minX),Math.min(Math.max(0,pageWidth-g.bounds.maxX),dx));
  const shiftY=Math.max(Math.min(0,-g.bounds.minY),Math.min(Math.max(0,pageHeight-g.bounds.maxY),dy));
  const translated=new Map(g.items.map((item:any)=>[item.id,item.kind==='stroke'?{
   ...item,points:item.points.map(([x,y]:number[])=>[Math.max(0,Math.min(pageWidth,x+shiftX)),Math.max(0,Math.min(pageHeight,y+shiftY))]),
  }:{...item,x:Math.max(0,Math.min(pageWidth,item.x+shiftX)),y:Math.max(0,Math.min(pageHeight,item.y+shiftY))}]));
  setContent((old:any)=>({...old,pages:old.pages.map((pge:any)=>pge.id===g.pageId?{...pge,elements:pge.elements.map((item:any)=>translated.get(item.id)??item)}:pge)}));
 }
 const [stroke,setStroke]=useState<any>(null),[shape,setShape]=useState('rectangle');
 function end(event:PointerEvent){const g=gesture.current;if(!g||g.pointerId!==event.pointerId)return;gesture.current=null;setGestureVersion(v=>v+1);setStroke(null);setDraftNotice('');if(g.kind==='pan')return;
  if(g.kind==='lasso'){
   setLassoPath([]);
   if(g.points.length<3)return;
   const ids=current.elements.filter((item:any)=>{
    if(item.kind==='stroke')return item.points.some((p:number[])=>insideLasso(p,g.points));
    const b=elementBounds(item,pageWidth);return insideLasso([(b.minX+b.maxX)/2,(b.minY+b.maxY)/2],g.points);
   }).map((item:any)=>item.id);
   if(ids.length===1)setSelected(ids[0]);else setGroup(ids);
   setTool('select');return;
  }
  if(g.kind==='stroke'){
   if(event.type!=='pointerup')return;
   if(g.shape==='line'){
    const start=g.points[0],finish=point(event);
    if(g.highlight&&Math.hypot(finish[0]-start[0],finish[1]-start[1])*scale<2)return;
    if(g.highlight||g.points.length>1)g.points=[start,finish];
   }
   if(g.points.length===1)g.points.push([Math.min(pageWidth,g.points[0][0]+.1),g.points[0][1]]);
   const points=g.shape==='ellipse'&&g.points.length>2?g.points.slice(1):g.points;
   commit(elements([...current.elements,{id:g.id,kind:'stroke',points,color:g.color,width:g.width,opacity:g.opacity}]));
  }else if(g.moved){setHistory(old=>[...old.slice(-29),g.before]);setFuture([]);}
 }

 async function save(copy=false){if(savePending.current||gesture.current||!title.trim())return;if(!validNotebook(content)){setError('This notebook exceeds its storage limits. Remove some annotations or pages and try again.');return;}savePending.current=true;setBusy(true);setError('');try{const next=(await studioSave('notes',{...(copy?{}:{id:note.id,revision}),title,kind:'notebook',content})).item;setRevision(next.revision);setTitle(next.title);setSaved(JSON.stringify({title:next.title,content}));try{localStorage.removeItem(draftKey)}catch{}setDraft(null);onSaved(next)}catch(e){setError((e as Error).message)}finally{savePending.current=false;setBusy(false)}}
 async function upload(file:File,image:boolean){setBusy(true);setError('');try{const asset=await studioUpload(file);if(image){if(!asset.mime.startsWith('image/'))throw Error('Choose an image for the canvas.');const dimensions=await new Promise<{w:number;h:number}>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({w:image.naturalWidth,h:image.naturalHeight});image.onerror=()=>reject(Error('Could not open image'));image.src=assetUrl(asset.id)});const scale=Math.min(Math.min(500,pageWidth-120)/dimensions.w,Math.min(400,pageHeight-120)/dimensions.h,1);const id=crypto.randomUUID();commit(elements([...current.elements,{id,kind:'image',assetId:asset.id,x:60,y:60,w:Math.max(20,dimensions.w*scale),h:Math.max(20,dimensions.h*scale)}]));setSelected(id);setTool('select');}
  else{const body=asset.mime==='text/plain'?(content.body+'\n\n'+await file.text()).trim().slice(0,100000):content.body;commit({...content,body,attachments:[...(content.attachments??[]),{id:asset.id,name:asset.name}]})}
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function insertBlank(index:number){try{const page={...makeBlankPage(current),paper:current.paper,tone:current.tone};commit(insertNotebookPages(content,index,[page]));setPage(index);setDeletePage(false)}catch(e){setError((e as Error).message)}}
 function duplicatePage(){
  try{
   const copy={...current,id:crypto.randomUUID(),name:(current.name+' copy').slice(0,100),elements:current.elements.map((item:any)=>({...item,id:crypto.randomUUID()}))};
   commit(insertNotebookPages(content,pageIndex+1,[copy]));setPage(pageIndex+1);setDeletePage(false);
  }catch(e){setError((e as Error).message)}
 }
 function movePage(to:number){commit(reorderNotebookPage(content,pageIndex,to));setPage(to);setDeletePage(false)}
 async function insertPdf(file:File,existing?:any){setBusy(true);setError('');try{if(file.size>MAX_UPLOAD_BYTES)throw Error('Choose a PDF up to 3 MB.');const sizes=await inspectNotebookPdf(file,MAX_NOTEBOOK_PAGES-content.pages.length),asset=existing??await studioUpload(file),pages=sizes.map((size,i)=>pdfPageDescriptor(asset.id,i+1,size.width,size.height,'PDF page '+(i+1)));const next=insertNotebookPages(content,pageIndex+1,pages);next.attachments=[...(content.attachments??[]).filter((a:any)=>a.id!==asset.id),{id:asset.id,name:asset.name}];commit(next);setPage(pageIndex+1);setPdfImport(false);setDeletePage(false)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function existingPdf(asset:any){setBusy(true);try{await insertPdf(await privatePdfFile(asset),asset)}catch(e){setError((e as Error).message);setBusy(false)}}
 function undo(){if(busy||!history.length||gesture.current)return;setFuture(old=>[content,...old]);setContent(history.at(-1));setHistory(old=>old.slice(0,-1));setSelected(null);setGroup([]);setEditingText(false)}
 function redo(){if(busy||!future.length||gesture.current)return;setHistory(old=>[...old,content]);setContent(future[0]);setFuture(old=>old.slice(1));setSelected(null);setGroup([]);setEditingText(false)}
 function download(blob:Blob,extension:string){
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=(title.trim()||'Notebook')+'.'+extension;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function exportPdf(){
  setExporting('Preparing PDF…');setExportError('');
  try{
   const {exportNotebookPdf}=await import('@/lib/notebook-export');
   const blob=await exportNotebookPdf(title,content.pages,page=>setExporting(`Exporting page ${page} of ${content.pages.length}…`));
   download(blob,'pdf');
  }catch(e){setExportError(e instanceof Error?e.message:'The PDF could not be exported.')}
  finally{setExporting('')}
 }

 return <section ref={shell} className="notebook-editor-shell" aria-label="Notebook editor" onKeyDown={event=>{
  if(!(event.metaKey||event.ctrlKey))return;
  const key=event.key.toLowerCase();
  if(key==='s'){event.preventDefault();if(!busy&&title.trim()&&!draft)void save();return;}
  if((event.target as HTMLElement).closest('input,textarea,select'))return;
  if(key==='z'||key==='y'){event.preventDefault();if(event.shiftKey||key==='y')redo();else undo();}
 }}><div className="notebook-editor-top"><input aria-label="Notebook title" className="studio-input studio-note-title" disabled={busy} value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/><div className="studio-actions"><button className="studio-button studio-primary" disabled={busy||!title.trim()||Boolean(draft)} onClick={()=>void save()}><Save size={16}/>Save notebook</button><span role="status" className="studio-saved">{savePending.current?'Saving…':dirty?'Unsaved changes':'Saved'}</span><button className="studio-button" disabled={Boolean(exporting)} onClick={()=>void exportPdf()}><Download size={15}/>Export PDF</button><button className="studio-button" onClick={()=>download(new Blob([JSON.stringify({title,content},null,2)],{type:'application/json'}),'json')}>Export editable JSON</button><button className="studio-button" aria-label="Full screen notebook" onClick={()=>{void (document.fullscreenElement?document.exitFullscreen():shell.current?.requestFullscreen?.())?.catch(()=>setError('Full screen is unavailable in this browser.'))}}><Maximize2 size={16}/></button></div></div>
 {exporting&&<p role="status" className="studio-notice">{exporting}</p>}{exportError&&<p role="alert" className="studio-notice">{exportError}</p>}
 {error&&<div className="studio-notice" role="alert">{error}<button className="studio-button ml-3" disabled={busy} onClick={()=>void save(true)}>Save as new notebook</button></div>}{draft&&<div className="studio-notice">A local draft is available.<div className="studio-actions"><button className="studio-button" onClick={()=>{setContent(draft.content);setTitle(draft.title);if(Number.isInteger(draft.revision)&&draft.revision>0)setRevision(draft.revision);setDraft(null);setDraftNotice('Draft restored. Save to sync it.')}}>Restore local draft</button><button className="studio-button" onClick={()=>{setDraft(null);try{localStorage.removeItem(draftKey)}catch{}setDraftNotice('')}}>Keep saved version</button></div></div>}
 {pdfImport&&<NotebookPdfPicker busy={busy} onFile={f=>void insertPdf(f)} onExisting={a=>void existingPdf(a)} onClose={()=>setPdfImport(false)}/>}
 <div className="notebook-editor-body"><nav className="notebook-page-rail" aria-label="Notebook pages">{content.pages.map((p:any,i:number)=><button type="button" key={p.id} aria-label={`Go to page ${i+1}: ${p.name}`} disabled={busy} aria-current={p.id===current.id?'page':undefined} onClick={()=>{setPage(i);setSelected(null);setGroup([]);setEditingText(false);setDeletePage(false)}}><span className="notebook-page-mini" data-paper={p.paper} data-tone={p.tone}>{p.background?'PDF · '+p.background.sourcePage:(papers.find(([value])=>value===p.paper)?.[1]??'Blank')}<br/>{p.elements.length} annotations</span><span>{i+1} · {p.name}</span></button>)}</nav><div className="notebook-editor-main">
 <div className="studio-toolbar" aria-label="Notebook tools"><button className="studio-button" disabled={busy||!history.length} onClick={undo}><Undo2 size={16}/>Undo</button><button className="studio-button" disabled={busy||!future.length} onClick={redo}><Redo2 size={16}/>Redo</button>{[['pan','Pan',Hand],['select','Select',MousePointer2],['lasso','Lasso',Lasso],['pen','Pen',PenLine],['highlight','Highlighter',Highlighter],['text','Text',Type],['shape','Shapes',Shapes],['erase','Eraser',Eraser]].map(([value,label,Icon]:any)=><button type="button" className="studio-button" key={value} disabled={busy} aria-pressed={tool===value} onClick={()=>{setTool(value);if(value==='highlight'){setColor('#e8c44a');setWidth(24)}else if((value==='pen'||value==='shape')&&width>8){setColor('#8e4a55');setWidth(3)}}}><Icon size={15}/>{label}</button>)}{tool==='shape'&&<label>Shape<select aria-label="Shape type" value={shape} onChange={e=>setShape(e.target.value)}><option value="rectangle">Rectangle</option><option value="ellipse">Ellipse</option><option value="line">Line</option></select></label>}<label>Ink<input type="color" aria-label="Ink color" disabled={busy} value={color} onChange={e=>{setColor(e.target.value);if(element?.kind==='text')updateSelected({color:e.target.value})}}/></label><div className="notebook-color-dots">{[['Plum','#8e4a55'],['Rose','#b38585'],['Blue','#376b9b'],['Green','#3a7257'],['Yellow','#e8c44a']].map(([name,ink])=><button type="button" key={ink} disabled={busy} aria-label={name+' ink'} aria-pressed={color===ink} style={{background:ink}} onClick={()=>{setColor(ink);if(element?.kind==='text')updateSelected({color:ink})}}/>)}</div><label>Width<select className="notebook-ink-width" aria-label="Pen width" disabled={busy} value={width} onChange={e=>setWidth(Number(e.target.value))}>{(tool==='highlight'||width>8?[12,18,24,36]:[2,3,5,8]).map(n=><option key={n}>{n}</option>)}</select></label><button className="studio-button" disabled={busy||current.elements.length>=500} onClick={()=>imageInput.current?.click()}><ImagePlus size={16}/>Add image</button><label>Zoom<select aria-label="Canvas zoom" value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={0}>Fit width</option>{[.25,.5,.75,1,1.25,1.5,2].map(z=><option value={z} key={z}>{z*100}%</option>)}</select></label></div>
 <div ref={scroller} className="studio-canvas-scroll"><div className="notebook-paper" data-tool={tool} data-paper={current.paper} data-tone={current.tone} style={{width:pageWidth*scale,height:pageHeight*scale,'--notebook-paper-spacing':`${32*scale}px`} as CSSProperties}>{current.background&&<NotebookPdfPage assetId={current.background.assetId} sourcePage={current.background.sourcePage} width={pageWidth*scale} height={pageHeight*scale} owner={note.owner_id}/>}<svg ref={svg} viewBox={`0 0 ${pageWidth} ${pageHeight}`} width={pageWidth*scale} height={pageHeight*scale} className="studio-canvas" style={{touchAction:tool==='pan'?'pan-x pan-y':'none',cursor:tool==='pan'?'grab':tool==='select'?'default':'crosshair'}} aria-label="Notebook drawing canvas" role="img" tabIndex={0} onKeyDown={e=>{if(e.key==='Escape'){setSelected(null);setGroup([]);}if((e.key==='Delete'||e.key==='Backspace')&&(selected||group.length)){e.preventDefault();removeSelection();}}} onClick={event=>{if(!busy&&tool==='text'){const [x,y]=point(event);addText(x,y);}}} onDoubleClick={event=>{
  const id=(event.target as SVGElement).closest('[data-element]')?.getAttribute('data-element');
  const [x,y]=point(event);
  const hit=current.elements.findLast((item:any)=>{
   if(item.kind!=='text')return false;
   const b=elementBounds(item,pageWidth);
   return item.id===id||(x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY);
  });
  if(!busy&&tool==='select'&&hit){setSelected(hit.id);editText();}
 }} onDragStart={event=>event.preventDefault()} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
 {current.elements.map((e:any)=>e.kind==='stroke'?<polyline key={e.id} data-element={e.id} points={e.points.map((p:any)=>p.join(',')).join(' ')} stroke={e.color} strokeWidth={e.width} opacity={e.opacity} fill="none" strokeLinecap="round" strokeLinejoin="round"/>:e.kind==='image'?<image key={e.id} data-element={e.id} href={assetUrl(e.assetId)} x={e.x} y={e.y} width={e.w} height={e.h} preserveAspectRatio="xMidYMid meet"/>:(()=>{
  const layout=notebookTextLayout(e,pageWidth);
  return <g key={e.id} data-element={e.id}>
   <rect x={e.x} y={layout.top} width={layout.width} height={layout.height} fill="transparent"/>
   {!(editingText&&e.id===selected)&&<text x={e.x} y={e.y} fill={e.color} fontSize={e.fontSize} fontFamily="Arial, sans-serif" opacity={e.text?1:.5} xmlSpace="preserve">{(e.text?layout.lines:['Type here']).map((line,n)=><tspan key={n} x={e.x} dy={n===0?0:layout.lineHeight}>{line||' '}</tspan>)}</text>}
  </g>;
 })())}
 {lassoPath.length>1&&<polyline points={lassoPath.map(p=>p.join(',')).join(' ')} fill="none" stroke="#803f4b" strokeWidth={2/scale} strokeDasharray={`${5/scale} ${4/scale}`} pointerEvents="none"/>}
 {selectedItems.map((item:any)=>{const b=elementBounds(item,pageWidth);return <rect key={item.id} x={b.minX-3} y={b.minY-3} width={Math.max(6,b.maxX-b.minX+6)} height={Math.max(6,b.maxY-b.minY+6)} fill="none" stroke="#803f4b" strokeDasharray="5 4" pointerEvents="none"/>})}
 {stroke&&<polyline points={stroke.points.map((p:any)=>p.join(',')).join(' ')} stroke={stroke.color} strokeWidth={stroke.width} opacity={stroke.opacity} fill="none" strokeLinecap="round"/>}{element?.kind==='stroke'&&<polyline points={element.points.map((p:any)=>p.join(',')).join(' ')} stroke="#803f4b" strokeWidth={element.width+4} opacity={.45} fill="none" strokeDasharray="6 5" pointerEvents="none"/>}{element?.kind==='image'&&<rect x={element.x-4} y={element.y-4} width={element.w+8} height={element.h+8} fill="none" stroke="#8e4a55" strokeDasharray="5 4" pointerEvents="none"/>}
 </svg>{tool==='select'&&element?.kind==='image'&&<button
  type="button" className="notebook-image-resize" aria-label="Resize image" title="Drag to resize image" disabled={busy}
  style={{left:Math.min(pageWidth,element.x+element.w)*scale,top:Math.min(pageHeight,element.y+element.h)*scale}}
  onPointerDown={event=>beginObjectGesture(event,[element],'resize-image')}
  onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
  onKeyDown={event=>{
   const direction=event.key==='ArrowRight'||event.key==='ArrowDown'?1:event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:0;
   if(!direction||busy||gesture.current)return;
   event.preventDefault();
   updateSelected(sizeNotebookImage(element,element.w+direction*(event.shiftKey?24:6),pageWidth,pageHeight));
  }}
 ><MoveDiagonal size={17}/></button>}{tool==='select'&&textLayout&&<div className="notebook-text-box" style={{
  left:element.x*scale,top:Math.max(0,textLayout.top*scale),
  width:textLayout.width*scale,height:Math.min(pageHeight-Math.max(0,textLayout.top),textLayout.height)*scale,
 }}>
  {editingText&&<textarea
   className="notebook-inline-text" aria-label="Edit canvas text" autoFocus readOnly={busy}
   style={{fontSize:element.fontSize*scale,color:element.color}}
   value={element.text} maxLength={20000} placeholder="Type here"
   onChange={e=>updateSelected({text:e.target.value})} onBlur={()=>setEditingText(false)}
   onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();svg.current?.focus({preventScroll:true});}}}
  />}
  <div className="notebook-text-controls" data-inset={textLayout.top*scale<38} style={{left:Math.min(0,Math.max(-element.x*scale,(pageWidth-element.x)*scale-130))}}>
   <button type="button" title="Drag to move text box" aria-label="Move text box" disabled={busy} className="notebook-text-drag"
    onKeyDown={event=>adjustTextBox(event)} onPointerDown={event=>beginObjectGesture(event,[element])} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><Move size={16}/></button>
   <button type="button" disabled={busy} onClick={editText}>Edit</button>
   <button type="button" title="Delete text box" aria-label="Delete text box" disabled={busy} onClick={removeSelection}><Trash2 size={16}/></button>
  </div>
  <button type="button" title="Drag to resize text box" aria-label="Resize text box" disabled={busy} className="notebook-text-resize"
   onKeyDown={event=>adjustTextBox(event,true)} onPointerDown={event=>beginObjectGesture(event,[element],'resize-text')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><ArrowLeftRight size={15}/></button>
 </div>}</div></div><div className="studio-inspector">{group.length?<><span>{group.length} items selected</span><button className="studio-button ml-3" disabled={busy} onClick={removeSelection}>Remove selected</button></>:element?<><p className="studio-eyebrow">Selected {element.kind}</p>{element.kind==='text'&&<><button className="studio-button" disabled={busy} onClick={editText}>Edit text</button><label className="studio-muted">Text size <select aria-label="Text size" disabled={busy} value={element.fontSize} onChange={e=>updateSelected({fontSize:Number(e.target.value)})}>{[16,20,24,32,40,48].map(n=><option key={n}>{n}</option>)}</select></label></>}{element.kind==='image'&&<label className="studio-muted">Image width <input type="range" aria-label="Image width" disabled={busy} min={20} max={Math.max(20,Math.floor(Math.min(pageWidth-element.x,(pageHeight-element.y)*element.w/element.h)))} value={element.w} onChange={e=>updateSelected(sizeNotebookImage(element,Number(e.target.value),pageWidth,pageHeight))}/></label>}<button className="studio-button ml-3" disabled={busy} onClick={removeSelection}>Remove selected</button></>:<p className="studio-muted">Choose Text and tap the page to type. Use Select to move, resize, or delete a text box.</p>}</div>
 <div className="notebook-page-actions">{!current.background&&<><label>Paper <select aria-label="Page template" disabled={busy} value={current.paper??'blank'} onChange={e=>commit({...content,pages:content.pages.map((p:any)=>p.id===current.id?{...p,paper:e.target.value}:p)})}>{papers.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Color <select aria-label="Page color" disabled={busy} value={current.tone??'white'} onChange={e=>commit({...content,pages:content.pages.map((p:any)=>p.id===current.id?{...p,tone:e.target.value}:p)})}>{paperColors.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></>}<button className="studio-button" disabled={busy} onClick={()=>fileInput.current?.click()}>Import text notes</button><span className="studio-muted">Page {pageIndex+1} of {content.pages.length}{current.background?' · PDF source page '+current.background.sourcePage:' · Blank page'}</span><button className="studio-button" disabled={busy||content.pages.length>=MAX_NOTEBOOK_PAGES} onClick={()=>insertBlank(pageIndex)}>Blank before</button><button className="studio-button" disabled={busy||content.pages.length>=MAX_NOTEBOOK_PAGES} onClick={()=>insertBlank(pageIndex+1)}><Plus size={15}/>Blank after</button><button className="studio-button" disabled={busy||content.pages.length>=MAX_NOTEBOOK_PAGES} onClick={()=>setPdfImport(true)}><Upload size={15}/>Add PDF pages</button><button className="studio-icon" aria-label="Move page earlier" disabled={pageIndex===0||busy} onClick={()=>movePage(pageIndex-1)}><ArrowUp size={16}/></button><button className="studio-icon" aria-label="Move page later" disabled={pageIndex===content.pages.length-1||busy} onClick={()=>movePage(pageIndex+1)}><ArrowDown size={16}/></button><button className="studio-button" disabled={busy||content.pages.length>=MAX_NOTEBOOK_PAGES} onClick={duplicatePage}>Duplicate page</button><button className="studio-button" disabled={content.pages.length===1||busy} onClick={()=>setDeletePage(true)}>Delete page</button></div>{deletePage&&<div className="studio-notice">Delete this notebook page and its annotations? The uploaded source PDF stays unchanged.<div className="studio-actions"><button className="studio-button" onClick={()=>{commit({...content,pages:content.pages.filter((p:any)=>p.id!==current.id)});setPage(Math.max(0,pageIndex-1));setDeletePage(false)}}>Delete this page</button><button className="studio-button" onClick={()=>setDeletePage(false)}>Keep page</button></div></div>}
 </div></div><div className="notebook-editor-notes">
 <label className="studio-field">Typed notes<textarea aria-label="Typed notebook notes" disabled={busy} value={content.body} maxLength={100000} onChange={e=>setContent({...content,body:e.target.value})} placeholder="Type additional notes here. This text can also become an audio recap."/></label><p className="studio-muted">{draftNotice||'Select Save notebook to sync your changes. This browser keeps a recovery draft.'}</p>{(content.attachments??[]).map((a:any)=><p className="studio-muted" key={a.id}><a className="underline" href={assetUrl(a.id)} target="_blank" rel="noopener noreferrer">{a.name}</a> · Original file in My Uploads{a.name.toLowerCase().endsWith('.pdf')&&<button className="studio-button ml-2" disabled={busy||content.pages.length>=MAX_NOTEBOOK_PAGES} onClick={()=>void existingPdf(a)}>Insert these PDF pages</button>}</p>)}
 <input ref={imageInput} aria-label="Choose notebook image" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0],true);e.target.value=''}}/><input ref={fileInput} aria-label="Choose notebook attachment" type="file" accept="text/plain" hidden onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0],false);e.target.value=''}}/>
 <span className="sr-only">{noteText(content).length} typed characters</span></div>
 </section>;
}
