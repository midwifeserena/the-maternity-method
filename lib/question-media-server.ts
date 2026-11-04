import {normalizeRowExplanations} from '@/lib/matrix.mjs';
import {admin} from '@/lib/supabase/admin';
import {reviewImages} from '@/lib/exam-review.mjs';

const prefix='storage://question-media/';
function objectPath(value:unknown){
 if(typeof value!=='string'||!value.startsWith(prefix))return null;
 const path=value.slice(prefix.length);
 return path.length<=500&&/^[a-zA-Z0-9_./-]+$/.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..')?path:null;
}
/** Resolve private media only after the caller has authorized the question or
 * solution. Stored snapshots retain stable object references, never signed URLs. */
export async function resolveMediaRecords<T>(records:T[]):Promise<T[]>{
 const paths=new Set<string>();
 const mediaFields=['question_image_url','rationale_image_url','image_url','image_urls','images','question_images','question_image_url','rationale_images','diagram_file'];
 function visitMedia(value:unknown,transform:(value:unknown)=>unknown):unknown{
  if(Array.isArray(value))return value.map(entry=>visitMedia(entry,transform));
  if(value&&typeof value==='object'){
   const image={...value} as Record<string,unknown>;
   for(const field of ['url','src','image_url'])if(field in image)image[field]=transform(image[field]);
   return image;
  }
  return transform(value);
 }
 function visitRecord(value:unknown,transform:(value:unknown)=>unknown):unknown{
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const record={...value} as Record<string,unknown>;
  for(const field of mediaFields)if(field in record)record[field]=visitMedia(record[field],transform);
  for(const field of ['question_snapshot','solution_snapshot'])if(field in record)record[field]=visitRecord(record[field],transform);
  if(Array.isArray(record.options))record.options=record.options.map(option=>visitRecord(option,transform));
  return record;
 }
 records.forEach(record=>visitRecord(record,value=>{const path=objectPath(value);if(path)paths.add(path);return value}));
 if(!paths.size)return records;
 const urls=new Map<string,string>();
 const keys=[...paths];
 for(let start=0;start<keys.length;start+=100){
  const {data,error}=await admin().storage.from('question-media').createSignedUrls(keys.slice(start,start+100),86400);
  if(!error)for(const result of data??[])if(result.path&&result.signedUrl&&!result.error)urls.set(result.path,result.signedUrl);
 }
 return records.map(record=>visitRecord(record,value=>{
  if(typeof value!=='string'||!value.startsWith(prefix))return value;
  const path=objectPath(value);return path?urls.get(path)??null:null;
 }) as T);
}
export async function educationFeedback(solution:Record<string,unknown>){
 const [resolved]=await resolveMediaRecords([solution]);
 return {row_explanations:normalizeRowExplanations(solution.row_explanations),rationale_images:reviewImages(resolved),nursing_tip:typeof solution.nursing_tip==='string'&&solution.nursing_tip.trim()?solution.nursing_tip:null};
}
