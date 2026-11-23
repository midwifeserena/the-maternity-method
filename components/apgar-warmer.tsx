import {useId,useState} from 'react';
import {HeartPulse,Hand} from 'lucide-react';
import styles from './apgar-warmer.module.css';

type Points=0|1|2;
type WarmerProps={
 findings:readonly [Points,Points,Points,Points,Points];
 heartRate:number;
 stimulus:number;
 onStimulate:()=>void;
};

export function ApgarWarmer({findings,heartRate,stimulus,onStimulate}:WarmerProps){
 const id=useId();
 const [paused,setPaused]=useState(false);
 const [appearance,,response,tone,breathing]=findings;
 const skin=['#aaa0ae','#da9e84','#e3a487'][appearance];
 const extremities=appearance===1?'#8f839d':skin;
 const responding=stimulus>0&&response>0;
 const armLeft=tone===0?'M 209 150 Q 187 166 185 200':'M 209 150 Q 175 156 181 131';
 const armRight=tone===0?'M 271 150 Q 294 166 295 200':'M 271 150 Q 307 156 299 131';
 const legLeft=tone===0?'M 222 196 Q 209 218 207 251':'M 222 196 Q 190 216 211 234';
 const legRight=tone===0?'M 258 196 Q 271 218 273 251':'M 258 196 Q 290 216 269 234';

 return <div className={styles.station} data-paused={paused}>
  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-white">
   <span>Radiant warmer</span>
   <span className="inline-flex items-center gap-2 rounded-md bg-[#412632] px-2.5 py-1.5">
    <HeartPulse size={17} aria-hidden="true"/> Heart rate {heartRate} bpm
   </span>
  </div>
  <svg viewBox="0 0 480 310" className="block w-full" aria-hidden="true">
   <defs>
    <linearGradient id={id+'-pad'} x2="0" y2="1">
     <stop stopColor="#fff5e5"/><stop offset="1" stopColor="#e9cbc8"/>
    </linearGradient>
    <linearGradient id={id+'-light'} x2="0" y2="1">
     <stop stopColor="#ffe1a3" stopOpacity=".7"/><stop offset="1" stopColor="#fff4cf" stopOpacity="0"/>
    </linearGradient>
   </defs>
   <rect width="480" height="310" fill="#ecd9d3"/>
   <path d="M 88 16 H 392 L 439 270 H 41 Z" fill={`url(#${id}-light)`}/>
   <rect x="108" y="8" width="264" height="20" rx="10" fill="#996172"/>
   <rect x="137" y="23" width="206" height="6" rx="3" fill="#ffd597"/>
   <rect x="67" y="44" width="346" height="248" rx="31" fill="#ae7783"/>
   <rect x="78" y="52" width="324" height="229" rx="25" fill={`url(#${id}-pad)`}/>
   <path d="M 102 75 V 259 M 115 75 V 259 M 365 75 V 259 M 378 75 V 259" stroke="#c49097" strokeWidth="3" opacity=".52"/>
   <ellipse cx="240" cy="259" rx="83" ry="13" fill="#7c4353" opacity=".13"/>
   <g key={stimulus} className={responding&&response===2?styles.withdraw:undefined}>
    <g fill="none" stroke={skin} strokeWidth="17" strokeLinecap="round">
     <path className={tone===2?styles.armLeft:undefined} d={armLeft}/>
     <path className={tone===2?styles.armRight:undefined} d={armRight}/>
     <path className={tone===2?styles.legLeft:undefined} d={legLeft}/>
     <path className={tone===2?styles.legRight:undefined} d={legRight}/>
    </g>
    <g fill={extremities}>
     <circle className={tone===2?styles.armLeft:undefined} cx={tone===0?185:181} cy={tone===0?200:131} r="11"/>
     <circle className={tone===2?styles.armRight:undefined} cx={tone===0?295:299} cy={tone===0?200:131} r="11"/>
     <ellipse className={tone===2?styles.legLeft:undefined} cx={tone===0?207:211} cy={tone===0?251:234} rx="13" ry="9"/>
     <ellipse className={tone===2?styles.legRight:undefined} cx={tone===0?273:269} cy={tone===0?251:234} rx="13" ry="9"/>
    </g>
    <g className={breathing===2?styles.regularBreath:breathing===1?styles.irregularBreath:undefined}>
     <path d="M 218 132 Q 240 125 262 132 Q 283 148 279 177 Q 275 196 260 202 H 220 Q 201 194 201 174 Q 200 152 218 132" fill={skin} stroke="#8c5961" strokeWidth="1.5"/>
     <path d="M 214 155 Q 240 146 265 155 M 217 163 Q 240 155 262 163" fill="none" stroke="#9c6670" strokeWidth="1.4" opacity=".5"/>
    </g>
    <path d="M 205 181 Q 239 194 276 181 L 269 204 Q 241 218 212 205 Z" fill="#fff8ed" stroke="#cda9a6" strokeWidth="2"/>
    <circle cx="204" cy="110" r="10" fill={skin}/><circle cx="276" cy="110" r="10" fill={skin}/>
    <ellipse cx="240" cy="104" rx="37" ry="35" fill={skin} stroke="#8c5961" strokeWidth="1.5"/>
    <path d="M 211 88 Q 218 67 247 71 Q 264 74 271 88 Q 249 77 236 87 Q 225 82 211 88" fill="#513842"/>
    <path d="M 222 105 Q 227 108 232 104 M 248 104 Q 253 108 258 105" fill="none" stroke="#633c49" strokeWidth="2" strokeLinecap="round"/>
    <path d="M 235 123 Q 240 125 245 123" fill="none" stroke="#763d4d" strokeWidth="2" strokeLinecap="round"/>
    {responding&&<path className={styles.reaction} d={response===1?'M 233 124 Q 240 117 247 124':'M 231 124 Q 240 112 249 124 Q 240 132 231 124 Z'}
     fill={response===2?'#7a384a':'none'} stroke="#763d4d" strokeWidth="3" strokeLinecap="round"/>}
   </g>
   <path d="M 68 70 V 268 Q 68 290 91 290 H 389 Q 412 290 412 268 V 70" fill="none" stroke="#fff6f2" strokeWidth="5" opacity=".6"/>
  </svg>
  <div className="flex flex-wrap items-center gap-3 px-4 py-4">
   <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fff9f2] px-4 font-semibold text-mauve hover:bg-blush" onClick={onStimulate}>
    <Hand size={17} aria-hidden="true"/> Check response to stimulation
   </button>
   <button type="button" className="min-h-11 px-2 text-sm font-semibold text-white underline underline-offset-4" onClick={()=>setPaused(value=>!value)}>
    {paused?'Resume motion':'Pause motion'}
   </button>
  </div>
 </div>;
}
