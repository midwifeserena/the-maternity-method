import {uuid} from './study-studio.mjs';
export const MAX_NOTEBOOK_PAGES=100;
export function pageSize(page){return {width:page?.width??1200,height:page?.height??850};}
export function makeBlankPage(reference){const size=reference?pageSize(reference):{width:1200,height:1697};return {id:crypto.randomUUID(),name:'Blank page',...size,elements:[]};}
export function insertNotebookPages(content,index,pages){if(!Number.isInteger(index)||index<0||index>content.pages.length||content.pages.length+pages.length>MAX_NOTEBOOK_PAGES)throw Error('Notebooks support up to 100 pages.');return {...content,pages:[...content.pages.slice(0,index),...pages,...content.pages.slice(index)]};}
export function reorderNotebookPage(content,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=content.pages.length||to>=content.pages.length)throw Error('Choose a valid page position.');const pages=[...content.pages],moved=pages.splice(from,1)[0];pages.splice(to,0,moved);return {...content,pages};}
export function pdfPageDescriptor(assetId,sourcePage,width,height,name){
 if(!uuid(assetId)||!Number.isInteger(sourcePage)||sourcePage<1||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('This PDF page could not be imported.');
 const scale=Math.min(1200/width,1800/height),w=Math.round(width*scale),h=Math.round(height*scale);if(w<200||h<200)throw Error('This PDF contains an unusually narrow page. Use a standard page size.');
 return {id:crypto.randomUUID(),name:String(name||'PDF page '+sourcePage).slice(0,100),width:w,height:h,background:{kind:'pdf',assetId,sourcePage},elements:[]};
}

// Shortest distance between the eraser sweep and every ink segment, including dots.
function pointSegmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function segmentsDistance(a,b,c,d){const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));}
export function strokeTouchesEraser(stroke,from,to,radius){if(stroke.kind!=='stroke'||!stroke.points?.length)return false;const tolerance=Math.max(0,radius)+stroke.width/2;return stroke.points.some((p,i)=>segmentsDistance(from,to,i?stroke.points[i-1]:p,p)<=tolerance);}
