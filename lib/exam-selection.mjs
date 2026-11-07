/** Build an exact-size exam without splitting six-question cases. Each selected format is represented. */
export function planExamSelection({count,formats,standard=[],ngn=[],cases=[]}){
 const empty=error=>({questionIds:[],caseIds:[],error});
 if(!Number.isInteger(count)||count<1||count>150)return empty('Choose a whole number from 1 to 150.');
 if(!formats.length)return empty('Select at least one question category.');
 const pools=[['standard',standard],['ngn',ngn]].filter(([format])=>formats.includes(format));
 if(pools.some(([,ids])=>!ids.length))return empty('A selected standalone format has no questions matching your filters. Adjust your filters or deselect that format.');
 const withCases=formats.includes('cases');
 if(withCases&&!cases.length)return empty('No complete published cases match your selected subjects.');
 if(withCases&&!pools.length&&count%6)return empty('For case studies only, choose a multiple of six, up to 150.');
 const minimum=pools.length+(withCases?6:0);
 if(count<minimum)return empty(`Choose at least ${minimum} questions to include every selected format.`);
 const capacity=pools.reduce((n,[,ids])=>n+ids.length,0);
 const minCases=withCases?Math.max(1,Math.ceil((count-capacity)/6)):0;
 const maxCases=withCases?Math.min(cases.length,Math.floor((count-pools.length)/6)):0;
 if(minCases>maxCases||(!withCases&&count>capacity))return empty('Not enough matching questions for this total. Reduce the number or broaden your filters.');
 const caseCount=withCases?(pools.length?Math.max(minCases,Math.min(maxCases,Math.floor(count/(pools.length+1)/6))):count/6):0;
 const remaining=count-caseCount*6;
 if(remaining>capacity||caseCount>cases.length)return empty('Not enough matching questions for this total. Reduce the number or broaden your filters.');
 const questionIds=[],offsets=pools.map(()=>0);
 while(questionIds.length<remaining){for(let i=0;i<pools.length&&questionIds.length<remaining;i++){const ids=pools[i][1];if(offsets[i]<ids.length)questionIds.push(ids[offsets[i]++]);}}
 return {questionIds,caseIds:cases.slice(0,caseCount),error:''};
}
