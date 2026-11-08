import type {BundledStudyGuide} from './study-guide-catalog.mjs';
export function lessonVideoSource(value:string):{watch:string;embed:string|null;direct:boolean}|null;
export function lessonGuide(lesson:{title:string;study_guide_slug?:string|null}):BundledStudyGuide|null;
export function lessonTime(seconds:number):string;
export function validateLessonProgress(body:any):{notes:string;completed:boolean;position:number;duration:number};
