import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreQuestion} from '../lib/scoring.mjs';
import {matrixRowScores,changeMatrixSelection,matrixSelection} from '../lib/matrix.mjs';
import {matrixDefinition} from '../lib/matrix-authoring.mjs';
import {isQuestionAnswered} from '../lib/exam-tools.mjs';
const q={id:'q',type:'matrix',matrix_mode:'multiple',stem:'Select appropriate actions.',options:[{id:'a',label:'Appropriate'},{id:'b',label:'Monitor'},{id:'c',label:'Avoid'}],matrix_rows:[{id:'r1',label:'Assess'},{id:'r2',label:'Notify'}],answer_key:{r1:['a','b'],r2:['a']},rationale:'Overall rationale',row_explanations:{r1:'Assessment first.'}};
test('multiple-response +/- partial credit is floored per row, never negative, and duplicates never add credit',()=>{
 assert.deepEqual(scoreQuestion(q,{r1:['a','b','c'],r2:['a']}),{earned:2,possible:3});assert.deepEqual(scoreQuestion(q,{r1:['c'],r2:['a']}),{earned:1,possible:3});assert.deepEqual(scoreQuestion(q,{r1:['a','a','b'],r2:['a','a']}),{earned:3,possible:3});assert.deepEqual(scoreQuestion(q,{}),{earned:0,possible:3});assert.deepEqual(matrixRowScores(q,{r1:['a'],r2:['a']}),[{id:'r1',earned:1,possible:2},{id:'r2',earned:1,possible:1}]);
});
test('existing matrix multiple-choice and single/SATA scores remain unchanged',()=>{
 const mc={...q,matrix_mode:'single',answer_key:{r1:'a',r2:'b'}};assert.deepEqual(scoreQuestion(mc,{r1:'a',r2:'c'}),{earned:1,possible:2});assert.deepEqual(scoreQuestion({...mc,matrix_mode:undefined},{r1:'a',r2:'b'}),{earned:2,possible:2});assert.deepEqual(scoreQuestion({type:'single',answer_key:'a'},'a'),{earned:1,possible:1});assert.deepEqual(scoreQuestion({type:'sata',answer_key:['a','b']},['a','c']),{earned:0,possible:2});
});
test('grid selections are independent per row and multiple response toggles without losing other selections',()=>{
 const initial={r1:['a'],r2:['b']},next=changeMatrixSelection(q,initial,'r1','b');assert.deepEqual(next,{r1:['a','b'],r2:['b']});assert.deepEqual(initial,{r1:['a'],r2:['b']});assert.deepEqual(changeMatrixSelection(q,next,'r1','a'),{r1:['b'],r2:['b']});assert(matrixSelection(q,next,'r1','b'));assert(!matrixSelection(q,next,'r2','a'));assert.deepEqual(changeMatrixSelection({...q,matrix_mode:'single'},{r1:'a',r2:'b'},'r1','c'),{r1:'c',r2:'b'});
});
test('answered-state detection supports both matrix modes and incomplete rows without accepting unknown options',()=>{
 assert(isQuestionAnswered(q,{r1:['a'],r2:['b']}));assert(!isQuestionAnswered(q,{r1:['a'],r2:[]}));assert(!isQuestionAnswered(q,{r1:['unknown'],r2:['b']}));assert(!isQuestionAnswered(q,{r1:'a',r2:'b'}));assert(isQuestionAnswered({...q,matrix_mode:'single'},{r1:'a',r2:'b'}));
});
test('matrix authoring rejects missing keys, duplicate IDs, private row fields and unknown answer choices',()=>{
 const {type,id,...definition}=q;assert.equal(matrixDefinition(definition).question.published,false);
 for(const altered of [{...definition,answer_key:{r1:[],r2:['a']}},{...definition,answer_key:{r1:['missing'],r2:['a']}},{...definition,matrix_rows:[{id:'r1',label:'A'},{id:'r1',label:'B'}]},{...definition,matrix_rows:[{id:'r1',label:'A',explanation:'secret'}]},{...definition,row_explanations:{unknown:'bad'}}])assert.throws(()=>matrixDefinition(altered));
});
