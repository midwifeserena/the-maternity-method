import {safeReviewImageUrl,type ReviewImage} from '@/lib/exam-review.mjs';

export function ExamImages({images,label="Exam image"}:{images?:ReviewImage[];label?:string}){
 if(!images?.length)return null;
 return <div className="exam-images">{images.map((image,index)=>{
  const src=safeReviewImageUrl(image.url);if(!src)return null;
  return <figure key={src}><img src={src} alt={image.alt||label+' '+(index+1)} loading="lazy"/><figcaption><a href={src} target="_blank" rel="noopener noreferrer">Open image {index+1} in a new tab</a></figcaption></figure>;
 })}</div>;
}
