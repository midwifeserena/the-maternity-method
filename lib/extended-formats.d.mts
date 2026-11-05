export function numericAnswer(value:unknown,places:number):string|null;
export function validateExtended(q:any,key:any):string[]|null;
export function scoreExtended(q:any,response:any):{earned:number;possible:number}|null;
export function publicExtended(q:any):Record<string,any>|null;
export function extendedTemplate(format:string,category:string):{question:any;solution:any}|null;
