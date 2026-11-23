import {useId} from 'react';
import type {newbornStations} from '@/lib/newborn-assessment';

type Station=typeof newbornStations[number]['id'];
const soleCreases=[
 'M 102 87 Q 128 111 171 104','M 94 111 Q 119 136 172 125',
 'M 96 143 Q 128 163 168 144','M 104 173 Q 129 188 165 175',
 'M 112 204 Q 132 217 164 204','M 116 227 Q 133 236 155 224',
];
const descriptions={
 lanugo:['Only a few fine hairs are visible.','Several clusters of fine hairs are separated by clear skin.','Fine hairs cover much of the upper back.'],
 sole:['Lines are confined to the ball of the foot.','Lines reach the middle of the sole, with a smooth heel.','Lines run from the ball of the foot down toward the heel.'],
 palm:['Two main lines cross part of the palm separately.','One main line runs continuously across the palm.'],
 cord:['One wide, thin-walled opening and two small, thick-walled openings.','One wide, thin-walled opening and one small, thick-walled opening.'],
};
const toes=[[155,47,22,24],[121,43,15,18],[96,49,12,16],[77,59,10,13],[62,72,8,11]];

export function NewbornAssessmentDetail({station,finding,label}:{station:Station;finding:number;label:string}){
 const id=useId();
 return <svg viewBox="0 0 255 270" className="mx-auto block h-auto w-full max-w-[340px]"
  role="img" aria-label={label} aria-describedby={id+'-description'}>
  <desc id={id+'-description'}>{descriptions[station][finding]}</desc>
  <defs>
   <radialGradient id={id+'-skin'} cx=".43" cy=".36" r=".69">
    <stop stopColor="#f1c5a4"/><stop offset="1" stopColor="#d8957f"/>
   </radialGradient>
  </defs>
  <rect width="255" height="270" rx="22" fill="#f1dfd6"/>
  {station==='lanugo'&&<>
   <path d="M 106 39 Q 127 23 148 39 L 153 70 Q 181 73 205 94 Q 223 116 215 151 L 194 218 Q 128 246 61 218 L 40 151 Q 32 116 50 94 Q 73 73 102 70 Z"
    fill={`url(#${id}-skin)`} stroke="#af766c" strokeWidth="2"/>
   <path d="M 128 85 Q 123 128 129 192" fill="none" stroke="#b77971" opacity=".34" strokeWidth="4"/>
   <g stroke="#62433f" strokeWidth="1" opacity=".78" fill="none" strokeLinecap="round">
    {Array.from({length:[5,29,75][finding]},(_,index)=>{
     const x=finding===1?(index%2===0?68:147)+(index*37)%35:68+(index*37)%119;
     const y=finding===1?(index%2===0?102:148)+(index*23)%44:95+(index*23)%111;
     return <path key={index} d={`M ${x} ${y} q -4 4 -1 8`}/>;
    })}
   </g>
  </>}
  {station==='sole'&&<>
   <path d="M 67 81 Q 80 64 115 64 Q 157 52 175 76 Q 196 100 178 149 C 174 171 186 218 163 239 Q 141 263 118 239 Q 98 225 99 201 Q 98 173 83 144 Q 55 111 67 81 Z"
    fill={`url(#${id}-skin)`} stroke="#af766c" strokeWidth="2"/>
   {toes.map(([cx,cy,rx,ry])=><ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-skin)`} stroke="#af766c" strokeWidth="1.5"/>)}
   <g fill="none" stroke="#98564f" strokeWidth="3" strokeLinecap="round">
    {soleCreases.slice(0,(finding+1)*2).map(path=><path key={path} d={path}/>)}
   </g>
  </>}
  {station==='palm'&&<>
   <path d="M 95 236 Q 91 216 72 198 L 38 161 Q 30 149 41 143 Q 48 140 68 159 L 74 164 L 65 81 Q 64 69 75 68 Q 86 67 89 81 L 99 120 L 101 46 Q 101 34 113 34 Q 124 34 126 47 L 130 117 L 140 43 Q 142 32 153 34 Q 164 36 163 49 L 157 120 L 177 63 Q 181 53 191 57 Q 202 60 198 72 L 184 140 Q 198 180 175 211 L 173 236 Z"
    fill={`url(#${id}-skin)`} stroke="#af766c" strokeWidth="2"/>
   <g fill="none" stroke="#98564f" strokeWidth="3" strokeLinecap="round">
    {finding===0?<><path d="M 176 143 Q 137 153 111 143"/><path d="M 85 158 Q 107 174 156 164"/></>:<path d="M 80 148 Q 131 166 184 146"/>}
    <path d="M 91 157 Q 121 181 114 211"/>
   </g>
  </>}
  {station==='cord'&&<>
   <path d="M 41 80 Q 72 40 127 47 Q 195 43 218 98 Q 238 166 193 210 Q 146 251 86 227 Q 39 211 24 159 Q 12 112 41 80 Z" fill="#e5ccd3" stroke="#ad849a" strokeWidth="3"/>
   <path d="M 80 102 C 65 75 100 63 123 80 Q 157 103 135 122 Q 106 145 80 102 Z" fill="#743b62" stroke="#b27d99" strokeWidth="4"/>
   {(finding===0?[[77,167],[159,164]]:[[141,172]]).map(([cx,cy])=>
    <g key={cx}>
     <circle cx={cx} cy={cy} r="24" fill="#ad637d"/>
     <circle cx={cx} cy={cy} r="9" fill="#67334e"/>
    </g>)}
  </>}
 </svg>;
}
