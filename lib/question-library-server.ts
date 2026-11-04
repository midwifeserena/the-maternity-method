import {admin} from '@/lib/supabase/admin';
import {formatOf,questionStatus} from '@/lib/question-authoring.mjs';
type Filters={search:string;category:string|null;type:string|null;status:string;difficulty:string|null;offset:number};
const missingColumn=(error:{code?:string}|null)=>Boolean(error&&['42703','PGRST204'].includes(error.code??''));
const projections=[
 'id,stem,category,type,matrix_mode,published,created_at,clinical_scenario,archived_at,content_format,difficulty,topic,subtopic,tags,editor_revision,updated_at,duplicated_from',
 'id,stem,category,type,matrix_mode,published,created_at',
 'id,stem,category,type,published,created_at'
];
/** Read-only compatibility for an existing bank before Studio SQL is installed.
 * Fetch only question metadata, never solutions; iterate deterministic pages so
 * Supabase's default row limit cannot silently hide the rest of the bank. */
export async function existingQuestionLibrary(db:ReturnType<typeof admin>,filters:Filters){
 let rows:Record<string,any>[]=[],projection=0;
 for(;projection<projections.length;projection++){
  rows=[];let retry=false;
  for(let offset=0;;offset+=500){
   const {data,error}=await db.from('questions').select(projections[projection]).order('created_at',{ascending:false}).order('id').range(offset,offset+499);
   if(error){if(missingColumn(error)&&projection<projections.length-1){retry=true;break}return {data:null,error}}
   rows.push(...(data??[]));if((data?.length??0)<500)break;
  }
  if(!retry)break;
 }
 const metadataReady=projection===0;
 // Difficulty metadata does not exist in the older schema. Do not interpret
 // an unavailable filter as "no matching questions".
 const effectiveDifficulty=metadataReady?filters.difficulty:null;
 const term=filters.search.toLocaleLowerCase();
 const matching=rows.filter(row=>{
  const text=[row.stem,row.clinical_scenario,row.topic,row.subtopic,...(Array.isArray(row.tags)?row.tags:[])].filter(value=>typeof value==='string').join(' ');
  const searchable=row.content_format==='markdown'?text.replace(/\*/g,''):text;
  return (!term||searchable.toLocaleLowerCase().includes(term))&&(!filters.category||row.category===filters.category)&&(!filters.type||formatOf(row)===filters.type)&&(!effectiveDifficulty||(effectiveDifficulty==='unset'?row.difficulty==null:row.difficulty===effectiveDifficulty));
 });
 const counts={all:matching.length,published:0,draft:0,archived:0};
 for(const row of matching)counts[questionStatus(row)]++;
 const visible=matching.filter(row=>filters.status==='all'||filters.status==='active'&&!row.archived_at||questionStatus(row)===filters.status);
 const page=visible.slice(filters.offset,filters.offset+25).map(row=>({id:row.id,stem:typeof row.stem==='string'?row.stem.slice(0,280):'',category:row.category,type:row.type,matrix_mode:row.matrix_mode??'single',published:row.published===true,archived_at:row.archived_at??null,content_format:row.content_format??'plain',difficulty:row.difficulty??null,topic:row.topic??null,subtopic:row.subtopic??null,tags:row.tags??[],editor_revision:row.editor_revision??0,updated_at:row.updated_at??row.created_at,duplicated_from:row.duplicated_from??null}));
 return {data:{questions:page,total:visible.length,counts,offset:filters.offset,limit:25,managementReady:false,filtersReady:{difficulty:metadataReady},notice:rows.length?'Your existing questions are loaded in view-only mode. Complete the Question Studio database setup to enable saving, publishing, duplication and archiving.':'Question Studio is in view-only mode until its database setup is complete.'},error:null};
}
