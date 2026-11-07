import {normalizeNgnCaseItem} from './ngn-standalone.mjs';
import {publicSnapshot} from './exam-review.mjs';
import {scoreQuestion} from './scoring.mjs';
import {scoreLegacyNgn} from './ngn-case-scoring.mjs';
export const CASE_ITEM_COUNT=6,MAX_EXAM_ITEMS=150;
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function validExamSelection(questionIds,caseIds,mode){
 return Array.isArray(questionIds)&&Array.isArray(caseIds)&&['study','test'].includes(mode)&&questionIds.length+caseIds.length>0&&questionIds.length+caseIds.length*CASE_ITEM_COUNT<=MAX_EXAM_ITEMS&&questionIds.every(uuid)&&caseIds.every(uuid)&&new Set(questionIds).size===questionIds.length&&new Set(caseIds).size===caseIds.length;
}
export function completeExamCases(cases,items){
 return cases.filter(c=>{const group=items.filter(i=>i.case_id===c.id);return group.length===CASE_ITEM_COUNT&&new Set(group.map(i=>i.item_number)).size===CASE_ITEM_COUNT&&group.every(i=>Number.isInteger(i.item_number)&&i.item_number>=1&&i.item_number<=CASE_ITEM_COUNT);});
}
export function caseItemDocument(caseRecord,item,answerRecord,examId){
 if(!Number.isInteger(caseRecord.case_number)||caseRecord.case_number<1||!Number.isInteger(item.item_number)||item.item_number<1||item.item_number>6)throw Error('Invalid case numbering');
 if(item.case_id!==caseRecord.id||answerRecord.item_id!==item.id||answerRecord.case_id!==caseRecord.id)throw Error('Mismatched case answer');
 let question,solution;
 if(item.content?.question){question=publicSnapshot(item.content.question);if(!question||!Object.hasOwn(answerRecord.answer??{},'answer_key'))throw Error('Invalid case question');solution={...answerRecord.answer,answer_key:answerRecord.answer.answer_key,rationale:answerRecord.rationale};}
 else{const converted=normalizeNgnCaseItem(caseRecord,item,answerRecord);question=publicSnapshot(converted.question);solution={...answerRecord.answer,...converted.solution,legacy_ngn:{item_type:item.item_type,answer:answerRecord.answer}};}
 if(!question||!question.stem.trim()||typeof solution.rationale!=='string'||!solution.rationale.trim())throw Error('Case question or rationale unavailable');
 question={...question,id:examId,clinical_scenario:question.clinical_scenario||caseRecord.intro||'',chart:Object.keys(question.chart??{}).length?question.chart:caseRecord.tabs??{},case_context:{case_id:caseRecord.id,case_number:caseRecord.case_number,item_id:item.id,item_number:item.item_number,item_count:CASE_ITEM_COUNT}};
 // Check the key's scoring structure before creating any attempt.
 const probe=scoreExamSnapshot(question,solution,undefined);if(!Number.isInteger(probe.possible)||probe.possible<1)throw Error('Invalid scoring configuration');
 return {question,solution};
}
function legacyResponse(question,type,answer){
 const list=Array.isArray(answer)?[...new Set(answer)]:[],object=answer&&typeof answer==='object'&&!Array.isArray(answer)?answer:{};
 const label=id=>question.options.find(o=>o.id===id)?.label??'__unavailable_choice__';
 if(['Multiple Choice','Select All That Apply','Drag and Drop (select)'].includes(type)){const ids=question.type==='single'?(typeof answer==='string'?[answer]:[]):list;return {correct:ids.map(id=>{const i=question.options.findIndex(o=>o.id===id);return i<0?'?':String.fromCharCode(65+i)})};}
 if(type==='Highlight')return {highlight_segments:list.map(id=>question.options.findIndex(o=>o.id===id)+1)};
 if(type.startsWith('Matrix'))return {rows:question.matrix_rows.map(row=>{const v=object[row.id];return (Array.isArray(v)?[...new Set(v)]:typeof v==='string'?[v]:[]).map(label)})};
 if(type.includes('Cloze'))return {blanks:question.matrix_rows.map(row=>label(object[row.id]))};
 if(type==='Bowtie')return Object.fromEntries(question.ngn_config.groups.map(group=>[group.id,(Array.isArray(object[group.id])?[...new Set(object[group.id])]:[]).map(label)]));
 throw Error('Unsupported legacy case format');
}
export function scoreExamSnapshot(question,solution,answer){
 const legacy=solution.legacy_ngn;
 return legacy?scoreLegacyNgn(legacy.answer,legacyResponse(question,legacy.item_type,answer)):scoreQuestion({...question,answer_key:solution.answer_key},answer);
}
