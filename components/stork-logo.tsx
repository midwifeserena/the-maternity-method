import type {SVGProps} from 'react';

/** Original rose-gold stork/stethoscope monoline placeholder; replace with approved master brand artwork later. */
export function StorkLogo(props:SVGProps<SVGSVGElement>){
 return <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stork shaped like a stethoscope" {...props}>
 <circle cx="40" cy="40" r="38" fill="#E6D4CA"/>
 <path d="M22 24c1 11 3 18 10 21 5 2 11 0 15-4 5-6 5-15 8-21" stroke="#B38585" strokeWidth="3.6" strokeLinecap="round"/>
 <path d="M18 21v8m6-10v10M54 18v9" stroke="#8E4A55" strokeWidth="3.5" strokeLinecap="round"/>
 <path d="M41 44c-1 10 3 15 10 16 7 1 12-4 12-11 0-6-4-10-9-10" stroke="#A77876" strokeWidth="3.5" strokeLinecap="round"/>
 <circle cx="54" cy="39" r="4.3" stroke="#8E4A55" strokeWidth="3" fill="#F2E7DA"/>
 <path d="M47 36c2-7 7-13 13-16 2-1 6-1 8 0-4 1-7 3-9 6l9 1-12 3" stroke="#8E4A55" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
 <circle cx="61" cy="22" r="1.4" fill="#4E3629"/>
 <path d="M28 45c-3 7-1 14 6 18m4-16c-1 6 2 11 6 14" stroke="#B38585" strokeWidth="2.2" strokeLinecap="round"/>
 </svg>
}
