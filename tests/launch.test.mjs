import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {launchVideoSource} from '../app/launch/video-url.mjs';

test('launch video accepts supported HTTPS sources and preserves Vimeo privacy hashes',()=>{
 assert.deepEqual(launchVideoSource(''),{kind:'placeholder'});
 assert.equal(launchVideoSource('https://youtu.be/8UoePns2tWM').src,'https://www.youtube-nocookie.com/embed/8UoePns2tWM?autoplay=1&rel=0');
 assert(launchVideoSource('https://vimeo.com/123456/abcdef').src.includes('h=abcdef'));
 assert.equal(launchVideoSource('https://example.test/intro.mp4').kind,'file');
 for(const url of ['javascript:alert(1)','http://example.test/intro.mp4','https://youtube.com.evil.test/watch?v=8UoePns2tWM'])assert.equal(launchVideoSource(url).kind,'invalid');
});

test('only the public launch route bypasses the existing Supabase session refresh',async()=>{
 let clients=0,claims=0;
 const module={exports:{}};
 const code=ts.transpileModule(readFileSync(new URL('../proxy.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-key'}},require(name){if(name==='@supabase/ssr')return{createServerClient(){clients++;return{auth:{async getClaims(){claims++}}}}};if(name==='next/server')return{NextResponse:{next(){return{kind:'next'}}}};throw Error(`Unexpected module: ${name}`)}});
 const request=pathname=>({nextUrl:{pathname},cookies:{getAll:()=>[]}});
 for(const path of ['/launch','/launch/'])await module.exports.proxy(request(path));
 assert.equal(clients,0);assert.equal(claims,0);
 for(const path of ['/','/dashboard','/admin/questions','/launch/private'])await module.exports.proxy(request(path));
 assert.equal(clients,4);assert.equal(claims,4);
});
