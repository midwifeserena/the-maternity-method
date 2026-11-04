import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateExpression,formatExamTime,isQuestionAnswered} from '../lib/exam-tools.mjs';

test('calculator evaluates arithmetic with decimal precision, grouping, unary signs and percentages',()=>{
 for(const [expression,result] of [['(12.5 + 7.5) × 2','40'],['0.1+0.2','0.3'],['50*10%','5'],['-3*(2+4)','-18'],['.5÷.25','2'],['4−7','-3']])assert.equal(calculateExpression(expression),result);
});
test('calculator rejects code, malformed expressions, nonfinite results and division by zero',()=>{
 for(const value of ['globalThis.alert(1)','1;fetch("https://example.test")','2**3','1..2','(1+2','1/0','1/',''])assert.throws(()=>calculateExpression(value));
});
test('answer completeness matches single, SATA and matrix controls, including partially answered matrices',()=>{
 const options=[{id:'a'},{id:'b'}];
 assert(isQuestionAnswered({type:'single',options},'a'));assert(!isQuestionAnswered({type:'single',options},'z'));
 assert(isQuestionAnswered({type:'sata',options},['a','b']));assert(!isQuestionAnswered({type:'sata',options},[]));assert(!isQuestionAnswered({type:'sata',options},'a'));
 const matrix={type:'matrix',options,matrix_rows:[{id:'r1'},{id:'r2'}]};
 assert(!isQuestionAnswered(matrix,{r1:'a'}));assert(!isQuestionAnswered(matrix,null));assert(isQuestionAnswered(matrix,{r1:'a',r2:'b'}));
});
test('timer formats zero, minute and hour boundaries',()=>{
 assert.equal(formatExamTime(-1),'00:00:00');assert.equal(formatExamTime(1800),'00:30:00');assert.equal(formatExamTime(3661),'01:01:01');
});
