import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {studyGuideCatalog} from './study-guide-catalog.mjs';

export const maxStudyGuideArchiveBytes=3_000_000;

export function readStudyGuideArchive(archive:Uint8Array){
 if(!archive.length||archive.length>maxStudyGuideArchiveBytes)throw Error('Choose a study sheet ZIP under 3 MB.');
 const sheets=new Map(studyGuideCatalog.map(guide=>[guide.filename,guide]));
 const seen=new Set<string>();
 const files=unzipSync(archive,{filter(entry){
  const guide=sheets.get(entry.name);
  if(!guide||entry.originalSize!==guide.size||seen.has(entry.name)){
   throw Error('Use the prepared study sheet ZIP without renaming or editing its files.');
  }
  seen.add(entry.name);
  return true;
 }});
 if(!seen.size)throw Error('The ZIP does not contain any catalogued study sheets.');
 return studyGuideCatalog.filter(guide=>seen.has(guide.filename)).map(guide=>{
  const data=files[guide.filename];
  if(!data||data.length!==guide.size||createHash('sha256').update(data).digest('hex')!==guide.sha256){
   throw Error('A PDF in the ZIP differs from the prepared upload. Download a fresh copy.');
  }
  return {name:guide.filename,data};
 });
}
