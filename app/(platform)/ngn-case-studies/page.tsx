import {NgnBuilder} from '@/components/ngn-builder';
export default function NgnCaseStudiesPage(){
 return <div>
  <div className="flex flex-wrap justify-between items-center gap-3 mb-8"><span className="text-sm text-espresso/70">Student portal</span><span className="pill">Maternity made to make sense ♡</span></div>
  <header className="mb-9"><div className="uppercase tracking-[.28em] font-bold text-mauve text-[11px]">The Maternity Method</div><h1 className="text-4xl md:text-[48px] leading-tight mt-5">NGN Case Studies</h1><p className="text-espresso/65 mt-3 text-sm md:text-base">Practice clinical judgment with patient charts, bowties, matrix items and more.</p></header>
  <NgnBuilder/>
 </div>;
}
