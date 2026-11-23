export const apgarComponents=[
 {label:'Appearance',criteria:['Blue or pale all over','Pink body with blue hands and feet','Pink all over']},
 {label:'Pulse',criteria:['No heart rate','Heart rate below 100 bpm','Heart rate at least 100 bpm']},
 {label:'Grimace',criteria:['No response to stimulation','Grimace with stimulation','Cough, sneeze, cry, or active withdrawal with stimulation']},
 {label:'Activity',criteria:['Limp','Some flexion of the arms and legs','Active movement with good flexion']},
 {label:'Respiration',criteria:['No breathing','Slow or irregular breathing, weak cry','Regular breathing with a strong cry']},
] as const;

export const apgarPoints=[0,1,2] as const;
type Points=typeof apgarPoints[number];
type Assessment=readonly [Points,Points,Points,Points,Points];
export const apgarCases:ReadonlyArray<{
 title:string;
 description:string;
 heartRates:readonly [number,number];
 observations:readonly [Assessment,Assessment];
}>=[
 {title:'Transition after a term birth',description:'A newborn is delivered at 39 weeks. Assess the findings at each time point.',heartRates:[142,150],observations:[[1,2,1,1,1],[2,2,2,2,2]]},
 {title:'Vigorous newborn',description:'A newborn is delivered at 40 weeks. Look for differences between the two assessments.',heartRates:[154,146],observations:[[1,2,2,2,2],[2,2,2,2,2]]},
 {title:'Quiet first minute',description:'A newborn is delivered at 38 weeks. Use the documented findings from each assessment.',heartRates:[88,132],observations:[[0,1,1,1,1],[1,2,2,2,2]]},
 {title:'Early transition at 36 weeks',description:'A late-preterm newborn is assessed in the warmer. Score each finding independently.',heartRates:[92,144],observations:[[1,1,1,1,1],[1,2,2,2,2]]},
 {title:'Minimal response at birth',description:'A newborn is delivered at 37 weeks. These snapshots describe findings at 1 and 5 minutes.',heartRates:[76,118],observations:[[0,1,0,0,0],[1,2,1,1,1]]},
];
