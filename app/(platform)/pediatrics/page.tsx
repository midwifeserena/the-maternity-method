import {QuestionBuilder} from '@/components/question-builder';

export default function PediatricsPage(){
 return <>
  <header className="mauve-page-header mb-9">
   <h1 className="text-4xl">Pediatrics Question Bank</h1>
   <p className="mt-3">Build a practice exam from published pediatric questions.</p>
  </header>
  <QuestionBuilder pediatric/>
 </>;
}
