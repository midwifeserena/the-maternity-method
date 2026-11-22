import {createHash} from 'node:crypto';
import {questionDocument,validateQuestionDocument} from './question-authoring.mjs';
import {scoreQuestion} from './scoring.mjs';

const categories=['Pediatrics','Intrapartum','Postpartum'];
const maternity=new Map([['MM-INT-060','Intrapartum'],['MM-PP-006','Postpartum']]);
const units={
 'MM-PED-SI-042':'mg','MM-PED-GD-083':'mL','MM-PED-GD-084':'mL/hr',
 'MM-PED-SI-082':'mL','MM-PED-CARD-042':'mL','MM-PED-GI-004':'mL',
 'MM-PED-GU-028':'mL/kg/hr','MM-PED-HEME-018':'cells/mm³','MM-PED-ENDO-013':'units','MM-PED-SKIN-017':'mL',
};

function stableId(source){
 const bytes=createHash('sha1').update('the-maternity-method:reviewed-batch:v1:'+source).digest().subarray(0,16);
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=bytes.toString('hex');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

export function parseDraftBankImport(markdown){
 const blocks=markdown.replaceAll('\r\n','\n').split(/^## (MM-[\w-]+) · (.+)$/m);
 const records=new Map();
 for(let i=1;i<blocks.length;i+=3){
  const [source,subtopic,body]=blocks.slice(i,i+3);
  const category=maternity.get(source)??(/^MM-PED-[A-Z]+-\d+$/.test(source)?'Pediatrics':null);
  if(!category)continue;
  if(records.has(source))throw Error('Duplicate source ID: '+source);
  const [meta,...lines]=body.trim().replace(/\n---\s*$/,'').split('\n');
  const [kind,topic,difficulty]=meta.replace(/^\*|\*$/g,'').split(' · ');
  const parts=lines.join('\n').match(/^(.*?)^\*\*Answer:\*\*\s*(.*?)^\*\*Rationale:\*\*\s*(.*)$/ms);
  if(!parts)throw Error('Missing answer or rationale: '+source);
  const [,prompt,answer,notes]=parts;
  const [rationale,nursingTip]=notes.split(/^\*\*Memory hack:\*\*\s*/m);
  const optionPattern=/^- \*\*([A-Z])\.\*\* (.+)$/gm;
  let options=[...prompt.matchAll(optionPattern)].map(match=>({id:match[1].toLowerCase(),label:match[2]}));
  const stem=prompt.split(/^- \*\*[A-Z]\.\*\* /m)[0].trim();
  let key=answer.trim().toLowerCase().split(/\s*[,>]\s*/),type='single',ngn_format=null,ngn_config={};
  if(kind==='Multiple choice'){
   if(key.length!==1)throw Error('Invalid answer: '+source);
   key=key[0];
  }else if(kind==='Select all that apply')type='sata';
  else if(kind==='Ordered response'){
   type='matrix';ngn_format='ordered';ngn_config={scoring:'all-or-nothing'};
   options=options.sort((a,b)=>stableId(source+a.id).localeCompare(stableId(source+b.id)));
  }else if(kind==='Calculation (fill in the blank)'){
   ngn_format='calculation';
   const decimal_places=stem.includes('one decimal place')?1:stem.includes('whole number')?0:null;
   if(decimal_places===null||!units[source])throw Error('Missing calculation settings: '+source);
   ngn_config={decimal_places,unit:units[source]};
   key=answer.trim();
  }else throw Error('Unsupported question format: '+source);
  const document=questionDocument({category,stem,options,type,ngn_format,ngn_config,topic,subtopic,difficulty:difficulty?.toLowerCase(),tags:['source:'+source]},
   {answer_key:key,rationale:rationale.trim(),nursing_tip:nursingTip?.trim()||null});
  const checked=validateQuestionDocument(document,{publish:true,categories});
  if(!checked.valid)throw Error(source+': '+Object.values(checked.errors).join(' '));
  const score=scoreQuestion({...document.question,answer_key:key},key);
  if(score.possible<=0||score.earned!==score.possible)throw Error('Answer failed scoring: '+source);
  records.set(source,{id:stableId(source),...document});
 }
 const result=[...records.values()];
 if(result.length!==647||result.filter(r=>r.question.category==='Pediatrics').length!==645)
  throw Error('Choose the original ALLv Markdown containing the 645 pediatric and two selected maternity questions.');
 return result;
}
