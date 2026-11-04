import test from 'node:test';
import assert from 'node:assert/strict';
import {buildExamReview,summarizeAttempt,responseStatus,publicSnapshot,reviewImages} from '../lib/exam-review.mjs';
import {scoreQuestion} from '../lib/scoring.mjs';
const attempt={id:'attempt',mode:'study',earned:3,possible:6,completed_at:'2026-11-04T12:00:00Z',question_count:3,snapshot_stage:'start'};
const question={id:'q',type:'sata',category:'Antepartum',stem:'Original question',options:[{id:'a',label:'Original A'},{id:'b',label:'B'}],matrix_rows:[],chart:{},image_url:'https://example.test/original.png'};
const snapshot={question_id:'q',position:2,question_snapshot:question,solution_snapshot:{answer_key:['a','b'],rationale:'Original rationale',image_url:'https://example.test/rationale.png'}};
test('review preserves archived questions, keys, rationale, images and stored scoring without rescoring',()=>{
 const responses=[{id:'r',question_id:'q',response:['a'],earned:1,possible:2}];
 const review=buildExamReview({...attempt,question_count:1},responses,[snapshot]);
 assert.equal(review.items[0].question.stem,'Original question');assert.equal(review.items[0].rationale,'Original rationale');
 assert.deepEqual(review.items[0].correctAnswer,['a','b']);assert.equal(review.items[0].status,'partial');assert.equal(review.items[0].earned,1);
 assert.equal(review.attempt.earned,3);assert.equal(review.attempt.percentage,50);assert.equal(review.items[0].rationaleImages.length,1);
 assert.equal(review.items[0].question.images[0].url,'https://example.test/original.png');assert.equal(responses[0].earned,1);
});
test('legacy sessions do not invent original content, keys, ordering, totals or missing responses',()=>{
 const old={...attempt,question_count:undefined,snapshot_stage:undefined};
 const legacy=buildExamReview(old,[{id:'r',question_id:'q',response:'a',earned:1,possible:1}],[]);
 assert.equal(legacy.items[0].question,null);assert.equal(legacy.items[0].correctAnswer,null);assert.equal(legacy.items[0].position,null);assert.equal(legacy.attempt.questionCount,null);assert.equal(legacy.attempt.countsScope,'recorded');assert(legacy.warnings.length>=2);
 const empty=buildExamReview(old,[],[]);assert.equal(empty.items.length,0);assert.equal(empty.attempt.correctCount,null);assert.equal(empty.attempt.earned,3);assert.match(empty.warnings[0],/no question-level/);
});
test('missing saved response is unavailable, while explicit empty response is unanswered',()=>{
 assert.equal(buildExamReview(attempt,[],[snapshot]).items[0].status,'unavailable');
 assert.equal(responseStatus({response:null,earned:0,possible:2}),'unanswered');
 assert.equal(responseStatus({response:{r1:''},earned:0,possible:2}),'unanswered');
 assert.equal(responseStatus({response:{r1:'a'},earned:1,possible:2}),'partial');
 assert.equal(responseStatus({response:'a',earned:3,possible:2}),'unavailable');
});
test('counts distinguish complete records, partial credit and unanswered; original totals remain unchanged',()=>{
 const responses=[{response:'a',earned:1,possible:1},{response:['a'],earned:1,possible:2},{response:null,earned:0,possible:3}];
 const summary=summarizeAttempt(attempt,responses);assert.equal(summary.correctCount,1);assert.equal(summary.incorrectCount,2);assert.equal(summary.partialCount,1);assert.equal(summary.unansweredCount,1);assert.equal(summary.countsScope,'complete');assert.equal(summary.earned,3);
});
test('existing single, SATA and NGN matrix scoring stays exact and duplicate SATA choices do not add credit',()=>{
 assert.deepEqual(scoreQuestion({type:'single',answer_key:'a'},'b'),{earned:0,possible:1});
 assert.deepEqual(scoreQuestion({type:'sata',answer_key:['a','b','c']},['a','a','b','x']),{earned:1,possible:3});
 assert.deepEqual(scoreQuestion({type:'matrix',matrix_rows:[{id:'r1'},{id:'r2'}],answer_key:{r1:'a',r2:'b'}},{r1:'a',r2:'a'}),{earned:1,possible:2});
});
test('public snapshots never return answer keys; image URLs reject executable schemes and credentials',()=>{
 const safe=publicSnapshot({...question,answer_key:['a'],rationale:'secret'});assert(!('answer_key' in safe));assert(!('rationale' in safe));
 assert.deepEqual(reviewImages({images:['javascript:alert(1)','http://example.test/a','//example.test/a','https://user:pass@example.test/a','/images/a.png','/images/a.png']}),[{url:'/images/a.png',alt:''}]);
 assert.equal(publicSnapshot({...question,type:'unsupported'}),null);
});
test('submission-time snapshots are labelled honestly',()=>{
 assert.match(buildExamReview({...attempt,snapshot_stage:'submission'},[],[snapshot]).warnings.join(' '),/when it was submitted/);
});

test('legacy fallback labels current questions and preserves recorded results even when current keys differ',()=>{
 const rows=[{id:'r',question_id:'q',response:['a'],earned:2,possible:2}];
 const result=buildExamReview({...attempt,snapshot_stage:null,question_count:null},rows,[],[question],[{question_id:'q',answer_key:['b'],rationale:'Current rationale'}]);
 assert.equal(result.items[0].contentSource,'current');assert.equal(result.items[0].question.stem,'Original question');assert.equal(result.items[0].rationale,'Current rationale');assert.equal(result.items[0].status,'correct');assert.equal(result.items[0].earned,2);assert.equal(result.attempt.earned,3);assert.equal(result.items[0].position,null);assert.equal(result.attempt.questionCount,null);assert.match(result.warnings.join(' '),/may have changed/);
});
test('saved archives always take precedence over current bank content',()=>{
 const result=buildExamReview(attempt,[{id:'r',question_id:'q',response:['a'],earned:1,possible:2}],[snapshot],[{...question,stem:'CURRENT EDIT'}],[{question_id:'q',answer_key:['b'],rationale:'CURRENT RATIONALE'}]);
 assert.equal(result.items[0].contentSource,'archived');assert.equal(result.items[0].question.stem,'Original question');assert.equal(result.items[0].rationale,'Original rationale');
});
test('changed answer identifiers and types are not silently mapped to new choices',()=>{
 for(const response of [['removed'],{oldRow:'a'},'a']){
  const result=buildExamReview(attempt,[{id:'r',question_id:'q',response,earned:1,possible:2}],[],[question],[]);assert.equal(result.items[0].selectionUnavailable,true);assert.deepEqual(result.items[0].response,response);
 }
 const missing=buildExamReview(attempt,[{id:'r',question_id:'missing',response:'a',earned:1,possible:1}],[],[question],[]);assert.equal(missing.items[0].question,null);assert.equal(missing.items[0].contentSource,'unavailable');assert.equal(missing.items[0].correctAnswer,null);
});
