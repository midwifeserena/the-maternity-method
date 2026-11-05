// jsonb object order may change after a save. Compare values, not JSON text order.
export function sameNgnValue(a,b){
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>sameNgnValue(v,b[i]));
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&sameNgnValue(a[key],b[key]));
}
export function ngnTransferState({current,items,draft={},tabDraft={},mode='case',item,answer}){
 const chartChanged=!sameNgnValue(tabDraft,current?.tabs??{});
 const changedFields=Object.entries(draft).some(([key,value])=>{
  const saved=mode==='case'?current?.[key]:['answer','answer_text','rationale'].includes(key)?answer?.[key]:item?.[key];
  if(['content','answer'].includes(key)&&typeof value==='string'){try{value=JSON.parse(value)}catch{return true}}
  return !sameNgnValue(value,saved);
 });
 const hasUnsavedChanges=chartChanged||changedFields,reasons=[];
 if(!current)reasons.push('Select a source group.');
 if(!items.length)reasons.push('This group has no questions.');
 if(items.length===6)reasons.push('Six-question case studies stay in NGN Case Studies.');
 if(current?.published)reasons.push('The case is published. Unpublish the case before moving it.');
 for(const i of items){
  if(i.published)reasons.push(`Question ${i.item_number} is published. Unpublish that question before moving it.`);
  if(i.review_status!=='approved')reasons.push(`Question ${i.item_number} is not approved. Approve that question before moving it.`);
 }
 if(hasUnsavedChanges)reasons.push('There are unsaved edits. Save them in Patient chart or Questions, or discard them below. After saving content edits, approve the question again if required.');
 return {hasUnsavedChanges,reasons,canTransfer:reasons.length===0};
}
