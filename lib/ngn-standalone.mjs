import {validateExtended,scoreExtended,publicExtended,extendedTemplate} from './extended-formats.mjs';
/** Public configuration contains interaction structure only; keys stay private. */
export const ngnFormats=['bowtie','highlight','cloze','drag-cloze','drag-select','calculation','ordered','dyad-cloze'];
export const isNgnQuestion=q=>['calculation','ordered'].includes(q?.ngn_format)?q.bank_section==='ngn':q?.bank_section==='ngn'||Boolean(q?.ngn_format)||q?.type==='matrix';
const choice=(id,label)=>({id,label});
const text=(v,name)=>{if(typeof v!=='string'||!v.trim())throw Error('Missing '+name);return v};
const strings=(v,name)=>{if(!Array.isArray(v)||!v.length||v.some(s=>typeof s!=='string'||!s.trim())||new Set(v).size!==v.length)throw Error('Invalid '+name);return v};
const idAt=(options,value)=>{const found=options.filter(o=>o.label===value);if(found.length!==1)throw Error('Answer does not match a unique choice: '+value);return found[0].id};
export function convertNgnItem(caseRecord,item,solution){
 if(item.case_id!==caseRecord.id||solution?.item_id!==item.id||solution.case_id!==caseRecord.id)throw Error('Missing or mismatched answer record');
 if(item.review_status!=='approved'||item.published||caseRecord.published)throw Error('Only approved, unpublished questions in an unpublished case can be transferred');
 return normalizeNgnCaseItem(caseRecord,item,solution);
}
/** Shared format normalization; callers separately enforce publication/authorization. */
export function normalizeNgnCaseItem(caseRecord,item,solution){
 if(item.case_id!==caseRecord.id||solution?.item_id!==item.id||solution.case_id!==caseRecord.id)throw Error('Missing or mismatched answer record');
 const c=item.content??{},a=solution.answer??{},q={id:item.id,category:caseRecord.topic,type:'single',matrix_mode:'single',stem:text(item.stem,'question stem'),clinical_scenario:caseRecord.intro??'',content_format:'plain',options:[],matrix_rows:[],chart:caseRecord.tabs??{},bank_section:'ngn',ngn_format:null,ngn_config:{},tags:['NGN']};let key;
 const options=(values,prefix='o')=>strings(values,'answer choices').map((v,i)=>choice(prefix+(i+1),v));
 if(['Multiple Choice','Select All That Apply','Drag and Drop (select)'].includes(item.item_type)){
  q.options=options(c.options);q.type=item.item_type==='Multiple Choice'?'single':'sata';
  if(!Array.isArray(a.correct)||!a.correct.length)throw Error('Missing correct choices');
  key=a.correct.map(letter=>{const index=typeof letter==='string'&&/^[A-Z]$/.test(letter)?letter.charCodeAt(0)-65:-1;if(!q.options[index])throw Error('Invalid answer letter');return q.options[index].id});
  if(q.type==='single'){if(key.length!==1)throw Error('Multiple-choice question needs exactly one key');key=key[0]}
  if(item.item_type==='Drag and Drop (select)'){q.ngn_format='drag-select';q.ngn_config={heading:c.target_box??'Selected findings'}}
 }else if(['Matrix Multiple Choice','Matrix Multiple Response'].includes(item.item_type)){
  q.type='matrix';q.matrix_mode=item.item_type==='Matrix Multiple Response'?'multiple':'single';q.options=options(c.columns);q.matrix_rows=options(c.rows,'r');
  if(!Array.isArray(a.rows)||a.rows.length!==q.matrix_rows.length)throw Error('Incomplete matrix answer key');
  key=Object.fromEntries(q.matrix_rows.map((r,i)=>{const values=strings(a.rows[i],'matrix key').map(v=>idAt(q.options,v));if(q.matrix_mode==='single'&&values.length!==1)throw Error('Invalid single-response matrix key');return [r.id,q.matrix_mode==='single'?values[0]:values]}));
 }else if(item.item_type==='Highlight'){
  q.type='sata';q.ngn_format='highlight';q.options=options(c.segments);q.ngn_config={heading:c.heading??'Clinical findings'};
  if(!Array.isArray(a.highlight_segments)||!a.highlight_segments.length)throw Error('Missing highlight key');
  key=a.highlight_segments.map(n=>{if(!Number.isInteger(n)||!q.options[n-1])throw Error('Invalid highlight segment');return q.options[n-1].id});
 }else if(item.item_type==='Bowtie'){
  q.type='matrix';q.matrix_mode='multiple';q.ngn_format='bowtie';key={};
  q.ngn_config.groups=[['actions_to_take','Actions to take'],['potential_conditions','Potential condition'],['parameters_to_monitor','Parameters to monitor']].map(([id,label])=>{
   const entries=options(c[id],id+'_'),count=c.select_counts?.[id]??(id==='potential_conditions'?1:2);q.options.push(...entries);q.matrix_rows.push(choice(id,label));key[id]=strings(a[id],'bowtie key').map(v=>idAt(entries,v));
   if(!Number.isInteger(count)||count<1||count>entries.length||key[id].length!==count)throw Error('Bowtie selection count and key do not agree');
   return {id,label,select:count,option_ids:entries.map(o=>o.id)};
  });
 }else if(['Drop-Down Cloze','Drag and Drop Cloze'].includes(item.item_type)){
  q.type='matrix';q.ngn_format=item.item_type==='Drop-Down Cloze'?'cloze':'drag-cloze';q.ngn_config.template=text(c.template,'cloze template');key={};
  if(!Array.isArray(a.blanks)||!a.blanks.length)throw Error('Missing cloze key');
  if(q.ngn_format==='cloze'&&(!Array.isArray(c.blanks)||c.blanks.length!==a.blanks.length))throw Error('Cloze blank count mismatch');
  q.ngn_config.blanks=a.blanks.map((v,i)=>{const id='r'+(i+1),entries=options(q.ngn_format==='cloze'?c.blanks[i]:c.word_bank,id+'_');q.options.push(...entries);q.matrix_rows.push(choice(id,'Blank '+(i+1)));key[id]=idAt(entries,v);return {id,option_ids:entries.map(o=>o.id)}});
 }else throw Error('Unsupported format: '+item.item_type);
 const document={question:q,solution:{answer_key:key,rationale:text(solution.rationale,'rationale')}};
 const errors=validateNgn(q,key);if(errors.length)throw Error(errors.join(' '));return document;
}
export function validateNgn(q,key){
 const errors=[],format=q.ngn_format;if(!format)return errors;
 const extended=validateExtended(q,key);if(extended)return extended;
 if(!ngnFormats.includes(format))return ['Unsupported NGN format.'];
 const options=Array.isArray(q.options)?q.options:[],ids=new Set(options.map(o=>o.id)),config=q.ngn_config;
 if(!config||typeof config!=='object'||Array.isArray(config))return ['Provide the NGN configuration.'];
 const allowed=format==='bowtie'?['groups','scoring']:['cloze','drag-cloze','dyad-cloze'].includes(format)?['template','blanks']:['heading','select_count'];
 if(Object.keys(config).some(k=>!allowed.includes(k)))errors.push('Unsupported public NGN configuration field.');
 if(['highlight','drag-select'].includes(format)){
  if(q.type!=='sata'||!Array.isArray(key)||!key.length||new Set(key).size!==key.length||key.some(id=>!ids.has(id)))errors.push('Configure valid highlight/selection choices and keys.');
  if(config.heading!=null&&typeof config.heading!=='string')errors.push('The NGN heading must be text.');
  if(config.select_count!=null&&(!Number.isInteger(config.select_count)||config.select_count<1||config.select_count>options.length||key?.length!==config.select_count))errors.push('Selection count must match the correct key.');
  return errors;
 }
 if(q.type!=='matrix'||q.matrix_mode!==(format==='bowtie'?'multiple':'single'))errors.push('NGN format does not match the response structure.');
 const groups=format==='bowtie'?config.groups:config.blanks,rows=Array.isArray(q.matrix_rows)?q.matrix_rows:[];
 if(!Array.isArray(groups)||!groups.length||groups.length>20||groups.length!==rows.length)return [...errors,'Configure one group or blank per answer row.'];
 if(new Set(groups.map(g=>g?.id)).size!==groups.length||groups.some(g=>!rows.some(r=>r.id===g?.id)))errors.push('Group IDs must match the answer rows.');
 if(format==='dyad-cloze'&&groups.length!==2)errors.push('A paired rationale requires exactly two linked blanks.');
 if(format==='bowtie'&&config.scoring!=null&&!['per-box','plus-minus'].includes(config.scoring))errors.push('Choose a supported bowtie scoring rule.');
 if(format==='bowtie'&&groups.length!==3)errors.push('A bowtie needs three groups.');
 for(const group of groups){
  if(!group||Object.keys(group).some(k=>!(format==='bowtie'?['id','label','select','option_ids']:['id','option_ids']).includes(k)))errors.push('Unsupported NGN group field.');
  const choices=group?.option_ids;
  if(!Array.isArray(choices)||!choices.length||new Set(choices).size!==choices.length||choices.some(id=>!ids.has(id))){errors.push('Each group needs valid choice IDs.');continue}
  const value=key?.[group.id];
  if(format==='bowtie'){
   if(typeof group.label!=='string'||!group.label.trim()||!Number.isInteger(group.select)||group.select<1||group.select>choices.length||!Array.isArray(value)||value.length!==group.select||new Set(value).size!==value.length||value.some(id=>!choices.includes(id)))errors.push('Configure bowtie labels, selection counts and matching keys.');
  }else if(!choices.includes(value))errors.push('Each blank needs a correct answer from its choices.');
 }
 if(format!=='bowtie'){
  if(typeof config.template!=='string'||config.template.length>15000)errors.push('Provide a cloze template.');
  else{const tokens=[...config.template.matchAll(/\{(\d+)\}/g)].map(m=>Number(m[1]));if(tokens.length!==groups.length||new Set(tokens).size!==groups.length||groups.some((g,i)=>!tokens.includes(i+1)))errors.push('Template must contain each numbered blank exactly once, such as {1} and {2}.');}
 }
 return errors;
}
export function scoreNgn(q,answer){
 const extended=scoreExtended(q,answer);if(extended)return extended;
 if(q.ngn_format!=='bowtie')return null;
 if(validateNgn(q,q.answer_key).length)throw Error('Invalid archived NGN key');
 let earned=0,possible=0;
 for(const group of q.ngn_config.groups){
  possible+=group.select;const values=answer?.[group.id];
  if(!Array.isArray(values)||new Set(values).size!==values.length||values.length>group.select||values.some(id=>!group.option_ids.includes(id)))continue;
  const right=values.filter(id=>q.answer_key[group.id].includes(id)).length;earned+=q.ngn_config.scoring==='plus-minus'?Math.max(0,right-(values.length-right)):right;
 }
 return {earned,possible};
}
export function publicNgnConfig(q){
 const c=q?.ngn_config??{};const extended=publicExtended(q);if(extended)return extended;
 // Explicit allowlist; never pass arbitrary JSON (including possible embedded keys) to learners.
 if(q?.ngn_format==='bowtie')return {...(['per-box','plus-minus'].includes(c.scoring)?{scoring:c.scoring}:{}),groups:Array.isArray(c.groups)?c.groups.map(g=>({id:g.id,label:g.label,select:g.select,option_ids:g.option_ids})):[]};
 if(['cloze','drag-cloze','dyad-cloze'].includes(q?.ngn_format))return {template:typeof c.template==='string'?c.template:'',blanks:Array.isArray(c.blanks)?c.blanks.map(b=>({id:b.id,option_ids:b.option_ids})):[]};
 if(['highlight','drag-select'].includes(q?.ngn_format))return {heading:typeof c.heading==='string'?c.heading:'',...(Number.isInteger(c.select_count)?{select_count:c.select_count}:{})};
 return {};
}
export function ngnTemplate(format,category='Antepartum'){
 const extended=extendedTemplate(format,category);if(extended)return extended;
 const common={id:'template',case_id:'template',review_status:'approved',published:false,stem:'Enter the clinical question.'};let content,answer,type;
 if(format==='bowtie'){type='Bowtie';content={actions_to_take:['Action 1','Action 2','Action 3'],potential_conditions:['Condition 1','Condition 2'],parameters_to_monitor:['Parameter 1','Parameter 2','Parameter 3'],select_counts:{actions_to_take:2,potential_conditions:1,parameters_to_monitor:2}};answer={actions_to_take:['Action 1','Action 2'],potential_conditions:['Condition 1'],parameters_to_monitor:['Parameter 1','Parameter 2']}}
 else if(['cloze','drag-cloze','dyad-cloze'].includes(format)){type=format==='drag-cloze'?'Drag and Drop Cloze':'Drop-Down Cloze';content={template:'The priority finding is {1}.',blanks:[['Finding 1','Finding 2']],word_bank:['Finding 1','Finding 2']};answer={blanks:['Finding 1']}}
 else if(format==='highlight'){type='Highlight';content={heading:'Clinical findings',segments:['Finding 1','Finding 2']};answer={highlight_segments:[1]}}
 else{type='Drag and Drop (select)';content={target_box:'Selected findings',options:['Finding 1','Finding 2']};answer={correct:['A']}}
 const result=convertNgnItem({id:'template',topic:category,published:false,intro:'',tabs:{}},{...common,item_type:type,content},{item_id:'template',case_id:'template',answer,rationale:'Enter the clinical rationale.'});
 if(format==='dyad-cloze'){const q=result.question;q.ngn_format=format;q.ngn_config.template='The finding is {1} because of {2}.';q.options.push({id:'r2_1',label:'Reason 1'},{id:'r2_2',label:'Reason 2'});q.matrix_rows.push({id:'r2',label:'Blank 2'});q.ngn_config.blanks.push({id:'r2',option_ids:['r2_1','r2_2']});result.solution.answer_key.r2='r2_1'}return result;
}
