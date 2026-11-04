import {safeReviewImageUrl} from './exam-review.mjs';
const publicFields=['question_image_url','question_image_alt'];
const privateFields=['rationale_image_url','rationale_image_alt','nursing_tip'];
export function educationPatch(fields){
 if(!fields||typeof fields!=='object'||Array.isArray(fields)||!Object.keys(fields).length)throw Error('Choose education fields to update.');
 const question={},solution={};
 for(const [key,value] of Object.entries(fields)){
  if(![...publicFields,...privateFields].includes(key))throw Error('Unsupported education field: '+key);
  if(value!==null&&typeof value!=='string')throw Error('Education fields must be text or null.');
  const clean=typeof value==='string'?value.trim():null;
  const max=key==='nursing_tip'?6000:key.endsWith('_alt')?500:2000;
  if(clean&&clean.length>max)throw Error(key+' is too long.');
  if(clean&&key.endsWith('_url')&&!safeReviewImageUrl(clean)&&!/^storage:\/\/question-media\/[a-zA-Z0-9_./-]+$/.test(clean))throw Error('Use an HTTPS image URL or upload an image.');
  if(clean?.startsWith('storage://')&&clean.slice('storage://question-media/'.length).split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Invalid storage reference.');
  (publicFields.includes(key)?question:solution)[key]=clean||null;
 }
 return {question,solution};
}
export function uploadedImageType(bytes){
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))return {mime:'image/png',extension:'png'};
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',extension:'jpg'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {mime:'image/webp',extension:'webp'};
 return null;
}
