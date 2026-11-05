/** Launch-page content only. These values never change the existing home or portal. */
export const launchConfig={
 launchDate:'1.11.27',
 heroVideoUrl:'',
 founderPhotoPath:'',
 questionBankCount:null as number|null,
 testimonials:[
  {quote:'Student testimonial coming soon.',name:'Student name',detail:'Placeholder testimonial'},
  {quote:'Student testimonial coming soon.',name:'Student name',detail:'Placeholder testimonial'},
  {quote:'Student testimonial coming soon.',name:'Student name',detail:'Placeholder testimonial'}
 ],
 contactEmail:'',
 kitFormUid:'2a295bc95f',
 siteUrl:process.env.NEXT_PUBLIC_SITE_URL??'',
 logoPath:'/logo.png',
 headerLogoPath:'/launch-logo.webp'
};
