'use client';

import {useEffect, type ReactNode} from 'react';

/** Browser-side friction only. It is not DRM and cannot prevent screenshots or devtools extraction. */
export function ContentProtection({children, watermark}:{children:ReactNode;watermark:string}){
  useEffect(()=>{
    const protectedRoot=document.getElementById('protected-course-content');
    if(!protectedRoot)return;
    const isProtected=(target:EventTarget|null)=>target instanceof Node && protectedRoot.contains(target);
    const editable=(target:EventTarget|null)=>target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
    const preventCopy=(event:Event)=>{if(isProtected(event.target)&&!editable(event.target)) event.preventDefault();};
    const preventKeys=(event:KeyboardEvent)=>{
      if(!isProtected(event.target)||editable(event.target))return;
      if((event.ctrlKey||event.metaKey)&&['c','x','s','p'].includes(event.key.toLowerCase()))event.preventDefault();
    };
    protectedRoot.addEventListener('copy',preventCopy);
    protectedRoot.addEventListener('cut',preventCopy);
    protectedRoot.addEventListener('contextmenu',preventCopy);
    protectedRoot.addEventListener('dragstart',preventCopy);
    protectedRoot.addEventListener('keydown',preventKeys);
    return ()=>{
      protectedRoot.removeEventListener('copy',preventCopy);
      protectedRoot.removeEventListener('cut',preventCopy);
      protectedRoot.removeEventListener('contextmenu',preventCopy);
      protectedRoot.removeEventListener('dragstart',preventCopy);
      protectedRoot.removeEventListener('keydown',preventKeys);
    };
  },[]);
  return <div id="protected-course-content" className="relative min-h-screen protected-course-content">
    <div className="pointer-events-none fixed inset-y-0 right-0 left-0 md:left-[270px] z-[35] overflow-hidden opacity-[0.12] select-none" aria-hidden="true">
      <div className="absolute inset-[-35%] -rotate-[24deg] flex flex-wrap content-center justify-center gap-x-24 gap-y-24">
        {Array.from({length:96},(_,i)=><span key={i} className="text-xs font-semibold whitespace-nowrap tracking-wide text-espresso">The Maternity Method · {watermark}</span>)}
      </div>
    </div>
    {children}
  </div>
}
