'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './kit-form.module.css';

export function KitForm({uid}:{uid:string}){
 const container=useRef<HTMLDivElement>(null),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const host=container.current;if(!host)return;
  let active=true;setState('loading');
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(uid)){setState('error');return}
  function inspect(){if(active&&host?.querySelector('form, iframe'))setState('ready')}
  const observer=new MutationObserver(inspect);observer.observe(host,{childList:true,subtree:true});
  const timeout=window.setTimeout(()=>{if(active&&!host.querySelector('form, iframe'))setState('error')},20_000);
  // Delay insertion one task: React Strict Mode's probe cleanup cancels the first
  // attempt before it can download/execute a duplicate vendor script.
  const insertion=window.setTimeout(()=>{
   if(!active||host.querySelector('script[data-uid]'))return;
   const script=document.createElement('script');script.async=true;script.src=`https://maternity-method.kit.com/${encodeURIComponent(uid)}/index.js`;script.dataset.uid=uid;
   script.onload=inspect;script.onerror=()=>{if(active)setState('error')};host.appendChild(script);
  },0);
  return()=>{active=false;window.clearTimeout(insertion);window.clearTimeout(timeout);observer.disconnect();host.replaceChildren()};
 },[uid,retry]);
 return <div className={styles.wrapper} aria-label="Launch list sign-up">
  <div role="status" aria-live="polite">{state==='loading'?'Loading sign-up form…':null}</div>
  <div ref={container} className={styles.embed} aria-busy={state==='loading'}/>
  {state==='error'&&<div role="alert" className={styles.error}><p>The sign-up form couldn’t load. Please try again.</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Reload sign-up form</button></div>}
 </div>;
}
