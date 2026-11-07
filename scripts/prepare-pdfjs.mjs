import {copyFile,cp,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),source=path.dirname(require.resolve('pdfjs-dist/package.json')),destination=path.join(process.cwd(),'public','pdfjs');
await mkdir(destination,{recursive:true});
await copyFile(path.join(source,'LICENSE'),path.join(destination,'LICENSE'));
await copyFile(path.join(source,'legacy','build','pdf.worker.min.mjs'),path.join(destination,'pdf.worker.min.mjs'));
for(const folder of ['cmaps','standard_fonts','wasm'])await cp(path.join(source,folder),path.join(destination,folder),{recursive:true});
console.log('Prepared same-origin PDF.js worker, fonts and decoding assets.');
