type Variability='Absent'|'Minimal'|'Moderate'|'Marked'|'Sinusoidal';
type Decelerations='None'|'Early'|'Late'|'Variable'|'Prolonged';

export const tracingFields=[
 {key:'baseline',label:'Baseline',options:['Below 110 bpm','110–160 bpm','Above 160 bpm']},
 {key:'variability',label:'Variability',options:['Absent','Minimal','Moderate','Marked','Sinusoidal']},
 {key:'accelerations',label:'Accelerations',options:['Present','Absent']},
 {key:'decelerations',label:'Decelerations',options:['None','Early','Late','Variable','Prolonged']},
 {key:'category',label:'NICHD category',options:['I','II','III']},
 {key:'contractions',label:'Contractions in 10 min',options:['2','3','4','6']},
] as const;

export type TracingField=typeof tracingFields[number]['key'];
type Event={center:number;before:number;after:number;change:number;hold?:number};
type PracticeCase={
 weeks:number;
 baseline:number;
 variability:Variability;
 accelerations?:number[];
 decelerations:Decelerations;
 category:'I'|'II'|'III';
 contractions:number[];
 events?:Event[];
 context?:string;
 rationale:string;
};

const contractionPeaks=[95,280,465];
const lateDips=contractionPeaks.map(peak=>({center:peak+33,before:42,after:52,change:-34}));

export const practiceCases:PracticeCase[]=[
 {weeks:39,baseline:140,variability:'Moderate',accelerations:[200,385],decelerations:'None',category:'I',contractions:contractionPeaks,
  rationale:'The tracing stays near 140 bpm between accelerations, with moderate variability and no late or variable decelerations. This is Category I.'},
 {weeks:40,baseline:135,variability:'Moderate',decelerations:'Early',category:'I',contractions:contractionPeaks,
  events:contractionPeaks.map(peak=>({center:peak,before:44,after:44,change:-25})),
  rationale:'Each gradual dip mirrors a contraction. The lowest fetal heart rate aligns with the contraction peak. Early decelerations can be present in Category I when the baseline and variability criteria are met.'},
 {weeks:38,baseline:145,variability:'Moderate',decelerations:'Late',category:'II',contractions:contractionPeaks,events:lateDips,
  rationale:'The dips are gradual and reach their lowest points after the contraction peaks. Recurrent late decelerations with moderate variability are Category II.'},
 {weeks:39,baseline:130,variability:'Moderate',decelerations:'Variable',category:'II',contractions:[90,225,365,505],
  events:[{center:86,before:6,after:25,change:-46},{center:241,before:9,after:31,change:-51},{center:510,before:6,after:22,change:-40}],
  rationale:'The rate drops abruptly, with a changing relationship to contractions. These are variable decelerations. With moderate variability, this pattern is Category II.'},
 {weeks:37,baseline:170,variability:'Moderate',decelerations:'None',category:'II',contractions:[160,410],
  rationale:'The sustained baseline is about 170 bpm, above the upper limit of 160 bpm. Tachycardia makes this Category II even with moderate variability.'},
 {weeks:39,baseline:100,variability:'Moderate',decelerations:'None',category:'II',contractions:[165,420],
  rationale:'The sustained baseline is about 100 bpm. Bradycardia with preserved variability is Category II.'},
 {weeks:38,baseline:140,variability:'Minimal',decelerations:'None',category:'II',contractions:[80,220,360,500],
  rationale:'Small fluctuations remain visible but stay within 5 bpm peak to trough. This is minimal variability, which places this tracing in Category II.'},
 {weeks:40,baseline:145,variability:'Absent',decelerations:'Late',category:'III',contractions:contractionPeaks,events:lateDips,
  rationale:'The baseline has no detectable variability between dips. Absent variability with recurrent late decelerations meets Category III criteria.'},
 {weeks:39,baseline:145,variability:'Moderate',decelerations:'Prolonged',category:'II',contractions:[65,155,245,335,425,515],
  events:[{center:280,before:22,hold:120,after:30,change:-47}],
  rationale:'The rate drops at least 15 bpm for more than two minutes and returns to baseline before ten minutes. This is a prolonged deceleration and the tracing is Category II. The window shows six contractions. Tachysystole requires averaging contraction frequency over 30 minutes.'},
 {weeks:38,baseline:140,variability:'Sinusoidal',decelerations:'None',category:'III',contractions:contractionPeaks,
  context:'The same repeating pattern was present for 15 minutes before this strip began.',
  rationale:'The smooth, regular sine wave repeats about three times per minute and has persisted for over 20 minutes. A true sinusoidal pattern is Category III.'},
];

export function tracingAnswers(item:PracticeCase):Record<TracingField,string>{
 return {
  baseline:item.baseline<110?'Below 110 bpm':item.baseline>160?'Above 160 bpm':'110–160 bpm',
  variability:item.variability,
  accelerations:item.accelerations?.length?'Present':'Absent',
  decelerations:item.decelerations,
  category:item.category,
  contractions:String(item.contractions.length),
 };
}

function pulse(seconds:number,{center,before,after,change,hold=0}:Event){
 const relative=seconds-center;
 const fraction=(relative<0?-relative:Math.max(0,relative-hold))/(relative<0?before:after);
 return fraction<1?change*(1+Math.cos(Math.PI*fraction))/2:0;
}

export function tracingSamples(item:PracticeCase){
 const amplitude={Absent:0,Minimal:2,Moderate:7,Marked:16,Sinusoidal:0}[item.variability];
 const events=[...(item.events??[]),...(item.accelerations??[]).map(center=>({center,before:24,after:24,change:28}))];
 return Array.from({length:1201},(_,index)=>{
  const seconds=index/2;
  const variation=item.variability==='Sinusoidal'?10*Math.sin(seconds*Math.PI/10):
   amplitude*(.72*Math.sin(seconds*2.17+.8*Math.sin(seconds*.11))+.28*Math.sin(seconds*3.31));
  return {
   seconds,
   heartRate:item.baseline+variation+events.reduce((sum,event)=>sum+pulse(seconds,event),0),
   uterineActivity:8+1.2*Math.sin(seconds*.37)+item.contractions.reduce((sum,center)=>
    sum+pulse(seconds,{center,before:44,after:44,change:58}),0),
  };
 });
}
