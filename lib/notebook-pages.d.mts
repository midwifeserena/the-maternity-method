export const MAX_NOTEBOOK_PAGES:number;
export function pageSize(page:any):{width:number;height:number};
export function makeBlankPage(reference?:any):any;
export function insertNotebookPages(content:any,index:number,pages:any[]):any;
export function reorderNotebookPage(content:any,from:number,to:number):any;
export function pdfPageDescriptor(assetId:string,sourcePage:number,width:number,height:number,name?:string):any;
