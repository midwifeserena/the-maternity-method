export const ngnFormats:string[];
export function isNgnQuestion(q:any):boolean;
export function convertNgnItem(c:any,i:any,a:any):{question:any;solution:any};
export function validateNgn(q:any,key:any):string[];
export function scoreNgn(q:any,answer:any):{earned:number;possible:number}|null;
export function publicNgnConfig(q:any):Record<string,any>;
export function ngnTemplate(format:string,category?:string):{question:any;solution:any};

export function normalizeNgnCaseItem(c:any,i:any,a:any):{question:any;solution:any};
