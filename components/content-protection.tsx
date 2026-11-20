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
    const preventContextMenu=(event:MouseEvent)=>{
      // Long-press on exam text must be able to open native selection handles.
      if(event.target instanceof Element&&event.target.closest('.exam-shell [data-exam-annotation]')&&
        (('pointerType' in event&&event.pointerType==='touch')||(event.button!==2&&window.matchMedia('(any-pointer: coarse)').matches)))return;
      preventCopy(event);
    };
    const preventKeys=(event:KeyboardEvent)=>{
      if(!isProtected(event.target)||editable(event.target))return;
      if((event.ctrlKey||event.metaKey)&&['c','x','s','p'].includes(event.key.toLowerCase()))event.preventDefault();
    };
    protectedRoot.addEventListener('copy',preventCopy);
    protectedRoot.addEventListener('cut',preventCopy);
    protectedRoot.addEventListener('contextmenu',preventContextMenu);
    protectedRoot.addEventListener('dragstart',preventCopy);
    protectedRoot.addEventListener('keydown',preventKeys);
    return ()=>{
      protectedRoot.removeEventListener('copy',preventCopy);
      protectedRoot.removeEventListener('cut',preventCopy);
      protectedRoot.removeEventListener('contextmenu',preventContextMenu);
      protectedRoot.removeEventListener('dragstart',preventCopy);
      protectedRoot.removeEventListener('keydown',preventKeys);
    };
  },[]);
  return <div id="protected-course-content" data-watermark={watermark} className="relative min-h-screen protected-course-content">
    {children}
  </div>
}
