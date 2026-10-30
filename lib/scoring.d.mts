export function scoreQuestion(question:{type:string;answer_key:any;matrix_rows?:{id:string}[]},answer:any):{earned:number;possible:number};
export function publicQuestion<T extends Record<string,any>>(question:T):Omit<T,'answer_key'|'rationale'>;
