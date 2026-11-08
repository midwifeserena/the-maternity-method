import {studyGuideCatalog} from './study-guide-catalog.mjs';
export function lessonVideoSource(value){
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;const host=url.hostname,parts=url.pathname.split('/').filter(Boolean);let embed=null;
 if(['youtu.be','youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){const id=host==='youtu.be'?parts[0]:parts[0]==='watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null;if(id&&/^[\w-]{11}$/.test(id))embed='https://www.youtube-nocookie.com/embed/'+id+'?rel=0';}
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){const id=host==='player.vimeo.com'?parts[1]:parts[0];if(id&&/^\d+$/.test(id)){const player=new URL('https://player.vimeo.com/video/'+id),hash=url.searchParams.get('h')||(host!=='player.vimeo.com'?parts[1]:null);if(hash&&/^[a-zA-Z0-9]+$/.test(hash))player.searchParams.set('h',hash);player.searchParams.set('dnt','1');embed=player.href;}}
 return {watch:url.href,embed,direct:/\.(mp4|webm|ogv|ogg|m4v)$/i.test(url.pathname)};
 }catch{return null;}
}
export function lessonGuide(lesson){
 const explicit=studyGuideCatalog.find(g=>g.slug===lesson.study_guide_slug);if(explicit)return explicit;
 const normalized=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const exact=studyGuideCatalog.find(g=>normalized(g.title)===normalized(lesson.title));if(exact)return exact;
 const title=normalized(lesson.title),aliases=[[/\b(previa|abruption)\b/,'12-placental-bleeding'],[/\b(preeclampsia|hellp)\b/,'15-preeclampsia'],[/\bpostpartum hemorrhage\b|\bpph\b/,'14-postpartum-hemorrhage']];const alias=aliases.find(([pattern])=>pattern.test(title));return alias?studyGuideCatalog.find(g=>g.slug===alias[1])??null:null;
}
export function lessonTime(seconds){if(!Number.isFinite(seconds)||seconds<=0)return '';const n=Math.floor(seconds);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
export function validateLessonProgress(body){
 if(!body||typeof body!=='object'||!Number.isSafeInteger(body.revision)||body.revision<0||typeof body.notes!=='string'||body.notes.length>20000||typeof body.completed!=='boolean'||!Number.isFinite(body.position)||body.position<0||body.position>86400||!Number.isFinite(body.duration)||body.duration<0||body.duration>86400)throw Error('Invalid lesson progress');
 return {notes:body.notes,completed:body.completed,position:Math.floor(body.position),duration:Math.floor(body.duration)};
}
