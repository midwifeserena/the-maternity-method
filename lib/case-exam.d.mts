export const CASE_ITEM_COUNT:number,MAX_EXAM_ITEMS:number;
export function validExamSelection(questionIds:unknown,caseIds:unknown,mode:unknown):boolean;
export function completeExamCases<T extends {id:string}>(cases:T[],items:{case_id:string;item_number:number}[]):T[];
export function caseItemDocument(caseRecord:any,item:any,answerRecord:any,examId:string):{question:any;solution:any};
export function scoreExamSnapshot(question:any,solution:any,answer:unknown):{earned:number;possible:number};
