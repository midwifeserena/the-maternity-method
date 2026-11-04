export type MatrixQuestion={id?:string;matrix_mode?:'single'|'multiple';matrix_rows?:{id:string;label?:string}[];answer_key?:any};
export function matrixRowScores(question:MatrixQuestion,answer:any):{id:string;earned:number;possible:number}[];
export function matrixMultipleScore(question:MatrixQuestion,answer:any):{earned:number;possible:number};
export function matrixSelection(question:MatrixQuestion,answer:any,rowId:string,optionId:string):boolean;
export function changeMatrixSelection(question:MatrixQuestion,answer:any,rowId:string,optionId:string):Record<string,string|string[]>;

export function normalizeRowExplanations(value:unknown):Record<string,string>;
