export const STUDIO_BUCKET:string,MAX_UPLOAD_BYTES:number;
export function uuid(value:unknown):value is string;
export function blankNotebook():any;
export function validNotebook(value:any):boolean;
export function noteText(content:any):string;
export function validateStudioRecord(kind:string,input:any):boolean;
export function detectStudioUpload(bytes:Uint8Array,mime:string):{mime:string;extension:string}|null;
export function assetUrl(id:string):string;
export function validAssetPath(path:string,owner:string,id:string):boolean;
