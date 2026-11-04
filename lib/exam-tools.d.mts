export function formatExamTime(seconds:number):string;
export function isQuestionAnswered(question:{type:'single'|'sata'|'matrix';matrix_mode?:'single'|'multiple';options:{id:string}[];matrix_rows?:{id:string}[]},answer:unknown):boolean;
export function calculateExpression(expression:string):string;
