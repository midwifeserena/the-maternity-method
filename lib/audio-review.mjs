export const MAX_REVIEW_SOURCE_BYTES=10*1024*1024,MAX_REVIEW_SCRIPT=100000,MAX_SOURCE_TEXT=500000;
export function cleanReviewText(value){return String(value??'').normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
export function notesSections(text){const clean=cleanReviewText(text),sections=[];let remaining=clean;while(remaining){let end=Math.min(6000,remaining.length);if(end<remaining.length){const paragraph=remaining.lastIndexOf('\n\n',end);const space=remaining.lastIndexOf(' ',end);if(paragraph>2000)end=paragraph;else if(space>3000)end=space;}const part=remaining.slice(0,end).trim();if(part)sections.push({id:'notes-'+(sections.length+1),label:'Notes part '+(sections.length+1),text:part});remaining=remaining.slice(end).trim();}return sections;}
export function buildAudioReview(title,sections,selectedIds){
 const selected=new Set(selectedIds),included=sections.filter(s=>selected.has(s.id)&&s.text.trim());if(!included.length)throw Error('Choose at least one page, slide or notes section with text.');
 const script=[`Study review: ${String(title||'My maternity review').trim()}.`,...included.map(s=>`${s.label}.\n${cleanReviewText(s.text)}`),'End of review. Return to your source material for any points you want to study again.'].join('\n\n');
 if(script.length>MAX_REVIEW_SCRIPT)throw Error('This selection is too long for one recap. Choose fewer pages or slides.');return script;
}
// Web Speech exposes names/languages, not a reliable gender field. These are
// explicit female labels or commonly named English female device voices.
export function suggestedFemaleVoice(voices){
 const english=voices.filter(v=>/^en(?:-|_)/i.test(v.lang||''));
 const candidates=english.filter(v=>/\bfemale\b|\bwoman\b|\b(samantha|zira|aria|jenny|ava|susan|hazel|sonia|libby|natasha|victoria|karen|moira|tessa|serena)\b/i.test(v.name||''));
 return [...candidates].sort((a,b)=>Number(Boolean(b.localService))-Number(Boolean(a.localService))||Number(/^en-US$/i.test(b.lang))-Number(/^en-US$/i.test(a.lang))||a.name.localeCompare(b.name))[0]??null;
}
export function selectReviewVoice(voices,preferredURI){return voices.find(v=>v.voiceURI===preferredURI)??suggestedFemaleVoice(voices)??voices.find(v=>/^en(?:-|_)/i.test(v.lang||'')&&v.localService)??voices.find(v=>/^en(?:-|_)/i.test(v.lang||''))??voices.find(v=>v.default)??voices[0]??null;}
