export function shuffled(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result;}
export const definitionKey=text=>String(text??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function readCardProgress(value){
 try{const raw=typeof value==='string'?JSON.parse(value):value,ratings={};for(const [id,status] of Object.entries(raw?.ratings??{}))if(typeof id==='string'&&['known','learning'].includes(status))ratings[id]=status;return {ratings,starred:Array.isArray(raw?.starred)?[...new Set(raw.starred.filter(id=>typeof id==='string'))]:[]};}catch{return {ratings:{},starred:[]};}
}
export function buildFlashcardTest(cards,count,kind='choice',random=Math.random){
 if(!['choice','written'].includes(kind)||!Number.isInteger(count)||count<1||count>cards.length)throw Error('Choose a valid test length.');
 const pool=cards.filter(c=>typeof c.front==='string'&&c.front.trim()&&definitionKey(c.back));
 if(pool.length<count)throw Error('Some cards have an empty term or definition. Choose fewer cards.');
 const unique=new Map();for(const card of pool)if(!unique.has(definitionKey(card.back)))unique.set(definitionKey(card.back),card);
 if(kind==='choice'&&unique.size<2)throw Error('Multiple choice needs at least two different definitions. Try written recall or choose more cards.');
 return shuffled(pool,random).slice(0,count).map(card=>{
  if(kind==='written')return {card:{...card},choices:[],correctId:card.id};
  const others=shuffled([...unique.values()].filter(c=>definitionKey(c.back)!==definitionKey(card.back)&&definitionKey(c.front)!==definitionKey(card.front)),random).slice(0,3);
  if(!others.length)throw Error('These terms cannot form an unambiguous multiple-choice test. Try written recall.');
  return {card:{...card},choices:shuffled([card,...others],random).map(c=>({id:c.id,text:c.back})),correctId:card.id};
 });
}
export function flashcardTestScore(questions,answers,kind,ratings={}){
 const correct=questions.filter(q=>kind==='choice'?answers[q.card.id]===q.correctId:ratings[q.card.id]==='known').length;
 const answered=questions.filter(q=>typeof answers[q.card.id]==='string'&&answers[q.card.id].trim()).length;
 const assessed=kind==='choice'?questions.length:questions.filter(q=>['known','learning'].includes(ratings[q.card.id])).length;
 return {correct,total:questions.length,answered,omitted:questions.length-answered,assessed,percent:questions.length&&assessed===questions.length?Math.round(correct/questions.length*100):null};
}
export function speechChunks(text){
 const chunks=[];let current='';for(const word of String(text??'').trim().split(/\s+/).filter(Boolean)){
  if(current&&current.length+word.length+1>180){chunks.push(current);current='';}
  if(word.length>180){if(current){chunks.push(current);current='';}const chars=Array.from(word);while(chars.length>180)chunks.push(chars.splice(0,180).join(''));current=chars.join('');}
  else current+=(current?' ':'')+word;
 }if(current)chunks.push(current);return chunks;
}
