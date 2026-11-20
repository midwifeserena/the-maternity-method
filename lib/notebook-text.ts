export type NotebookText = {
  kind:'text';
  x:number;
  y:number;
  text:string;
  fontSize:number;
  color:string;
  boxWidth?:number;
};

let measureContext:CanvasRenderingContext2D|null|undefined;

export function notebookTextLayout(element:NotebookText,pageWidth:number){
  const lineHeight=element.fontSize*1.3;
  if(measureContext===undefined&&typeof document!=='undefined'){
    measureContext=document.createElement('canvas').getContext('2d');
  }
  const context=measureContext;
  if(context)context.font=`${element.fontSize}px Arial, sans-serif`;
  const measure=(text:string)=>context?.measureText(text).width??text.length*element.fontSize*.55;
  const originalLines=element.text.split('\n');
  const width=element.boxWidth??Math.min(Math.max(48,pageWidth-element.x),Math.max(110,...originalLines.map(measure).map(w=>w+4)));
  const lines=element.boxWidth===undefined?originalLines:originalLines.flatMap(line=>{
    if(measure(line)<=width)return [line];
    const wrapped:string[]=[];
    let current='';
    for(const token of line.match(/\S+|\s+/gu)??[]){
      if(measure(current+token)<=width){current+=token;continue;}
      if(current.trim()){wrapped.push(current.trimEnd());current='';}
      if(!token.trim())continue;
      for(const character of token){
        if(current&&measure(current+character)>width){wrapped.push(current);current='';}
        current+=character;
      }
    }
    if(current||!wrapped.length)wrapped.push(current);
    return wrapped;
  });
  return {width,lines,lineHeight,height:Math.max(lineHeight*1.5,lineHeight*lines.length),top:element.y-element.fontSize};
}
