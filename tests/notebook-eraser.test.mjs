import test from 'node:test';
import assert from 'node:assert/strict';
import {strokeTouchesEraser} from '../lib/notebook-pages.mjs';
test('eraser catches thin pens near the line, endpoints, dots and highlighter ink',()=>{const pen={kind:'stroke',points:[[10,20],[110,20]],width:2,opacity:1};assert(strokeTouchesEraser(pen,[50,27],[50,27],8));assert(strokeTouchesEraser(pen,[3,20],[3,20],8));assert(!strokeTouchesEraser(pen,[50,40],[50,40],8));assert(strokeTouchesEraser({...pen,points:[[10,20]]},[15,20],[15,20],8));assert(strokeTouchesEraser({...pen,width:24,opacity:.3},[50,37],[50,37],8));});
test('fast eraser sweeps catch crossing strokes without deleting distant marks or images',()=>{const pen={kind:'stroke',points:[[50,10],[50,90]],width:3};assert(strokeTouchesEraser(pen,[0,50],[100,50],8));assert(!strokeTouchesEraser(pen,[0,110],[100,110],8));assert(!strokeTouchesEraser({kind:'image'},[0,0],[100,100],8));assert(!strokeTouchesEraser({...pen,points:[]},[0,0],[100,100],8));});
