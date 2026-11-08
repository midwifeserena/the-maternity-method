const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validateExamDraft(value,questions){
 if(!object(value)||value.version!==1||JSON.stringify(value).length>500000)throw Error('Invalid saved progress');
 const ids=new Set(questions.map(q=>q.id)),answers={},strikes={};
 if(!Number.isInteger(value.index)||value.index<0||value.index>=questions.length||!Number.isSafeInteger(value.elapsed)||value.elapsed<0||value.elapsed>86400)throw Error('Invalid saved position or time');
 if(!object(value.answers)||!object(value.strikes))throw Error('Invalid saved answers');
 for(const [id,answer] of Object.entries(value.answers)){if(!ids.has(id)||!(typeof answer==='string'||Array.isArray(answer)&&answer.every(v=>typeof v==='string')||object(answer)&&Object.values(answer).every(v=>typeof v==='string'||Array.isArray(v)&&v.every(x=>typeof x==='string'))))throw Error('Invalid saved answer');answers[id]=answer;}
 for(const [id,options] of Object.entries(value.strikes)){if(!ids.has(id)||!Array.isArray(options)||options.some(v=>typeof v!=='string'))throw Error('Invalid saved markings');strikes[id]=options;}
 const list=key=>{if(!Array.isArray(value[key])||value[key].some(id=>!ids.has(id)))throw Error('Invalid saved question');return [...new Set(value[key])];};
 const annotations={};if(value.annotations!==undefined){if(!object(value.annotations))throw Error('Invalid highlights');for(const [id,records] of Object.entries(value.annotations)){if(!ids.has(id)||!Array.isArray(records)||records.length>500||records.some(r=>!object(r)||typeof r.region!=='string'||r.region.length>200||!Number.isSafeInteger(r.start)||!Number.isSafeInteger(r.end)||r.start<0||r.end<=r.start||r.end>500000))throw Error('Invalid highlights');annotations[id]=records.map(({region,start,end})=>({region,start,end}));}}
 const telemetry={milliseconds:{},firstAnswers:{}};if(object(value.telemetry)){for(const [id,time] of Object.entries(value.telemetry.milliseconds??{}))if(ids.has(id)&&Number.isFinite(time)&&time>=0&&time<=86400000)telemetry.milliseconds[id]=time;for(const [id,answer] of Object.entries(value.telemetry.firstAnswers??{}))if(ids.has(id)&&typeof answer==='string')telemetry.firstAnswers[id]=answer;}
 return {version:1,index:value.index,elapsed:value.elapsed,answers,strikes,flags:list('flags'),highlights:list('highlights'),checked:list('checked'),annotations,telemetry};
}
