import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeTextHighlights} from '../lib/exam-annotations.mjs';

test('overlapping selections merge without changing other chart tabs or input records',()=>{
 const original=[{region:'stem',start:10,end:20},{region:'chart:Notes',start:0,end:9}];
 const result=mergeTextHighlights(original,{region:'stem',start:4,end:14});
 assert.deepEqual(result,[{region:'chart:Notes',start:0,end:9},{region:'stem',start:4,end:20}]);
 assert.equal(original[0].start,10);
});
test('re-highlighting and adjoining selections do not duplicate highlights',()=>{
 const original=[{region:'stem',start:0,end:5},{region:'stem',start:9,end:20}];
 assert.deepEqual(mergeTextHighlights(original,{region:'stem',start:5,end:9}),[{region:'stem',start:0,end:20}]);
 assert.deepEqual(mergeTextHighlights(original,{region:'stem',start:1,end:3}),original);
});
