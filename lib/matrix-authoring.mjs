/** Validate new or explicitly edited matrices; old questions are never rewritten. */
export function matrixDefinition(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Provide a matrix definition.');
 const allowed=['stem','options','matrix_rows','matrix_mode','answer_key','rationale','row_explanations','category'];
 if(Object.keys(input).some(key=>!allowed.includes(key)))throw Error('Unsupported matrix field.');
 if(typeof input.stem!=='string'||!input.stem.trim()||input.stem.length>15000)throw Error('Add a question stem (up to 15,000 characters).');
 if(typeof input.rationale!=='string'||!input.rationale.trim()||input.rationale.length>20000)throw Error('Add the overall rationale (up to 20,000 characters).');
 if(!['single','multiple'].includes(input.matrix_mode))throw Error('Choose a matrix selection format.');
 function entries(value,min,max,label){
  if(!Array.isArray(value)||value.length<min||value.length>max)throw Error(`Use ${min}–${max} ${label}.`);
  const ids=new Set();
  return value.map(entry=>{
   if(!entry||typeof entry.id!=='string'||!entry.id.trim()||entry.id.length>100||['__proto__','constructor','prototype'].includes(entry.id)||ids.has(entry.id)||typeof entry.label!=='string'||!entry.label.trim()||entry.label.length>2000||Object.keys(entry).some(key=>!['id','label'].includes(key)))throw Error('Each '+label+' entry needs a unique ID and descriptive label.');
   ids.add(entry.id);return {id:entry.id,label:entry.label.trim()};
  });
 }
 const options=entries(input.options,2,8,'columns'),rows=entries(input.matrix_rows,1,20,'rows'),columnIds=new Set(options.map(option=>option.id)),rowIds=new Set(rows.map(row=>row.id));
 const key=input.answer_key;
 if(!key||typeof key!=='object'||Array.isArray(key)||Object.keys(key).some(id=>!rowIds.has(id)))throw Error('The answer key must match the matrix rows.');
 for(const row of rows){const answer=key[row.id];if(input.matrix_mode==='multiple'?(!Array.isArray(answer)||!answer.length||new Set(answer).size!==answer.length||answer.some(id=>!columnIds.has(id))):!columnIds.has(answer))throw Error('Set a valid correct answer for every row.');}
 const explanations=input.row_explanations??{};
 if(!explanations||typeof explanations!=='object'||Array.isArray(explanations)||Object.entries(explanations).some(([id,text])=>!rowIds.has(id)||typeof text!=='string'||text.length>6000))throw Error('Row explanations must be text keyed by existing row IDs.');
 return {question:{stem:input.stem.trim(),matrix_mode:input.matrix_mode,options,matrix_rows:rows,published:false},solution:{answer_key:key,rationale:input.rationale.trim(),row_explanations:explanations}};
}
