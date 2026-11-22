import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
import {normalizeNgnCaseItem} from './ngn-standalone.mjs';
import {questionDocument,validateQuestionDocument} from './question-authoring.mjs';

const categories=['Antepartum','Intrapartum','Postpartum','Newborn','Pediatrics'];
const letters=['a','b','c','d','e','f'];
const required=['id','topic','type','difficulty','stem','rationale'];
const choiceColumns=['option_a','option_b','correct_answer'];
const bowtieColumns=['condition_options','condition_answer','action_options','action_answers','parameter_options','parameter_answers','scoring'];
const splitChoices=value=>value.split('|').map(choice=>choice.trim());

function bowtieResponse(row,source,category){
 if(row.scoring!=='+/-')throw Error('Use +/- for bow-tie scoring.');
 const content={
  actions_to_take:splitChoices(row.action_options),
  potential_conditions:splitChoices(row.condition_options),
  parameters_to_monitor:splitChoices(row.parameter_options),
 };
 const answer={
  actions_to_take:splitChoices(row.action_answers),
  potential_conditions:[row.condition_answer.trim()],
  parameters_to_monitor:splitChoices(row.parameter_answers),
 };
 const document=normalizeNgnCaseItem({id:source,topic:category},
  {id:source,case_id:source,stem:row.stem,item_type:'Bowtie',content},
  {item_id:source,case_id:source,answer,rationale:row.rationale});
 document.question.ngn_config.scoring='plus-minus';
 return document;
}

function choiceResponse(row,format){
 if(!['MCQ','SATA'].includes(format))throw Error('Choose MCQ, SATA, or BOWTIE as the type.');
 const keys=row.correct_answer.toLowerCase().split(/\s*,\s*/);
 if(format==='MCQ'&&keys.length!==1)throw Error('Mark exactly one correct answer.');
 const options=letters.flatMap(id=>row['option_'+id]?[{id,label:row['option_'+id]}]:[]);
 return {
  question:{type:format==='MCQ'?'single':'sata',options},
  solution:{answer_key:format==='MCQ'?keys[0]:keys,rationale:row.rationale},
 };
}

export function parseCsvQuestionImport(csv){
 const rows=parse(csv,{bom:true,skip_empty_lines:true,trim:true,columns(headers){
  if(new Set(headers).size!==headers.length||required.some(header=>!headers.includes(header))){
   throw Error('The CSV has missing or repeated question column headers.');
  }
  return headers;
 }});
 if(rows.length<1||rows.length>647)throw Error('Choose a CSV with 1 to 647 questions.');
 const seen=new Set();
 return rows.map((row,index)=>{
  const source=row.id.trim().toUpperCase();
  const fail=message=>{throw Error('Question '+(index+1)+': '+message)};
  if(!/^[A-Z0-9][A-Z0-9_-]{0,69}$/.test(source)||seen.has(source))fail('Use a unique source ID.');
  seen.add(source);
  const category=row.topic.startsWith('Pediatrics:')?'Pediatrics':row.topic;
  const format=row.type.toUpperCase();
  const columns=format==='BOWTIE'?bowtieColumns:choiceColumns;
  if(columns.some(column=>!(column in row)))fail('Missing columns for '+format+'.');
  let response;
  try{
   response=format==='BOWTIE'?bowtieResponse(row,source,category):choiceResponse(row,format);
  }catch(error){fail(error.message)}
  const extraTags=(row.tags??'').split(';').map(tag=>tag.trim()).filter(Boolean);
  if(extraTags.some(tag=>/^source:/i.test(tag)))fail('Source tags are assigned from the ID column.');
  const tags=[...new Set(['source:'+source,...extraTags,row.concept,row.client_need].filter(Boolean))];
  const document=questionDocument({
   ...response.question,category,stem:row.stem,
   topic:row.topic,subtopic:row.subtopic||null,difficulty:row.difficulty.toLowerCase()||null,tags,
  },{
   ...response.solution,nursing_tip:row.memory_hack||null,
  });
  const checked=validateQuestionDocument(document,{publish:true,categories});
  if(!checked.valid)fail(Object.values(checked.errors).join(' '));
  const bytes=createHash('sha256').update('the-maternity-method:csv:v1:'+source).digest();
  bytes[6]=(bytes[6]&15)|128;
  bytes[8]=(bytes[8]&63)|128;
  const id=bytes.subarray(0,16).toString('hex').replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5');
  return {id,...document};
 });
}
