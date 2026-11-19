/** Launch-page content only. These values never change the existing home or portal. */
export const launchConfig={
 launchDate:'1.11.27',
 heroVideoUrl:'https://youtu.be/LeAmhegEQaI?autoplay=1&mute=1',
 heroVideoTitle:'hi. i am serena.',
 founderPhotoPath:'/images/serena-founder.jpg',
 questionBankCount:null as number|null,
 forumQuotes:[
  {
   quote:'their own beasts',
   source:'Reddit · r/StudentNurse',
   url:'https://www.reddit.com/r/StudentNurse/comments/1jw4e4w/tips_for_mombaby/',
   context:'On how different perinatal and pediatric nursing feel'
  },
  {
   quote:'peds/ob is literally hell',
   source:'Reddit · r/StudentNurse',
   url:'https://www.reddit.com/r/StudentNurse/comments/1jo8q4b/any_tips_on_passing_motherbaby_class/'
  },
  {
   quote:'I failed the second test in OB.',
   source:'allnurses · General Students',
   url:'https://allnurses.com/peds-ob-passing-t691342/'
  },
  {
   quote:'I have failed the first 2 exams and I have felt extremely prepared for both.',
   source:'allnurses · LPN, LVN Students',
   url:'https://allnurses.com/maternity-amp-peds-class-please-t500731/'
  }
 ],
 contactEmail:'',
 kitFormUid:'2a295bc95f',
 siteUrl:process.env.NEXT_PUBLIC_SITE_URL??'',
 logoPath:'/logo.png'
};
