export type TextHighlight={region:string;start:number;end:number};
export function mergeTextHighlights(ranges:TextHighlight[],addition:TextHighlight):TextHighlight[];
export function rangeFromTextOffsets(root:HTMLElement,start:number,end:number):Range|null;
