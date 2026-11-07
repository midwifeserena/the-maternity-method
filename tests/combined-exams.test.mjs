import test from 'node:test';
import assert from 'node:assert/strict';
import {CASE_ITEM_COUNT,validExamSelection,completeExamCases,caseItemDocument,scoreExamSnapshot} from '../lib/case-exam.mjs';
import {publicSnapshot,buildExamReview} from '../lib/exam-review.mjs';
import {ngnTemplate} from '../lib/ngn-standalone.mjs';
const caseId='60000000-0000-0000-0000-000000000001',itemId='70000000-0000-0000-0000-000000000001',snapshotId='80000000-0000-0000-0000-000000000001',qid='20000000-0000-0000-0000-000000000001';
const record={id:caseId,case_number:1,topic:'Antepartum',intro:'Patient story',tabs:{Notes:'Original chart'}};
const fixtures=[
 ['Multiple Choice',{options:['Assess','Wait']},{correct:['A']}],
 ['Select All That Apply',{options:['Assess','Reassess','Ignore']},{correct:['A','B']}],
 ['Drag and Drop (select)',{options:['Assess','Reassess','Ignore']},{correct:['A','B']}],
 ['Matrix Multiple Choice',{rows:['Finding'],columns:['Yes','No']},{rows:[['Yes']]}],
 ['Matrix Multiple Response',{rows:['Finding'],columns:['Yes','No','Maybe']},{rows:[['Yes','Maybe']]}],
 ['Highlight',{segments:['Concerning','Reassuring']},{highlight_segments:[1]}],
 ['Drop-Down Cloze',{template:'Choose {1}.',blanks:[['Assess','Wait']]},{blanks:['Assess']}],
 ['Drag and Drop Cloze',{template:'Choose {1}.',word_bank:['Assess','Wait']},{blanks:['Assess']}],
 ['Bowtie',{actions_to_take:['Assess','Ignore'],potential_conditions:['Condition','Other'],parameters_to_monitor:['Pulse','Nothing'],select_counts:{actions_to_take:1,potential_conditions:1,parameters_to_monitor:1}},{actions_to_take:['Assess'],potential_conditions:['Condition'],parameters_to_monitor:['Pulse']}]
];
for(const [type,content,answer] of fixtures)test('combined case preserves '+type+' scoring and archives only public question content',()=>{
 const item={id:itemId,case_id:caseId,item_number:1,item_type:type,stem:'What should the nurse do?',content,published:true};
 const key={item_id:itemId,case_id:caseId,answer,rationale:'Original rationale'};
 const doc=caseItemDocument(record,item,key,snapshotId),perfect=scoreExamSnapshot(doc.question,doc.solution,doc.solution.answer_key);
 assert.equal(perfect.earned,perfect.possible);assert(perfect.possible>0);assert.equal(scoreExamSnapshot(doc.question,doc.solution,null).earned,0);
 const visible=publicSnapshot(doc.question);assert.equal(visible.case_context.case_id,caseId);assert(!JSON.stringify(visible).includes('answer_key'));assert(!JSON.stringify(visible).includes('Original rationale'));assert(!JSON.stringify(visible).includes('legacy_ngn'));
 const review=buildExamReview({mode:'test',snapshot_stage:'start',question_count:1},[{question_id:snapshotId,response:doc.solution.answer_key,...perfect}],[{question_id:snapshotId,position:1,question_snapshot:doc.question,solution_snapshot:doc.solution}]);assert.equal(review.items[0].rationale,'Original rationale');assert.equal(review.items[0].status,'correct');assert.equal(review.items[0].question.case_context.item_number,1);
 if(type==='Matrix Multiple Response')assert.deepEqual(scoreExamSnapshot(doc.question,doc.solution,{r1:['o1']}),{earned:0,possible:1});
});
for(const format of ['calculation','ordered','dyad-cloze','bowtie','highlight','cloze'])test('canonical case '+format+' uses its existing scorer',()=>{
 const template=ngnTemplate(format),doc=caseItemDocument(record,{id:itemId,case_id:caseId,item_number:1,content:{question:template.question}},{item_id:itemId,case_id:caseId,answer:template.solution,rationale:'Reason'},snapshotId);
 const score=scoreExamSnapshot(doc.question,doc.solution,doc.solution.answer_key);assert.equal(score.earned,score.possible);assert.equal(scoreExamSnapshot(doc.question,doc.solution,null).earned,0);
});
test('all three selection types are valid; case blocks consume six slots and cannot exceed 50',()=>{
 assert.equal(CASE_ITEM_COUNT,6);assert(validExamSelection([qid],[],'test'));assert(validExamSelection([],[caseId],'study'));assert(validExamSelection([qid],[caseId],'test'));
 assert(!validExamSelection([],[],'study'));assert(!validExamSelection([qid,qid],[caseId],'test'));assert(!validExamSelection([qid],[caseId,caseId],'test'));assert(!validExamSelection([],[caseId],'bad'));assert(!validExamSelection(['not-a-uuid'],[caseId],'study'));
 const questions=Array.from({length:45},(_,i)=>`20000000-0000-0000-0000-${String(i).padStart(12,'0')}`);assert(!validExamSelection(questions,[caseId],'test'));assert(validExamSelection(questions.slice(0,44),[caseId],'test'));
});
test('only complete six-item cases are offered',()=>{
 const items=Array.from({length:6},(_,i)=>({case_id:caseId,item_number:i+1}));assert.equal(completeExamCases([record],items).length,1);assert.equal(completeExamCases([record],items.slice(1)).length,0);assert.equal(completeExamCases([record],[...items.slice(1),items[1]]).length,0);
});
test('ordinary standalone snapshot scoring is unchanged',()=>{assert.deepEqual(scoreExamSnapshot({type:'single',options:[]},{answer_key:'a'},'a'),{earned:1,possible:1})});
