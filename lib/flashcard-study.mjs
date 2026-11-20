export function shuffled(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result;}
export const definitionKey=text=>String(text??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export function readCardProgress(value){
 try{const raw=typeof value==='string'?JSON.parse(value):value,ratings={};for(const [id,status] of Object.entries(raw?.ratings??{}))if(typeof id==='string'&&['known','learning'].includes(status))ratings[id]=status;return {ratings,starred:Array.isArray(raw?.starred)?[...new Set(raw.starred.filter(id=>typeof id==='string'))]:[]};}catch{return {ratings:{},starred:[]};}
}
export function buildLearnQuestion(card,pool,random=Math.random){
 const unique=new Map();
 const term=definitionKey(card.front);
 const termDefinitions=new Set([definitionKey(card.back)]);
 for(const candidate of pool){
  if(definitionKey(candidate.front)===term)termDefinitions.add(definitionKey(candidate.back));
 }
 for(const candidate of pool){
  const definition=definitionKey(candidate.back);
  if(definition&&definitionKey(candidate.front)&&!termDefinitions.has(definition)&&!unique.has(definition)){
   unique.set(definition,candidate);
  }
 }
 const distractors=shuffled([...unique.values()],random).slice(0,3);
 const choices=distractors.length?shuffled([card,...distractors],random).map(item=>({id:item.id,text:item.back})):[];
 return {card,choices,correctId:card.id};
}
export function buildFlashcardTest(cards,count,kind='choice',random=Math.random){
 if(!['choice','written'].includes(kind)||!Number.isInteger(count)||count<1||count>cards.length)throw Error('Choose a valid test length.');
 const pool=cards.filter(c=>typeof c.front==='string'&&c.front.trim()&&definitionKey(c.back));
 if(pool.length<count)throw Error('Some cards have an empty term or definition. Choose fewer cards.');
 const definitions=new Set(pool.map(card=>definitionKey(card.back)));
 if(kind==='choice'&&definitions.size<2)throw Error('Multiple choice needs at least two different definitions. Try written recall or choose more cards.');
 return shuffled(pool,random).slice(0,count).map(card=>{
  const question=kind==='written'?{card,choices:[],correctId:card.id}:buildLearnQuestion(card,pool,random);
  if(kind==='choice'&&!question.choices.length)throw Error('These terms cannot form an unambiguous multiple-choice test. Try written recall.');
  return {...question,card:{...card}};
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
