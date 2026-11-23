export const newbornStations=[
 {id:'lanugo',label:'Shoulders & back',view:'Upper back close-up',question:'How would you document the lanugo?',
  options:['Little or no visible lanugo','Patchy, fine lanugo','Abundant, fine lanugo']},
 {id:'sole',label:'Soles of the feet',view:'Plantar surface close-up',question:'Where do the visible plantar creases extend?',
  options:['Forefoot only','Forefoot and midfoot','Most of the sole, including the heel']},
 {id:'palm',label:'Palms',view:'Palm close-up',question:'What transverse crease pattern do you see?',
  options:['Two separate transverse creases','One continuous transverse crease']},
 {id:'cord',label:'Umbilical cord',view:'Cord cross-section',question:'Which vessels are visible in this cross-section?',
  options:['Two arteries and one vein','One artery and one vein','One artery and two veins']},
] as const;

export const newbornCases=[
 {title:'Newborn in the warmer',findings:[2,0,0,0]},
 {title:'Newborn after a term birth',findings:[0,2,1,0]},
 {title:'Newborn during a routine exam',findings:[1,1,0,1]},
] as const;

export const findingExplanations=[
 [
  'Little fine hair is visible across the upper back. Lanugo changes across gestation, so its amount alone does not establish gestational age.',
  'Fine hair appears in patches with clearer skin between them. In the New Ballard assessment, lanugo is considered alongside other maturity findings.',
  'Fine hair covers much of the upper back. This is lanugo, a physical maturity finding in the New Ballard assessment.',
 ],
 [
  'The creases stay near the toes and ball of the foot. Look at the full sole, from the toes to the heel, when documenting their extent.',
  'Creases extend beyond the ball of the foot into the midfoot, with fewer visible creases at the heel.',
  'Creases extend from the forefoot toward the heel. Plantar creases are one of the physical findings used in a New Ballard assessment.',
 ],
 [
  'Two distinct major creases run across the palm. Palmar creases are documented in the newborn exam.',
  'One continuous crease crosses the palm. A single transverse palmar crease can occur as a normal variant and is not diagnostic on its own.',
 ],
 [
  'The typical cord has two smaller, thicker-walled arteries and one larger, thinner-walled vein.',
  'One small, thick-walled artery and one larger vein are visible. This is a two-vessel cord with a single umbilical artery.',
 ],
] as const;
