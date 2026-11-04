export function NursingTip({text}:{text?:string|null}){
 if(!text?.trim())return null;
 return <aside className="exam-nursing-tip" aria-label="Nursing Tip"><h3>Nursing Tip</h3><p>{text}</p></aside>;
}
