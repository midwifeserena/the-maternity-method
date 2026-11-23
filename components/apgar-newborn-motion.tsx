import {useEffect,useRef,useState} from 'react';

type Points=0|1|2;
type Region=readonly [number,number,number,number];
const source='/apgar-newborn-simulation.webp';
const width=720;
const height=480;

// Regions are normalized to the original overhead warmer image.
const chest:Region=[.49,.385,.13,.173];
const lowerRibs:Region[]=[[.435,.424,.058,.028],[.546,.424,.058,.028]];
const face:Region=[.49,.171,.09,.10];
const limbs:Region[]=[
 [.32,.482,.105,.17], [.66,.49,.105,.17],
 [.39,.782,.10,.20], [.59,.782,.10,.20],
];
const extremities:Region[]=[
 [.283,.559,.043,.066], [.695,.572,.044,.065],
 [.423,.914,.060,.087], [.554,.917,.059,.089],
];
const skinRegions:Region[]=[face,chest,[.49,.30,.114,.123],
 [.34,.451,.074,.141],[.636,.446,.077,.14],
 [.379,.69,.065,.113],[.601,.69,.068,.113],...extremities];

function weight(x:number,y:number,[cx,cy,rx,ry]:Region){
 const radius=((x-cx)/rx)**2+((y-cy)/ry)**2;
 const falloff=Math.max(0,1-radius);
 return falloff*falloff;
}

export function ApgarNewbornMotion({appearance,breathing,respirationRate,tone,response,stimulus,paused,labored}:{
 appearance:Points;
 breathing:Points;
 respirationRate:number;
 tone:Points;
 response:Points;
 stimulus:number;
 paused:boolean;
 labored:boolean;
}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [image,setImage]=useState<HTMLImageElement|null>(null);
 const [reducedMotion,setReducedMotion]=useState(false);
 const phase=useRef(0);
 const lastStimulus=useRef(stimulus);
 const reaction=useRef(0);

 useEffect(()=>{
  const asset=new Image();
  asset.onload=()=>setImage(asset);
  asset.src=source;
  return ()=>{asset.onload=null};
 },[]);
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReducedMotion(preference.matches);
  update();
  preference.addEventListener('change',update);
  return ()=>preference.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  if(lastStimulus.current===stimulus)return;
  lastStimulus.current=stimulus;
  reaction.current=stimulus>0&&response>0?.9:0;
 },[stimulus,response]);

 useEffect(()=>{
  const context=canvas.current?.getContext('2d',{willReadFrequently:true});
  if(!context||!image)return;
  context.drawImage(image,0,0,width,height);
  const base=context.getImageData(0,0,width,height);
  const pixels=base.data;
  const horizontal=new Float32Array(width*height);
  const vertical=new Float32Array(width*height);
  const chestWeights=new Float32Array(width*height);
  const facialWeights=new Float32Array(width*height);
  const retractions=new Float32Array(width*height);
  const active:number[]=[];
  const tintRegions=appearance===0?skinRegions:extremities;

  for(let y=0;y<height;y++){
   for(let x=0;x<width;x++){
    const i=y*width+x;
    const nx=x/width,ny=y/height;
    if(nx<.21||nx>.77||ny<.05||ny>.99)continue;
    chestWeights[i]=weight(nx,ny,chest);
    facialWeights[i]=weight(nx,ny,face);
    if(labored)retractions[i]=lowerRibs.reduce((sum,area)=>sum+weight(nx,ny,area),0);
    const a=weight(nx,ny,limbs[0])+weight(nx,ny,limbs[2]);
    const b=weight(nx,ny,limbs[1])+weight(nx,ny,limbs[3]);
    horizontal[i]=a-b;
    vertical[i]=a+b;
    if(a||b||chestWeights[i]||facialWeights[i]||retractions[i])active.push(i);

    if(appearance===2)continue;
    const tint=Math.min(1,tintRegions.reduce((sum,area)=>sum+Math.sqrt(weight(nx,ny,area)),0));
    const offset=i*4;
    pixels[offset]-=tint*(appearance===0?39:55);
    pixels[offset+1]-=tint*(appearance===0?9:13);
    pixels[offset+2]+=tint*(appearance===0?18:33);
   }
  }

  const frame=context.createImageData(width,height);
  frame.data.set(pixels);
  const output=new Uint32Array(frame.data.buffer);
  const original=new Uint32Array(pixels.buffer);
  let request=0;
  let previous=0;
  let lastDraw=0;

  function draw(now:number){
   const elapsed=previous?Math.min((now-previous)/1000,.1):0;
   previous=now;
   if(!paused)phase.current+=elapsed;
   reaction.current=Math.max(0,reaction.current-elapsed);
   if(now-lastDraw>=32){
    lastDraw=now;
    const t=phase.current;
    const breathPhase=t*respirationRate*2*Math.PI/60;
    const irregularity=breathing===1?.65*Math.sin(breathPhase*.5):0;
    const rise=1-Math.cos(breathPhase+irregularity);
    const breathingMotion=breathing===2?rise*6:breathing===1?rise*(labored?5:3.5):0;
    const limbMotion=tone===2?Math.sin(t*4.1)*6:0;
    const reflex=reaction.current>0?Math.sin(reaction.current/.9*Math.PI):0;
    for(const i of active){
     const x=i%width,y=Math.floor(i/width);
     const drawIn=retractions[i]*breathingMotion;
     const dx=(x-width*chest[0])*chestWeights[i]*breathingMotion*.009+horizontal[i]*(limbMotion+reflex*(response===2?10:0));
     const dy=chestWeights[i]*breathingMotion-drawIn*1.7+
      vertical[i]*(Math.abs(limbMotion)*.5+reflex*(response===2?6:0))+
      facialWeights[i]*reflex*(response===1?3:5);
     const sourceX=Math.max(0,Math.min(width-1,Math.round(x-dx)));
     const sourceY=Math.max(0,Math.min(height-1,Math.round(y-dy)));
     const sourceIndex=sourceY*width+sourceX;
     output[i]=original[sourceIndex];
     if(drawIn>0){
      const offset=i*4;
      frame.data[offset]-=drawIn*3;
      frame.data[offset+1]-=drawIn*3;
      frame.data[offset+2]-=drawIn*2;
     }
    }
    context?.putImageData(frame,0,0);
   }
   if(!paused||reaction.current>0)request=requestAnimationFrame(draw);
  }

  context.putImageData(base,0,0);
  if(!reducedMotion&&(!paused&&(breathing>0||tone===2)||reaction.current>0))request=requestAnimationFrame(draw);
  return ()=>cancelAnimationFrame(request);
 },[appearance,breathing,image,labored,paused,reducedMotion,respirationRate,response,stimulus,tone]);

 return <canvas ref={canvas} width={width} height={height}
  className="block aspect-[3/2] w-full bg-[#ecd9d3] bg-cover bg-center"
  style={{backgroundImage:`url(${source})`}} aria-hidden="true"/>;
}
