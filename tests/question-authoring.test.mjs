import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {questionDocument,validateQuestionDocument,applyTextFormat,formatOf,questionStatus} from '../lib/question-authoring.mjs';
import {publicSnapshot} from '../lib/exam-review.mjs';
import {scoreQuestion} from '../lib/scoring.mjs';
test('incomplete drafts remain savable but publishing requires stem, labels, key and rationale',()=>{
 const draft=questionDocument();assert(validateQuestionDocument(draft).valid);const errors=validateQuestionDocument(draft,{publish:true});assert(!errors.valid);assert(errors.errors.stem);assert(errors.errors.answer_key);assert(errors.errors.rationale);
 const valid=questionDocument({stem:'Which action is appropriate?',options:[{id:'a',label:'Assess'},{id:'b',label:'Wait'}]},{answer_key:'a',rationale:'Assess relevant findings first.'});assert(validateQuestionDocument(valid,{publish:true}).valid);
});
test('all existing formats validate without changing answer identifiers or scoring',()=>{
 for(const [type,mode,key,answer] of [['single','single','a','a'],['sata','single',['a','b'],['a']],['matrix','single',{r1:'a'},{r1:'a'}],['matrix','multiple',{r1:['a','b']},{r1:['a']}]] ){
  const document=questionDocument({type,matrix_mode:mode,stem:'Question',options:[{id:'a',label:'Assess',images:[{url:'/a.png',alt:'Diagram'}]},{id:'b',label:'Monitor'}],matrix_rows:[{id:'r1',label:'Finding'}],chart:{Notes:'Original notes'}},{answer_key:key,rationale:'Original rationale'});
  assert(validateQuestionDocument(document,{publish:true}).valid);assert.equal(document.question.options[0].id,'a');assert.deepEqual(document.question.options[0].images,[{url:'/a.png',alt:'Diagram'}]);assert.deepEqual(scoreQuestion({...document.question,answer_key:document.solution.answer_key},answer),scoreQuestion({type,matrix_mode:mode,matrix_rows:[{id:'r1'}],answer_key:key},answer));
 }
});
test('authoring rejects score fields, duplicate choice IDs, invalid image URLs and unsafe publication keys',()=>{
 const doc=questionDocument();assert(!validateQuestionDocument({...doc,question:{...doc.question,earned:5}}).valid);assert(!validateQuestionDocument({...doc,question:{...doc.question,options:[{id:'a',label:'A'},{id:'a',label:'B'}]}}).valid);assert(!validateQuestionDocument({...doc,question:{...doc.question,question_image_url:'javascript:alert(1)'}}).valid);assert(!validateQuestionDocument({...doc,solution:{...doc.solution,answer_key:'unknown'}}).valid);
});
test('formatting helpers preserve surrounding text and safe renderer treats HTML as text',()=>{
 assert.equal(applyTextFormat('Assess first',0,6,'bold').text,'**Assess** first');assert.equal(applyTextFormat('A\nB',0,3,'bullets').text,'- A\n- B');
 const source=readFileSync(new URL('../components/formatted-text.tsx',import.meta.url),'utf8'),module={exports:{}},require=createRequire(import.meta.url);const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports','module',code)(require,module.exports,module);
 const html=renderToStaticMarkup(React.createElement(module.exports.FormattedText,{text:'**Assess**\n- <script>alert(1)</script>',format:'markdown'}));assert(html.includes('<strong>Assess</strong>'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert.equal(renderToStaticMarkup(React.createElement(module.exports.FormattedText,{text:'**literal old question**'})),'**literal old question**');
});
test('library status preserves archived distinctions and student whitelist excludes new private teaching fields',()=>{
 assert.equal(questionStatus({published:true,archived_at:'2026-11-04'}),'archived');assert.equal(formatOf({type:'matrix',matrix_mode:'multiple'}),'matrix-multiple');
 const view=publicSnapshot({id:'q',type:'single',stem:'Question',options:[{id:'a',label:'A'}],clinical_scenario:'Scenario',content_format:'markdown',answer_explanations:{a:'Private'},test_taking_tip:'Private',rationale_format:'markdown'});assert.equal(view.clinical_scenario,'Scenario');assert(!('answer_explanations' in view));assert(!('test_taking_tip' in view));assert(!('rationale_format' in view));
});
