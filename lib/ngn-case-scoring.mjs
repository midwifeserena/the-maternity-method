/** Existing case-practice scoring, shared with combined exams. */
export function scoreLegacyNgn(expected,given){
 let earned=0,possible=0;
 const check=(a,b)=>{possible++;if(JSON.stringify(a)===JSON.stringify(b))earned++};
 if(Array.isArray(expected.correct)){
  const right=new Set(expected.correct);
  const got=new Set(Array.isArray(given.correct)?given.correct:[]);
  // NCLEX +/- credit: correct selections minus incorrect selections, floor at zero.
  possible=right.size;
  earned=Math.max(0,[...got].filter(v=>right.has(v)).length-[...got].filter(v=>!right.has(v)).length);
 }else if(Array.isArray(expected.highlight_segments)){
  const right=new Set((expected.highlight_segments).map(String));
  const got=new Set((Array.isArray(given.highlight_segments)?given.highlight_segments:[]).map(String));
  possible=right.size;earned=Math.max(0,[...got].filter(v=>right.has(v)).length-[...got].filter(v=>!right.has(v)).length);
 }else if(Array.isArray(expected.rows)){
  const rows=expected.rows;const answers=Array.isArray(given.rows)?given.rows:[];
  rows.forEach((r,i)=>{const clean=(v)=>Array.isArray(v)?[...v].sort():[];check(clean(r),clean(answers[i]))});
 }else if(Array.isArray(expected.blanks)){
  const answers=Array.isArray(given.blanks)?given.blanks:[];
  expected.blanks.forEach((v,i)=>check(v,answers[i]));
 }else{
  for(const key of ['actions_to_take','potential_conditions','parameters_to_monitor']){
   const right=Array.isArray(expected[key])?(expected[key]):[];
   const got=Array.isArray(given[key])?(given[key]):[];
   if(right.length){possible+=right.length;earned+=Math.max(0,got.filter(v=>right.includes(v)).length-got.filter(v=>!right.includes(v)).length)}
  }
 }
 return {earned,possible};
}
