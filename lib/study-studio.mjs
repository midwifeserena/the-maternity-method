export const STUDIO_BUCKET='student-study-studio',MAX_UPLOAD_BYTES=3*1024*1024;
export const uuid=value=>typeof value==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const color=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
export function blankNotebook(){return {version:1,body:'',pages:[{id:crypto.randomUUID(),name:'Page 1',width:1200,height:1697,elements:[]}]};}
export function validNotebook(value){
 if(!value||value.version!==1||!text(value.body??'',100000)||!Array.isArray(value.pages)||!value.pages.length||value.pages.length>100)return false;
 if(value.attachments!==undefined&&(!Array.isArray(value.attachments)||value.attachments.length>100||value.attachments.some(a=>!uuid(a.id)||!text(a.name,180))))return false;
 const ids=new Set();for(const page of value.pages){if(!uuid(page.id)||ids.has(page.id)||!text(page.name,100)||!Array.isArray(page.elements)||page.elements.length>500)return false;ids.add(page.id);
  const w=page.width??1200,h=page.height??850;if(!number(w,200,2400)||!number(h,200,3400))return false;
  if(page.background!==undefined&&(!page.background||page.background.kind!=='pdf'||!uuid(page.background.assetId)||!Number.isInteger(page.background.sourcePage)||page.background.sourcePage<1||page.background.sourcePage>100))return false;
  for(const e of page.elements){if(!e||!uuid(e.id)||ids.has(e.id))return false;ids.add(e.id);
   if(e.kind==='stroke'){if(!color(e.color)||!number(e.width,1,50)||!number(e.opacity,.1,1)||!Array.isArray(e.points)||!e.points.length||e.points.length>4000||e.points.some(p=>!Array.isArray(p)||p.length!==2||!number(p[0],0,w)||!number(p[1],0,h)))return false;}
   else if(e.kind==='text'){if(!text(e.text,20000)||!number(e.x,0,w)||!number(e.y,0,h)||!number(e.fontSize,12,60)||!color(e.color))return false;}
   else if(e.kind==='image'){if(!uuid(e.assetId)||!number(e.x,0,w)||!number(e.y,0,h)||!number(e.w,20,2400)||!number(e.h,20,3400))return false;}
   else return false;
  }
 }return JSON.stringify(value).length<=1500000;
}
export function noteText(content){return [content?.body??'',...(content?.pages??[]).flatMap(p=>(p.elements??[]).filter(e=>e.kind==='text').map(e=>e.text))].filter(Boolean).join('\n\n');}
export function validateStudioRecord(kind,input){
 if(kind==='notes')return text(input.title,120)&&Boolean(input.title.trim())&&['notebook','audio'].includes(input.kind)&&validNotebook(input.content);
 if(kind==='flashcards')return text(input.topic,100)&&Boolean(input.topic.trim())&&text(input.front,10000)&&Boolean(input.front.trim())&&text(input.back,20000)&&Boolean(input.back.trim())&&typeof input.high_yield==='boolean';
 return false;
}
export function detectStudioUpload(bytes,mime){
 const starts=signature=>signature.every((n,i)=>bytes[i]===n);
 if(mime==='application/pdf'&&starts([37,80,68,70,45]))return {mime,extension:'pdf'};
 if(mime==='image/png'&&starts([137,80,78,71,13,10,26,10]))return {mime,extension:'png'};
 if(mime==='image/jpeg'&&starts([255,216,255]))return {mime,extension:'jpg'};
 if(mime==='image/webp'&&starts([82,73,70,70])&&[87,69,66,80].every((n,i)=>bytes[i+8]===n))return {mime,extension:'webp'};
 if(mime==='text/plain'&&!bytes.includes(0)){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);return {mime,extension:'txt'};}catch{}}
 return null;
}
export const assetUrl=id=>'/api/study-studio/assets/'+id;

export const validAssetPath=(path,owner,id)=>['pdf','png','jpg','webp','txt'].some(ext=>path===`${owner}/${id}.${ext}`);
