import test from 'node:test';import assert from 'node:assert/strict';
import {ngnFormats,ngnTemplate,validateNgn,convertNgnItem} from '../lib/ngn-standalone.mjs';
import {scoreQuestion} from '../lib/scoring.mjs';import {publicSnapshot,buildExamReview} from '../lib/exam-review.mjs';
import {questionDocument,validateQuestionDocument} from '../lib/question-authoring.mjs';
for(const format of ngnFormats)test(format+' authoring, canonical scoring and archived review',()=>{
 const d=ngnTemplate(format),q=d.question,key=d.solution.answer_key;assert.deepEqual(validateNgn(q,key),[]);assert.equal(validateQuestionDocument(questionDocument(q,d.solution),{publish:true}).valid,true);
 const perfect=scoreQuestion({...q,answer_key:key},key);assert(perfect.possible>0);assert.equal(perfect.earned,perfect.possible);assert.equal(scoreQuestion({...q,answer_key:key},null).earned,0);
 const publicQ=publicSnapshot({...q,ngn_config:{...q.ngn_config,answer_key:'PRIVATE'}});assert.equal(publicQ.ngn_format,format);assert(!JSON.stringify(publicQ).includes('PRIVATE'));
 const saved=buildExamReview({mode:'test',snapshot_stage:'start',question_count:1},[{question_id:q.id,response:key,...perfect}],[{question_id:q.id,position:1,question_snapshot:q,solution_snapshot:d.solution}]);assert.equal(saved.items[0].question.ngn_format,format);assert.deepEqual(saved.items[0].response,key);assert.equal(saved.items[0].status,'correct');
});
test('bowtie limits prevent select-everything and duplicate credit; partial credit is per box',()=>{
 const d=ngnTemplate('bowtie'),q={...d.question,answer_key:d.solution.answer_key},groups=q.ngn_config.groups;
 assert.deepEqual(scoreQuestion(q,{[groups[0].id]:[q.answer_key[groups[0].id][0]]}),{earned:1,possible:5});
 assert.equal(scoreQuestion(q,Object.fromEntries(groups.map(g=>[g.id,g.option_ids]))).earned,0);
 const id=q.answer_key[groups[0].id][0];assert.equal(scoreQuestion(q,{[groups[0].id]:[id,id]}).earned,0);
});
test('highlight +/- credit, cloze partial credit and public config validation',()=>{
 const h=ngnTemplate('highlight');assert.equal(scoreQuestion({...h.question,answer_key:h.solution.answer_key},h.question.options.map(o=>o.id)).earned,0);
 const c=ngnTemplate('cloze');assert.equal(scoreQuestion({...c.question,answer_key:c.solution.answer_key},{r1:'r1_2'}).earned,0);
 assert(validateNgn({...c.question,ngn_config:{...c.question.ngn_config,correct:'secret'}},c.solution.answer_key).length);
 assert(validateNgn({...c.question,ngn_config:{...c.question.ngn_config,template:'Bad {2}'}},c.solution.answer_key).length);
});
test('source conversions reject missing, unknown or ambiguous keys rather than guessing',()=>{
 const c={id:'c',topic:'Antepartum',published:false},i={id:'i',case_id:'c',review_status:'approved',published:false,stem:'Question',item_type:'Multiple Choice',content:{options:['A','B']}};
 assert.throws(()=>convertNgnItem(c,i,{item_id:'i',case_id:'c',answer:{correct:['Z']},rationale:'Reason'}));
 assert.throws(()=>convertNgnItem(c,{...i,content:{options:['A','A']}},{item_id:'i',case_id:'c',answer:{correct:['A']},rationale:'Reason'}));
});
