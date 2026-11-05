/** Exact fixed-point comparison; extra nonzero decimals and exponent/units input are invalid. */
export function numericAnswer(value,places){
 if(!Number.isInteger(places)||places<0||places>6||!['string','number'].includes(typeof value))return null;
 const s=String(value).trim();if(s.length>100||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
 const negative=s.startsWith('-'),unsigned=s.replace(/^[-+]/,''),[whole='',raw='']=unsigned.split('.'),fraction=raw.replace(/0+$/,'');
 if(fraction.length>places)return null;
 const scaled=BigInt((whole||'0')+fraction.padEnd(places,'0'));return String(negative?-scaled:scaled);
}
export function validateExtended(q,key){
 const c=q.ngn_config??{},options=q.options??[];
 if(q.ngn_format==='calculation'){
  const errors=[];if(q.type!=='single'||options.length||Object.keys(c).some(k=>!['decimal_places','unit'].includes(k))||numericAnswer(key,c.decimal_places)===null)errors.push('Set a valid numeric key and decimal places (0–6) for this calculation.');
  if(typeof c.unit!=='string'||c.unit.length>80)errors.push('Use a short text unit.');return errors;
 }
 if(q.ngn_format==='ordered'){
  if(q.type!=='matrix'||options.length<2||Object.keys(c).some(k=>k!=='scoring')||c.scoring!=='all-or-nothing'||!Array.isArray(key)||key.length!==options.length||new Set(key).size!==key.length||key.some(id=>!options.some(o=>o.id===id)))return ['Ordered response requires every choice exactly once in its correct sequence, scored all-or-nothing.'];
  return [];
 }
 return null;
}
export function scoreExtended(q,response){
 if(!['calculation','ordered','dyad-cloze'].includes(q.ngn_format))return null;
 if(q.ngn_format==='calculation'){
  const expected=numericAnswer(q.answer_key,q.ngn_config?.decimal_places);if(expected===null)throw Error('Invalid numeric key');
  const actual=numericAnswer(response,q.ngn_config.decimal_places);return {earned:actual!==null&&actual===expected?1:0,possible:1};
 }
 if(q.ngn_format==='ordered'){
  if(validateExtended(q,q.answer_key).length)throw Error('Invalid ordered key');
  return {earned:Array.isArray(response)&&response.length===q.answer_key.length&&response.every((id,i)=>id===q.answer_key[i])?1:0,possible:1};
 }
 const blanks=q.ngn_config?.blanks;if(!Array.isArray(blanks)||blanks.length!==2||blanks.some(b=>!b.option_ids.includes(q.answer_key?.[b.id])))throw Error('Invalid paired key');
 return {earned:blanks.every(b=>response?.[b.id]===q.answer_key[b.id])?1:0,possible:1};
}
export function publicExtended(q){
 if(q.ngn_format==='calculation')return {decimal_places:Number.isInteger(q.ngn_config?.decimal_places)?q.ngn_config.decimal_places:0,unit:typeof q.ngn_config?.unit==='string'?q.ngn_config.unit:''};
 if(q.ngn_format==='ordered')return {scoring:'all-or-nothing'};
 return null;
}
export function extendedTemplate(format,category){
 if(!['calculation','ordered'].includes(format))return null;
 const calc=format==='calculation';return {question:{id:'template',category,type:calc?'single':'matrix',matrix_mode:'single',ngn_format:format,bank_section:'standard',stem:'Enter the question.',options:calc?[]:[{id:'a',label:'First action'},{id:'b',label:'Second action'}],matrix_rows:[],chart:{},ngn_config:calc?{decimal_places:0,unit:''}:{scoring:'all-or-nothing'}},solution:{answer_key:calc?'1':['a','b'],rationale:'Enter the rationale.'}};
}
