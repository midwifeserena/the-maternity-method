'use client';

import {useState} from 'react';
import {Box,ExternalLink} from 'lucide-react';

const modelPage='https://sketchfab.com/3d-models/baby-452ee1d9783e49f2a480fca806014b91';
const viewer='https://sketchfab.com/models/452ee1d9783e49f2a480fca806014b91/embed?autostart=1';

export function NewbornModelPreview(){
 const [open,setOpen]=useState(false);

 return <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="newborn-model-title">
  <h2 id="newborn-model-title" className="flex items-center gap-2 text-2xl">
   <Box className="text-mauve" size={22} aria-hidden="true"/> 3D newborn preview
  </h2>
  <p className="text-sm">Rotate and zoom to inspect the model. The preview uses a fixed pose.</p>
  <button type="button" className="btn-outline" aria-expanded={open} aria-controls="newborn-model-viewer"
   onClick={()=>setOpen(visible=>!visible)}>{open?'Close 3D preview':'Open 3D preview'}</button>
  <div id="newborn-model-viewer" hidden={!open}>
   {open&&<iframe src={viewer} title="Interactive 3D newborn model on Sketchfab"
    className="block h-[clamp(320px,55vw,620px)] w-full rounded-xl border border-rose bg-oatmeal"
    allow="autoplay; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
  </div>
  <p className="text-xs text-espresso/75">
   Baby by darksoundlab · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
  </p>
  <a className="inline-flex items-center gap-1 text-sm font-semibold text-mauve underline underline-offset-4" href={modelPage} target="_blank" rel="noopener noreferrer">
   Open on Sketchfab <ExternalLink size={15} aria-hidden="true"/>
  </a>
 </section>;
}
