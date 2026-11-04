export function NursingTip({text,title='Nursing Tip'}:{text?:string|null;title?:string}){
 if(!text?.trim())return null;
 return <aside className="exam-nursing-tip" aria-label={title}><h3>{title}</h3><p>{text}</p></aside>;
}
