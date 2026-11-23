import {studyGuideCatalog} from './study-guide-catalog.mjs';
export function lessonVideoSource(value){
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;const host=url.hostname,parts=url.pathname.split('/').filter(Boolean);let embed=null;
 if(['youtu.be','youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){const id=host==='youtu.be'?parts[0]:parts[0]==='watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null;if(id&&/^[\w-]{11}$/.test(id))embed='https://www.youtube-nocookie.com/embed/'+id+'?rel=0';}
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){const id=host==='player.vimeo.com'?parts[1]:parts[0];if(id&&/^\d+$/.test(id)){const player=new URL('https://player.vimeo.com/video/'+id),hash=url.searchParams.get('h')||(host!=='player.vimeo.com'?parts[1]:null);if(hash&&/^[a-zA-Z0-9]+$/.test(hash))player.searchParams.set('h',hash);player.searchParams.set('dnt','1');embed=player.href;}}
 return {watch:url.href,embed,direct:/\.(mp4|webm|ogv|ogg|m4v)$/i.test(url.pathname)};
 }catch{return null;}
}
const replacementSheets=new Map([
 ['03-ectopic-molar','1-18-ectopic-vs-molar-pregnancy'],
 ['04-fetal-monitoring','2-06-read-the-fetal-strip'],
 ['05-gestational-diabetes','1-17-gestational-diabetes'],
 ['06-newborn-jaundice','4-20-newborn-jaundice'],
 ['10-newborn-respiratory','4-15-recognize-respiratory-distress'],
 ['12-placental-bleeding','1-12-previa-vs-abruption'],
 ['13-postpartum-care','3-01-bubble-he-assessment'],
 ['14-postpartum-hemorrhage','3-04-postpartum-hemorrhage-4-ts'],
 ['15-preeclampsia','1-07-preeclampsia'],
 ['16-preterm-birth','2-21-preterm-labor-birth'],
 ['19-congenital-infections','1-21-torch-infections'],
]);
export function lessonGuide(lesson){
 const configured=lesson.study_guide_slug;
 const explicit=studyGuideCatalog.find(g=>g.slug===(replacementSheets.get(configured)??configured));if(explicit)return explicit;
 const normalized=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const exact=studyGuideCatalog.find(g=>normalized(g.title)===normalized(lesson.title));if(exact)return exact;
 const title=normalized(lesson.title),aliases=[[/\bpostpartum preeclampsia\b/,'3-07-postpartum-preeclampsia'],[/\bpostpartum hemorrhage\b|\bpph\b/,'3-04-postpartum-hemorrhage-4-ts'],[/\b(previa|abruption)\b/,'1-12-previa-vs-abruption'],[/\b(preeclampsia|hellp)\b/,'1-07-preeclampsia'],[/^fetal monitoring$/,'2-06-read-the-fetal-strip']];const alias=aliases.find(([pattern])=>pattern.test(title));return alias?studyGuideCatalog.find(g=>g.slug===alias[1])??null:null;
}
export function lessonTime(seconds){if(!Number.isFinite(seconds)||seconds<=0)return '';const n=Math.floor(seconds);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
export function validateLessonProgress(body){
 if(!body||typeof body!=='object'||!Number.isSafeInteger(body.revision)||body.revision<0||typeof body.notes!=='string'||body.notes.length>20000||typeof body.completed!=='boolean'||!Number.isFinite(body.position)||body.position<0||body.position>86400||!Number.isFinite(body.duration)||body.duration<0||body.duration>86400)throw Error('Invalid lesson progress');
 return {notes:body.notes,completed:body.completed,position:Math.floor(body.position),duration:Math.floor(body.duration)};
}
