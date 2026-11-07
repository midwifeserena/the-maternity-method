import test from 'node:test';
import assert from 'node:assert/strict';
import {planExamSelection} from '../lib/exam-selection.mjs';
const bank={standard:Array.from({length:150},(_,i)=>'s'+i),ngn:Array.from({length:150},(_,i)=>'n'+i),cases:Array.from({length:25},(_,i)=>'c'+i)};
for(const formats of [['standard'],['ngn'],['cases'],['standard','ngn'],['standard','cases'],['ngn','cases'],['standard','ngn','cases']]){
 test('exact totals and every format represented: '+formats.join('+'),()=>{
  for(let count=1;count<=150;count++){
   const result=planExamSelection({...bank,count,formats});
   if(count<formats.filter(f=>f!=='cases').length+(formats.includes('cases')?6:0)||(formats.length===1&&formats[0]==='cases'&&count%6)){assert(result.error);continue;}
   assert.equal(result.error,'');assert.equal(result.questionIds.length+result.caseIds.length*6,count);
   assert.equal(new Set(result.questionIds).size,result.questionIds.length);
   for(const f of formats)assert(f==='cases'?result.caseIds.length:result.questionIds.some(id=>id.startsWith(f==='standard'?'s':'n')));
  }
 });
}
test('capacity, empty filters and invalid numbers give actionable messages',()=>{
 for(const count of [0,151,1.5,NaN])assert(planExamSelection({...bank,count,formats:['standard']}).error);
 assert(planExamSelection({...bank,count:20,formats:[]}).error);
 assert(planExamSelection({...bank,ngn:[],count:20,formats:['ngn']}).error);
 assert(planExamSelection({...bank,cases:[],count:6,formats:['cases']}).error);
 assert(planExamSelection({...bank,standard:['s0'],cases:['c0'],count:8,formats:['standard','cases']}).error);
 assert.equal(planExamSelection({...bank,standard:['s0'],cases:['c0'],count:7,formats:['standard','cases']}).error,'');
 assert.equal(planExamSelection({...bank,standard:['s0'],count:150,formats:['standard','ngn','cases']}).error,'');
});
