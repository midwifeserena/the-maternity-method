/** Text offsets keep study annotations separate from answers and survive navigation. */
export function mergeTextHighlights(ranges, addition){
 const grouped=[...ranges,addition].filter(r=>r.region===addition.region).sort((a,b)=>a.start-b.start);
 const merged=[];
 for(const range of grouped){const last=merged.at(-1);if(last&&range.start<=last.end)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 return [...ranges.filter(r=>r.region!==addition.region),...merged];
}
export function rangeFromTextOffsets(root,start,end){
 const walker=root.ownerDocument.createTreeWalker(root,4);let node,offset=0,startNode,endNode,startOffset=0,endOffset=0;
 while((node=walker.nextNode())){const length=node.textContent.length;if(!startNode&&start<offset+length){startNode=node;startOffset=start-offset;}if(startNode&&end<=offset+length){endNode=node;endOffset=end-offset;break;}offset+=length;}
 if(!startNode||!endNode)return null;
 const range=root.ownerDocument.createRange();range.setStart(startNode,startOffset);range.setEnd(endNode,endOffset);return range;
}
