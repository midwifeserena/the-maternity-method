import {FormattedText} from './formatted-text';
export function AnswerExplanations({options,answerKey,explanations}:{options:{id:string;label:string}[];answerKey:unknown;explanations?:Record<string,string>}){
 const entries=options.filter(option=>typeof explanations?.[option.id]==='string'&&explanations[option.id].trim());
 if(!entries.length)return null;
 return <section className="exam-answer-explanations" aria-label="Answer explanations"><h3>Answer explanations</h3>{entries.map(option=>{const correct=Array.isArray(answerKey)?answerKey.includes(option.id):answerKey===option.id;return <div key={option.id}><strong>{option.label} · {correct?'Correct answer':'Incorrect answer'}</strong><p><FormattedText text={explanations?.[option.id]}/></p></div>})}</section>;
}
