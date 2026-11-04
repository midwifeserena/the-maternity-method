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
 function collect(value:unknown){
  if(typeof value==='string'){const path=objectPath(value);if(path)paths.add(path)}
  else if(Array.isArray(value))value.forEach(collect);
  else if(value&&typeof value==='object')Object.values(value).forEach(collect);
 }
 records.forEach(collect);
 if(!paths.size)return records;
 const urls=new Map<string,string>();
 const keys=[...paths];
 for(let start=0;start<keys.length;start+=100){
  const {data,error}=await admin().storage.from('question-media').createSignedUrls(keys.slice(start,start+100),86400);
  if(!error)for(const result of data??[])if(result.path&&result.signedUrl&&!result.error)urls.set(result.path,result.signedUrl);
 }
 function replace(value:unknown):unknown{
  if(typeof value==='string'&&value.startsWith(prefix)){const path=objectPath(value);return path?urls.get(path)??null:null}
  if(Array.isArray(value))return value.map(replace);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,replace(entry)]));
  return value;
 }
 return records.map(record=>replace(record) as T);
}
export async function educationFeedback(solution:Record<string,unknown>){
 const [resolved]=await resolveMediaRecords([solution]);
 return {rationale_images:reviewImages(resolved),nursing_tip:typeof solution.nursing_tip==='string'&&solution.nursing_tip.trim()?solution.nursing_tip:null};
}
