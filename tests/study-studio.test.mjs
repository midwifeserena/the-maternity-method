import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {blankNotebook,validNotebook,validateStudioRecord,noteText,detectStudioUpload,validAssetPath} from '../lib/study-studio.mjs';
test('notebook supports pages, drawing, editable text, private image references and source text',()=>{
 const content=blankNotebook();content.body='Typed notes';content.pages[0].elements=[{id:randomUUID(),kind:'text',x:10,y:20,text:'Clinical reminder',color:'#8e4a55',fontSize:24},{id:randomUUID(),kind:'stroke',points:[[1,2],[4,5]],color:'#4e3629',width:3,opacity:1},{id:randomUUID(),kind:'image',assetId:randomUUID(),x:0,y:0,w:200,h:100}];assert(validNotebook(content));assert.equal(noteText(content),'Typed notes\n\nClinical reminder');assert(validateStudioRecord('notes',{title:'My notebook',kind:'notebook',content}));
 for(const invalid of [{...content,pages:[]},{...content,pages:Array.from({length:101},()=>content.pages[0])},{...content,pages:[{...content.pages[0],elements:[{...content.pages[0].elements[0],fontSize:1000}]}]}])assert(!validNotebook(invalid));
});
test('invalid element types, URLs in place of asset IDs and extreme coordinates are rejected',()=>{
 for(const element of [{kind:'script'},{kind:'image',assetId:'https://example.test/image',x:0,y:0,w:200,h:100},{kind:'text',text:'x',x:-1,y:0,color:'#fff',fontSize:24}]){const c=blankNotebook();c.pages[0].elements=[{id:randomUUID(),...element}];assert(!validNotebook(c));}
 assert(!validateStudioRecord('notes',{title:'',kind:'audio',content:blankNotebook()}));assert(validateStudioRecord('flashcards',{topic:'My topic',front:'Term',back:'Definition',high_yield:false}));
});
test('uploads enforce real file signatures and strict private owner/asset paths',()=>{
 assert.equal(detectStudioUpload(new Uint8Array([37,80,68,70,45,49]),'application/pdf').extension,'pdf');assert.equal(detectStudioUpload(new TextEncoder().encode('Typed notes'),'text/plain').extension,'txt');assert.equal(detectStudioUpload(new TextEncoder().encode('<svg/>'),'image/svg+xml'),null);assert.equal(detectStudioUpload(new TextEncoder().encode('fake pdf'),'application/pdf'),null);
 const owner=randomUUID(),id=randomUUID();assert(validAssetPath(owner+'/'+id+'.pdf',owner,id));assert(!validAssetPath(owner+'/../other/file.pdf',owner,id));assert(!validAssetPath('other/'+id+'.pdf',owner,id));
});
