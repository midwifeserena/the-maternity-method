import {validateNgn} from './ngn-standalone.mjs';
import {educationPatch} from './question-education.mjs';
const qFields=['bank_section','ngn_format','ngn_config','category','type','matrix_mode','stem','clinical_scenario','content_format','options','matrix_rows','chart','question_image_url','question_image_alt','topic','subtopic','difficulty','tags'];
const sFields=['answer_key','rationale','rationale_format','rationale_image_url','rationale_image_alt','nursing_tip','test_taking_tip','answer_explanations','row_explanations'];
export const questionFormats=[{value:'calculation',label:'Calculation · numeric answer'},{value:'ordered',label:'Ordered response'},{value:'dyad-cloze',label:'NGN · Paired rationale cloze'},{value:'bowtie',label:'NGN · Bowtie'},{value:'highlight',label:'NGN · Highlight findings'},{value:'cloze',label:'NGN · Drop-down cloze'},{value:'drag-cloze',label:'NGN · Drag-and-drop cloze'},{value:'drag-select',label:'NGN · Drag-and-drop selection'},{value:'single',label:'Single response'},{value:'sata',label:'Select all that apply'},{value:'matrix-single',label:'Matrix · one answer per row'},{value:'matrix-multiple',label:'Matrix · multiple answers per row'}];
export function formatOf(question){return question.ngn_format|| (question.type==='matrix'?'matrix-'+(question.matrix_mode??'single'):question.type)}
export function questionStatus(question){return question.archived_at?'archived':question.published?'published':'draft'}
export function questionDocument(question={},solution={},category='Antepartum'){
 return {question:{bank_section:question.bank_section??'standard',ngn_format:question.ngn_format??null,ngn_config:question.ngn_config??{},category:question.category??category,type:question.type??'single',matrix_mode:question.matrix_mode??'single',stem:question.stem??'',clinical_scenario:question.clinical_scenario??'',content_format:question.content_format??'plain',options:question.options??[{id:'a',label:''},{id:'b',label:''}],matrix_rows:question.matrix_rows??[],chart:question.chart??{},question_image_url:question.question_image_url??null,question_image_alt:question.question_image_alt??null,topic:question.topic??null,subtopic:question.subtopic??null,difficulty:question.difficulty??null,tags:question.tags??[]},solution:{answer_key:solution.answer_key??null,rationale:solution.rationale??'',rationale_format:solution.rationale_format??'plain',rationale_image_url:solution.rationale_image_url??null,rationale_image_alt:solution.rationale_image_alt??null,nursing_tip:solution.nursing_tip??null,test_taking_tip:solution.test_taking_tip??null,answer_explanations:solution.answer_explanations??{},row_explanations:solution.row_explanations??{}}};
}
export function validateQuestionDocument(input,{publish=false,categories=['Antepartum','Intrapartum','Postpartum','Newborn']}={}){
 const errors={};
 if(!input?.question||!input?.solution||typeof input.question!=='object'||typeof input.solution!=='object'||Array.isArray(input.question)||Array.isArray(input.solution))return {valid:false,errors:{question:'Provide question and rationale fields.'}};
 const q=input.question,s=input.solution;
 if(!['standard','ngn'].includes(q.bank_section??'standard'))errors.bank_section='Choose a supported question bank section.';
 if(q.ngn_format){const ngnErrors=validateNgn(q,s.answer_key);if(ngnErrors.length)errors.ngn_config=ngnErrors.join(' ')}else if(q.ngn_config&&Object.keys(q.ngn_config).length)errors.ngn_config='Choose an NGN format before adding NGN configuration.';
 for(const key of Object.keys(q))if(!qFields.includes(key))errors.question='Unsupported question field: '+key;
 for(const key of Object.keys(s))if(!sFields.includes(key))errors.rationale='Unsupported solution field: '+key;
 if(!categories.includes(q.category))errors.category='Choose a supported maternity category.';
 if(!['single','sata','matrix'].includes(q.type)||!['single','multiple'].includes(q.matrix_mode??'single'))errors.type='Choose a supported question format.';
 for(const [key,value,max] of [['stem',q.stem,15000],['clinical_scenario',q.clinical_scenario??'',20000],['rationale',s.rationale,20000],['topic',q.topic??'',200],['subtopic',q.subtopic??'',200],['nursing_tip',s.nursing_tip??'',6000],['test_taking_tip',s.test_taking_tip??'',6000]])if(typeof value!=='string'||value.length>max)errors[key]=`Use text up to ${max.toLocaleString()} characters.`;
 if(!['plain','markdown'].includes(q.content_format??'plain')||!['plain','markdown'].includes(s.rationale_format??'plain'))errors.format='Choose plain or formatted text.';
 if(q.difficulty!=null&&!['easy','medium','hard'].includes(q.difficulty))errors.difficulty='Choose Easy, Medium or Hard.';
 if(!Array.isArray(q.tags)||q.tags.length>30||q.tags.some(tag=>typeof tag!=='string'||!tag.trim()||tag.length>80))errors.tags='Use up to 30 tags, each up to 80 characters.';
 const entries=(values,max,name)=>{
  if(!Array.isArray(values)||values.length>max){errors[name]=`Use up to ${max} ${name}.`;return new Set()}
  const ids=new Set();
  for(const entry of values){if(!entry||typeof entry.id!=='string'||!entry.id.trim()||entry.id.length>100||['__proto__','prototype','constructor'].includes(entry.id)||ids.has(entry.id)||typeof entry.label!=='string'||entry.label.length>2000)errors[name]='Each '+name+' entry needs a unique stable ID and a text label.';else ids.add(entry.id)}
  return ids;
 };
 const choices=entries(q.options,q.ngn_format?100:20,'answers'),rows=entries(q.matrix_rows??[],20,'rows');
 const key=s.answer_key;
 if(q.type==='single'&&q.ngn_format!=='calculation'&&key!==null&&key!==''&&(!choices.has(key)||typeof key!=='string'))errors.answer_key='Choose a correct answer from the current choices.';
 if(q.type==='sata'&&key!==null&&(!Array.isArray(key)||new Set(key).size!==key.length||key.some(id=>!choices.has(id))))errors.answer_key='Select correct answers from the current choices.';
 if(q.type==='matrix'&&q.ngn_format!=='ordered'&&key!==null){
  if(typeof key!=='object'||Array.isArray(key))errors.answer_key='Configure a key for each matrix row.';
  else for(const [row,value] of Object.entries(key))if(!rows.has(row)||(q.matrix_mode==='multiple'?(!Array.isArray(value)||new Set(value).size!==value.length||value.some(id=>!choices.has(id))):(value!==''&&!choices.has(value))))errors.answer_key='Matrix keys must use the current row and column IDs.';
 }
 for(const [name,values,ids] of [['answer_explanations',s.answer_explanations??{},choices],['row_explanations',s.row_explanations??{},rows]])if(!values||typeof values!=='object'||Array.isArray(values)||Object.entries(values).some(([id,text])=>!ids.has(id)||typeof text!=='string'||text.length>6000))errors[name]='Explanations must match existing answer or row IDs.';
 if(q.chart===null||typeof q.chart!=='object'||Array.isArray(q.chart)||Object.values(q.chart).some(value=>typeof value!=='string'))errors.chart='Clinical chart sections must contain text.';
 try{educationPatch({question_image_url:q.question_image_url??null,question_image_alt:q.question_image_alt??null,rationale_image_url:s.rationale_image_url??null,rationale_image_alt:s.rationale_image_alt??null,nursing_tip:s.nursing_tip??null})}catch(error){errors.images=error.message}
 if(publish){
  if(!q.stem?.trim())errors.stem='Enter the question stem before publishing.';
  if(!s.rationale?.trim())errors.rationale='Add the overall rationale before publishing.';
  if(q.ngn_format!=='calculation'&&(!Array.isArray(q.options)||q.options.length<2||q.options.some(option=>!option.label?.trim())))errors.answers='Add at least two fully labelled answer choices.';
  if(q.type==='single'&&q.ngn_format!=='calculation'&&!choices.has(key))errors.answer_key='Mark exactly one correct answer.';
  if(q.type==='sata'&&(!Array.isArray(key)||!key.length))errors.answer_key='Mark at least one correct answer.';
  if(q.type==='matrix'&&q.ngn_format!=='ordered'){
   if(!Array.isArray(q.matrix_rows)||!q.matrix_rows.length||q.matrix_rows.some(row=>!row.label?.trim()))errors.rows='Add and label at least one clinical row.';
   if(!q.ngn_format&&q.options?.length>8)errors.answers='Use at most eight matrix columns.';
   for(const row of q.matrix_rows??[])if(q.matrix_mode==='multiple'?(!Array.isArray(key?.[row.id])||!key[row.id].length):!choices.has(key?.[row.id]))errors.answer_key='Configure a correct answer for every row.';
  }
  if(q.question_image_url&&!q.question_image_alt?.trim())errors.images='Add descriptive alt text for the question image.';
  if(s.rationale_image_url&&!s.rationale_image_alt?.trim())errors.images='Add descriptive alt text for the rationale image.';
 }
 try{if(JSON.stringify(input).length>200000)errors.question='This question is too large. Upload images rather than embedding image data.'}catch{errors.question='Invalid question data.'}
 return {valid:Object.keys(errors).length===0,errors};
}
export function applyTextFormat(text,start,end,format){
 const selected=text.slice(start,end)||'your text';let next;
 if(format==='bold')next='**'+selected+'**';else if(format==='italic')next='*'+selected+'*';else next=selected.split('\n').map((line,index)=>(format==='numbered'?`${index+1}. `:'- ')+line).join('\n');
 return {text:text.slice(0,start)+next+text.slice(end),start,end:start+next.length};
}
