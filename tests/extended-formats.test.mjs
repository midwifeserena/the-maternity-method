import test from 'node:test';import assert from 'node:assert/strict';
import {numericAnswer} from '../lib/extended-formats.mjs';import {scoreQuestion} from '../lib/scoring.mjs';import {ngnTemplate} from '../lib/ngn-standalone.mjs';import {isQuestionAnswered} from '../lib/exam-tools.mjs';import {buildExamReview,publicSnapshot} from '../lib/exam-review.mjs';import {parseCsv,convertQuestion} from '../scripts/build-publication-import.mjs';
test('numeric answers compare exact fixed point without silently rounding wrong submissions',()=>{
 for(const value of ['3.01','03.0100',3.01])assert.equal(numericAnswer(value,2),'301');
 for(const value of ['3.014','3.009','3.01 mg','3e0',true,null,{},'NaN','Infinity',''])assert.equal(numericAnswer(value,2),null);
 const q={...ngnTemplate('calculation').question,ngn_config:{decimal_places:1,unit:'mL'},answer_key:'7.0'};assert.equal(scoreQuestion(q,'7').earned,1);assert.equal(scoreQuestion(q,'7.04').earned,0);assert.equal(scoreQuestion(q,'0').earned,0);assert(isQuestionAnswered(q,'7.0'));assert(!isQuestionAnswered(q,''));
});
test('ordered scoring is all-or-nothing and unanswered default ordering earns nothing',()=>{
 const d=ngnTemplate('ordered'),q={...d.question,answer_key:d.solution.answer_key};for(const value of [null,[],['b','a'],['a','a'],['a','b','c'],{r1:'a',r2:'b'}])assert.equal(scoreQuestion(q,value).earned,0);assert.deepEqual(scoreQuestion(q,['a','b']),{earned:1,possible:1});assert(!isQuestionAnswered(q,null));assert(isQuestionAnswered(q,['b','a']));
});
test('paired rationale has no credit for only one correct blank',()=>{
 const d=ngnTemplate('dyad-cloze'),q={...d.question,answer_key:d.solution.answer_key};assert.deepEqual(scoreQuestion(q,{r1:'r1_1',r2:'r2_2'}),{earned:0,possible:1});assert.deepEqual(scoreQuestion(q,d.solution.answer_key),{earned:1,possible:1});
});
test('bowtie imported plus/minus is distinct from existing per-box grading',()=>{
 const d=ngnTemplate('bowtie'),group=d.question.ngn_config.groups[0],correct=d.solution.answer_key[group.id][0],wrong=group.option_ids.find(id=>!d.solution.answer_key[group.id].includes(id)),answer={[group.id]:[correct,wrong]},q={...d.question,answer_key:d.solution.answer_key};assert.equal(scoreQuestion(q,answer).earned,1);assert.equal(scoreQuestion({...q,ngn_config:{...q.ngn_config,scoring:'plus-minus'}},answer).earned,0);
});
test('extended public snapshots and archived review preserve selections without pre-reveal keys',()=>{
 for(const format of ['calculation','ordered','dyad-cloze']){const d=ngnTemplate(format),q={...d.question,id:'q',ngn_config:{...d.question.ngn_config,answer_key:'PRIVATE'}};assert(!JSON.stringify(publicSnapshot(q)).includes('PRIVATE'));const answer=d.solution.answer_key,points=scoreQuestion({...d.question,answer_key:answer},answer);const review=buildExamReview({mode:'test',snapshot_stage:'start',question_count:1},[{question_id:'q',response:answer,...points}],[{question_id:'q',position:1,question_snapshot:d.question,solution_snapshot:d.solution}]);assert.equal(review.items[0].question.ngn_format,format);assert.deepEqual(review.items[0].response,answer);assert.equal(review.items[0].earned,points.earned)}
});
test('CSV import preserves quoted multiline content and converter rejects unsupported data',()=>{
 const rows=parseCsv('id,stem\r\n"x","First line\nSecond ""quoted"" line"\r\n');assert.deepEqual(rows,[{id:'x',stem:'First line\nSecond "quoted" line'}]);assert.throws(()=>parseCsv('a,b\n1,2,3'));
 const raw={id:'fixture',topic:'Antepartum',difficulty:'Easy',subtopic:'Synthetic',type:'DROPDOWN_RATIONALE',stem:'Choose',text:'{1} because {2}',blanks:{1:{options:['A','B'],answer:'A'},2:{options:['X','Y'],answer:'Y'}},rationale:'Synthetic reasoning'};const d=convertQuestion(raw);assert.equal(d.question.ngn_format,'dyad-cloze');assert.equal(scoreQuestion({...d.question,answer_key:d.solution.answer_key},d.solution.answer_key).earned,1);assert.throws(()=>convertQuestion({...raw,type:'UNKNOWN'}));
});
