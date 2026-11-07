export const MAX_REVIEW_SOURCE_BYTES:number,MAX_REVIEW_SCRIPT:number,MAX_SOURCE_TEXT:number;
export type ReviewSection={id:string;label:string;text:string};
export type ImportedReview={name:string;kind:string;sections:ReviewSection[];warnings:string[]};
export function cleanReviewText(value:unknown):string;
export function notesSections(text:string):ReviewSection[];
export function buildAudioReview(title:string,sections:ReviewSection[],selectedIds:string[]):string;
export function suggestedFemaleVoice<T extends {name:string;lang:string;voiceURI:string;localService?:boolean;default?:boolean}>(voices:T[]):T|null;
export function selectReviewVoice<T extends {name:string;lang:string;voiceURI:string;localService?:boolean;default?:boolean}>(voices:T[],preferredURI?:string):T|null;
