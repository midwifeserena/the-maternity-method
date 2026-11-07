import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const localRequire=createRequire(import.meta.url),React=localRequire('react'),{renderToStaticMarkup}=localRequire('react-dom/server');
function sidebarMarkup(pathname,isAdmin){
 const exports={};
 const code=ts.transpileModule(readFileSync(new URL('../components/sidebar.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require(name){
  if(name==='react'||name==='react/jsx-runtime'||name==='lucide-react')return localRequire(name);
  if(name==='next/navigation')return{usePathname:()=>pathname};
  if(name==='next/link')return function Link({children,...props}){return React.createElement('a',props,children)};
  if(name==='@/components/stork-logo')return{StorkLogo:()=>React.createElement('img',{alt:'The Maternity Method logo'})};
  throw Error('Unexpected dependency '+name);
 }});
 return renderToStaticMarkup(React.createElement(exports.Sidebar,{isAdmin}));
}
test('ordinary student navigation never renders administrator controls, even on an admin URL',()=>{
 for(const path of ['/dashboard','/create-exam','/admin/questions']){const markup=sidebarMarkup(path,false);assert(!markup.includes('Switch portal'));assert(!markup.includes('Admin Questions'));assert(!markup.includes('Admin navigation'));assert(markup.includes('Student navigation'));}
});
test('administrator mode keeps the portal toggle and the three admin studios',()=>{
 const markup=sidebarMarkup('/admin/ngn',true);assert(markup.includes('Switch portal'));assert(markup.includes('Admin navigation'));assert(markup.includes('Admin Questions'));assert(markup.includes('Admin NGN Case Studies'));assert(markup.includes('Admin Flashcard Studio'));assert(!markup.includes('Student navigation'));
});
test('deep-linked exam reviews expand Question Bank and mark Previous Exams current',()=>{
 const markup=sidebarMarkup('/previous-tests/attempt-id',true);assert(markup.includes('aria-expanded="true"'));assert(!markup.includes('id="question-bank-submenu" hidden'));
 const link=markup.match(/<a[^>]*href="\/previous-tests"[^>]*>/)?.[0];assert(link?.includes('aria-current="page"'));
 assert(markup.includes('Create Exam'));assert(markup.includes('NGN Case Studies'));assert(markup.includes('Previous Exams'));assert(markup.includes('Performance'));
});
