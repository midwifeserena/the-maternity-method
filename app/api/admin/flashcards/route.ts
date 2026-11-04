import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields='id,card_number,topic,front,back,high_yield,review_status,published';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
const denied=()=>reply({error:'Administrator access required'},403);
function databaseError(error:{code?:string}){
 return reply({error:error.code==='42P01'?'Set up the shared flashcard_library table in Supabase before adding cards.':'Flashcards could not be saved or loaded. Please try again.'},500);
}
function text(value:unknown,label:string,max:number){
 if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(label+' is required and must be under '+max+' characters.');
 return value.trim();
}
function normalize(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Each card must be an object.');
 const input=value as Record<string,unknown>;
 const number=Number(input.card_number);
 if(!Number.isSafeInteger(number)||number<1)throw Error('Card number must be a positive whole number.');
 const id=input.id?String(input.id):crypto.randomUUID();
 if(!uuid.test(id))throw Error('Card IDs must be valid UUIDs.');
 const flag=input.high_yield;
 if(flag!==undefined&&flag!==null&&!['true','false','1','0','yes','no',''].includes(String(flag).toLowerCase()))throw Error('High yield must be true or false.');
 return {id,card_number:number,topic:text(input.topic,'Topic',80),front:text(input.front,'Question',4000),back:text(input.back,'Answer',12000),high_yield:['true','1','yes'].includes(String(flag).toLowerCase()),review_status:'needs_review',published:false};
}
function csv(source:string){
 const rows:string[][]=[];let row:string[]=[];let value='';let quoted=false;
 const data=source.replace(/^\uFEFF/,'');
 for(let i=0;i<data.length;i++){
  const char=data[i];
  if(quoted){if(char==='"'){if(data[i+1]==='"'){value+='"';i++}else quoted=false}else value+=char;continue}
  if(char==='"'&&!value){quoted=true;continue}
  if(char===','){row.push(value);value='';continue}
  if(char==='\r'||char==='\n'){
   if(char==='\r'&&data[i+1]==='\n')i++;
   row.push(value);if(row.some(cell=>cell.trim()))rows.push(row);row=[];value='';continue;
  }
  value+=char;
 }
 if(quoted)throw Error('The CSV contains an unclosed quotation mark.');
 row.push(value);if(row.some(cell=>cell.trim()))rows.push(row);
 const headers=rows.shift()?.map(header=>header.trim().toLowerCase())??[];
 if(!['card_number','topic','front','back'].every(header=>headers.includes(header)))throw Error('CSV needs card_number, topic, front and back columns. Optional: id and high_yield.');
 if(new Set(headers).size!==headers.length)throw Error('CSV column names must be unique.');
 return rows.map((cells,index)=>{if(cells.length!==headers.length)throw Error('CSV row '+(index+2)+' has the wrong number of columns.');return Object.fromEntries(headers.map((header,n)=>[header,cells[n]]))});
}
// Extract known INSERT row literals only. Uploaded SQL is never executed.
function sqlCards(source:string){
 const pattern=/insert\s+into\s+(?:public\.)?(?:flashcards|flashcard_library)\s*\(\s*id\s*,\s*card_number\s*,\s*topic\s*,\s*front\s*,\s*back\s*,\s*high_yield\s*\)\s*values\s*\(/gi;
 const rows:Record<string,unknown>[]=[];let match;
 while((match=pattern.exec(source))){
  let position=pattern.lastIndex;
  const literal=()=>{
   while(/\s/.test(source[position]??'')&&position<source.length)position++;
   const tag=source.slice(position).match(/^\$(?:[a-zA-Z_]\w*)?\$/)?.[0];
   if(tag){const start=position+tag.length;const end=source.indexOf(tag,start);if(end<0)throw Error('SQL has an unclosed text value.');position=end+tag.length;return source.slice(start,end)}
   if(source[position]==="'"){
    position++;let result='';
    while(position<source.length){const char=source[position++];if(char==="'"){if(source[position]==="'"){result+="'";position++}else return result}else result+=char}
    throw Error('SQL has an unclosed text value.');
   }
   const token=source.slice(position).match(/^(?:\d+|true\b|false\b|null\b)/i)?.[0];
   if(!token)throw Error('Could not read a flashcard SQL value.');position+=token.length;return token;
  };
  const values:string[]=[];
  for(let n=0;n<6;n++){
   values.push(literal());while(/\s/.test(source[position]??'')&&position<source.length)position++;
   if(source[position]!== (n===5?')':','))throw Error('Could not read a flashcard SQL row.');position++;
  }
  rows.push(Object.fromEntries(['id','card_number','topic','front','back','high_yield'].map((key,n)=>[key,values[n]])));
  pattern.lastIndex=position;
 }
 if(!rows.length)throw Error('No supported flashcard rows were found. Use CSV, JSON, or the original flashcard INSERT statements.');
 return rows;
}
async function body(req:NextRequest){const raw=await req.text();if(raw.length>1000000)throw Error('Import files must be smaller than 1 MB.');const input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Request must be an object.');return input}

export async function GET(){
 if(!await requireNgnAdmin())return denied();
 const db=admin();const cards=[];
 for(let start=0;;start+=500){
  const {data,error}=await db.from('flashcard_library').select(fields).order('card_number').order('id').range(start,start+499);
  if(error)return databaseError(error);
  cards.push(...(data??[]));if((data??[]).length<500)break;
 }
 return reply({cards});
}

export async function POST(req:NextRequest){
 if(!await requireNgnAdmin())return denied();
 let cards:ReturnType<typeof normalize>[];
 try{
  const input=await body(req);
  let rows:unknown=input.cards;
  if(typeof input.source==='string'){
   const source=input.source.trim();
   rows=source.startsWith('[')?JSON.parse(source):/insert\s+into\s+(?:public\.)?(?:flashcards|flashcard_library)\b/i.test(source)?sqlCards(source):csv(source);
  }
  if(!Array.isArray(rows)||rows.length<1||rows.length>1000)throw Error('Import between 1 and 1,000 cards at a time.');
  cards=rows.map(normalize);
  if(new Set(cards.map(card=>card.id)).size!==cards.length)throw Error('The import contains duplicate card IDs.');
 }catch(error){return reply({error:error instanceof SyntaxError?'The import is not valid JSON.':error instanceof Error?error.message:'Invalid card data'},400)}
 const {data,error}=await admin().from('flashcard_library').upsert(cards,{onConflict:'id',ignoreDuplicates:true}).select('id');
 if(error)return databaseError(error);
 return reply({inserted:data?.length??0,skipped:cards.length-(data?.length??0)});
}

export async function PATCH(req:NextRequest){
 if(!await requireNgnAdmin())return denied();
 let input;
 try{input=await body(req)}catch{return reply({error:'Invalid edit request'},400)}
 const ids=Array.isArray(input.ids)?input.ids:[input.id];
 if(!ids.length||ids.length>1000||ids.some((id:unknown)=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length)return reply({error:'Choose between 1 and 1,000 valid cards.'},400);
 const db=admin();
 const {data:existing,error:readError}=await db.from('flashcard_library').select(fields).in('id',ids);
 if(readError)return databaseError(readError);
 if(existing?.length!==ids.length)return reply({error:'One or more cards were not found.'},404);
 let changes:Record<string,unknown>;
 if(input.action==='approve_publish'){
  if(existing.some(card=>!card.front?.trim()||!card.back?.trim()||!card.topic?.trim()))return reply({error:'Every card needs a topic, question and answer before publication.'},400);
  changes={review_status:'approved',published:true};
 }else if(input.action==='unpublish')changes={published:false};
 else if(input.action==='save'&&ids.length===1){
  try{
   const card=normalize({...input.card,id:ids[0]});
   const {id,...fieldsToSave}=card;changes=fieldsToSave;
  }catch(error){return reply({error:error instanceof Error?error.message:'Invalid card'},400)}
 }else return reply({error:'Invalid card action'},400);
 const {error}=await db.from('flashcard_library').update(changes).in('id',ids);
 if(error)return databaseError(error);
 return reply({updated:ids.length});
}
