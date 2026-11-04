import test from 'node:test';
import assert from 'node:assert/strict';
import {educationPatch,uploadedImageType} from '../lib/question-education.mjs';
import {publicSnapshot,buildExamReview} from '../lib/exam-review.mjs';
import {scoreQuestion} from '../lib/scoring.mjs';
test('education fields separate public question images from protected solutions and validate URL/lengths',()=>{
 const result=educationPatch({question_image_url:'https://example.test/q.png',question_image_alt:'FHR strip',rationale_image_url:'storage://question-media/a/rationale.png',rationale_image_alt:'Interpretation',nursing_tip:' Safety reminder '});assert.equal(result.question.question_image_alt,'FHR strip');assert.equal(result.solution.nursing_tip,'Safety reminder');assert(!('nursing_tip' in result.question));
 for(const fields of [{answer_key:'a'},{nursing_tip:7},{rationale_image_url:'javascript:alert(1)'},{rationale_image_url:'storage://question-media/../secret'},{nursing_tip:'x'.repeat(6001)}])assert.throws(()=>educationPatch(fields));
 assert.deepEqual(educationPatch({nursing_tip:''}).solution,{nursing_tip:null});
});
test('image magic bytes accept supported formats and reject SVG/text or missing bytes',()=>{
 assert.equal(uploadedImageType(new Uint8Array([137,80,78,71,13,10,26,10])).mime,'image/png');assert.equal(uploadedImageType(new Uint8Array([255,216,255])).mime,'image/jpeg');assert.equal(uploadedImageType(new TextEncoder().encode('RIFF0000WEBP')).mime,'image/webp');assert.equal(uploadedImageType(new TextEncoder().encode('<svg></svg>')),null);
});
test('public question payload carries image alt text but never a rationale image or nursing tip',()=>{
 const q={id:'q',type:'single',stem:'Question',options:[{id:'a',label:'A'}],question_image_url:'https://example.test/q.png',question_image_alt:'Fetal position',rationale_image_url:'https://example.test/private.png',nursing_tip:'Private reminder',answer_key:'a'};
 const publicView=publicSnapshot(q);assert.equal(publicView.images[0].alt,'Fetal position');assert(!('nursing_tip' in publicView));assert(!('answer_key' in publicView));
 // Public question extraction must not pick up solution-only aliases even if supplied accidentally.
 assert(!publicView.images.some(image=>image.url.includes('private')));
});
test('education never changes scoring; frozen reviews retain original tips and rationale media',()=>{
 const q={id:'q',type:'single',stem:'Question',options:[{id:'a',label:'A'}],answer_key:'a'},decorated={...q,question_image_url:'https://example.test/q.png',nursing_tip:'tip'};assert.deepEqual(scoreQuestion(q,'a'),scoreQuestion(decorated,'a'));
 const review=buildExamReview({id:'a',mode:'study',earned:1,possible:1,question_count:1,snapshot_stage:'start'},[{id:'r',question_id:'q',response:'a',earned:1,possible:1}],[{question_id:'q',position:1,question_snapshot:q,solution_snapshot:{answer_key:'a',rationale:'Original',nursing_tip:'Frozen nursing tip',rationale_image_url:'https://example.test/r.png',rationale_image_alt:'Frozen diagram'}}]);assert.equal(review.items[0].nursingTip,'Frozen nursing tip');assert.equal(review.items[0].rationaleImages[0].alt,'Frozen diagram');
});
