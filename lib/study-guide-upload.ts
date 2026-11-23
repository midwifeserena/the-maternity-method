import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {studyGuideCatalog} from './study-guide-catalog.mjs';

export const maxStudyGuideArchiveBytes=3_000_000;

export function readStudyGuideArchive(archive:Uint8Array){
 if(!archive.length||archive.length>maxStudyGuideArchiveBytes)throw Error('Choose a study sheet ZIP under 3 MB.');
 const sheets=new Map(studyGuideCatalog.map(guide=>[guide.filename,guide]));
 for(const guide of studyGuideCatalog)sheets.set(guide.download_filename.normalize('NFC'),guide);
 const seen=new Map<string,string>();
 const files=unzipSync(archive,{filter(entry){
  const guide=sheets.get(entry.name.normalize('NFC'));
  if(!guide||entry.originalSize!==guide.size||seen.has(guide.filename)){
   throw Error('Use the original study sheet PDFs without renaming or editing them.');
  }
  seen.set(guide.filename,entry.name);
  return true;
 }});
 if(!seen.size)throw Error('The ZIP does not contain any catalogued study sheets.');
 return studyGuideCatalog.filter(guide=>seen.has(guide.filename)).map(guide=>{
  const data=files[seen.get(guide.filename)!];
  if(!data||data.length!==guide.size||createHash('sha256').update(data).digest('hex')!==guide.sha256){
   throw Error('A PDF differs from the original study sheet. Select an unedited copy.');
  }
  return {name:guide.filename,data};
 });
}
