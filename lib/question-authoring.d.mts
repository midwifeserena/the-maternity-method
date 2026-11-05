export type Choice={id:string;label:string;[key:string]:unknown};
export type QuestionDocument={question:{bank_section:'standard'|'ngn';ngn_format:string|null;ngn_config:any;category:string;type:'single'|'sata'|'matrix';matrix_mode:'single'|'multiple';stem:string;clinical_scenario:string;content_format:'plain'|'markdown';options:Choice[];matrix_rows:Choice[];chart:Record<string,string>;question_image_url:string|null;question_image_alt:string|null;topic:string|null;subtopic:string|null;difficulty:'easy'|'medium'|'hard'|null;tags:string[]};solution:{answer_key:any;rationale:string;rationale_format:'plain'|'markdown';rationale_image_url:string|null;rationale_image_alt:string|null;nursing_tip:string|null;test_taking_tip:string|null;answer_explanations:Record<string,string>;row_explanations:Record<string,string>}};
export const questionFormats:{value:string;label:string}[];
export function formatOf(question:any):string;
export function questionStatus(question:any):'draft'|'published'|'archived';
export function questionDocument(question?:any,solution?:any,category?:string):QuestionDocument;
export function validateQuestionDocument(input:unknown,options?:{publish?:boolean;categories?:readonly string[]}):{valid:boolean;errors:Record<string,string>};
export function applyTextFormat(text:string,start:number,end:number,format:string):{text:string;start:number;end:number};
