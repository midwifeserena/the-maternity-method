import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFlashcardTest,flashcardTestScore,readCardProgress,definitionKey,speechChunks,shuffled} from '../lib/flashcard-study.mjs';
const cards=Array.from({length:8},(_,n)=>({id:'c'+n,front:'Term '+n,back:'Definition '+n,topic:'Antepartum',high_yield:n%2===0,card_number:n}));
test('multiple-choice quiz snapshots existing content, preserves one key and unique choices per term',()=>{
 const before=structuredClone(cards),questions=buildFlashcardTest(cards,8,'choice',()=>.5);assert.equal(questions.length,8);assert.equal(new Set(questions.map(q=>q.card.id)).size,8);
 for(const q of questions){assert.equal(q.choices.length,4);assert.equal(q.choices.filter(c=>c.id===q.correctId).length,1);assert(q.choices.some(c=>c.text===q.card.back&&c.id===q.correctId));assert.equal(new Set(q.choices.map(c=>definitionKey(c.text))).size,q.choices.length);for(const c of q.choices)assert(cards.some(card=>card.id===c.id&&card.back===c.text));}
 questions[0].card.front='Test snapshot edit';assert.deepEqual(cards,before);
});
test('small and duplicate decks never invent distractors, and written recall works with one card',()=>{
 const input=[cards[0],{...cards[1],back:'  DEFINITION  0 '}];assert.throws(()=>buildFlashcardTest(input,2,'choice'),/two different/);const qs=buildFlashcardTest([cards[0]],1,'written');assert.equal(qs[0].choices.length,0);assert.equal(qs[0].card.front,cards[0].front);assert.equal(buildFlashcardTest(cards.slice(0,2),2,'choice')[0].choices.length,2);
 assert.throws(()=>buildFlashcardTest([cards[0],{...cards[1],front:cards[0].front}],2,'choice'),/unambiguous/);
 for(const count of [0,1.5,9,NaN])assert.throws(()=>buildFlashcardTest(cards,count));
});
test('test grading counts omissions and preserves saved choices',()=>{
 const qs=buildFlashcardTest(cards,3,'choice',()=>.5),answers={[qs[0].card.id]:qs[0].correctId,[qs[1].card.id]:qs[1].choices.find(c=>c.id!==qs[1].correctId).id},before={...answers};const result=flashcardTestScore(qs,answers,'choice');assert.deepEqual(result,{correct:1,total:3,answered:2,omitted:1,assessed:3,percent:33});assert.deepEqual(answers,before);
});
test('written recall stays self-graded and ungraded until every item has a rating',()=>{
 const qs=buildFlashcardTest(cards,2,'written',()=>.5),answers={[qs[0].card.id]:qs[0].card.back};assert.equal(flashcardTestScore(qs,answers,'written').percent,null);assert.equal(flashcardTestScore(qs,answers,'written',{[qs[0].card.id]:'known'}).percent,null);assert.equal(flashcardTestScore(qs,answers,'written',{[qs[0].card.id]:'known',[qs[1].card.id]:'learning'}).percent,50);
});
test('progress recovers from damaged data and accepts only known rating values and unique string stars',()=>{
 assert.deepEqual(readCardProgress('{broken'),{ratings:{},starred:[]});assert.deepEqual(readCardProgress(JSON.stringify({ratings:{c1:'known',c2:'learning',c3:'wrong'},starred:['c1','c1',2]})),{ratings:{c1:'known',c2:'learning'},starred:['c1']});assert.equal(definitionKey('  A\n B '),'a b');
});
test('speech chunks preserve text while bounding utterance length and shuffle does not change source',()=>{
 const text=('A clinical reminder. ').repeat(100),chunks=speechChunks(text);assert(chunks.length>1);assert(chunks.every(c=>c.length<=180));assert.equal(chunks.join(' '),text.trim());assert(speechChunks('x'.repeat(600)).every(c=>c.length<=180));assert.deepEqual(speechChunks('  '),[]);const input=[1,2,3,4];const result=shuffled(input,()=>0);assert.deepEqual(input,[1,2,3,4]);assert.equal(result.length,4);assert.equal(new Set(result).size,4);
});
