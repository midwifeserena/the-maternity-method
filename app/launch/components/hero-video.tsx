'use client';
import {useState} from 'react';import {Play} from 'lucide-react';
import {launchVideoSource} from '../video-url.mjs';import styles from './hero-video.module.css';
export function HeroVideo({url,poster}:{url:string;poster?:string}){
 const [started,setStarted]=useState(false),source=launchVideoSource(url);
 return <div className={styles.frame}>
  {started&&source.kind==='embed'?<iframe className={styles.media} src={source.src} title="Meet The Maternity Method" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:started&&source.kind==='file'?<video className={styles.media} src={source.src} controls autoPlay playsInline poster={poster} aria-label="The Maternity Method introduction video"/>:<div className={styles.placeholder}>{poster&&<img className={styles.poster} src={poster} alt=""/>}{source.kind==='embed'||source.kind==='file'?<button type="button" className={styles.play} aria-label="Play The Maternity Method introduction video" onClick={()=>setStarted(true)}><Play size={28} fill="currentColor" aria-hidden="true"/></button>:<span className={styles.play} aria-hidden="true"><Play size={28} fill="currentColor"/></span>}<p>{source.kind==='invalid'?'Video link unavailable.':'Meet The Maternity Method'}{source.kind==='placeholder'&&<span>Introduction video coming soon</span>}</p></div>}
 </div>;
}
