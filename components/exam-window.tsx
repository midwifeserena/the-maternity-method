'use client';
import type {ComponentPropsWithRef,ReactNode} from 'react';
import {Clock} from 'lucide-react';
import './exam.css';
/** Shared NCLEX-style window used by standalone exams and complete NGN cases. */
export function ExamWindow({className='',...props}:ComponentPropsWithRef<'dialog'>){
 return <dialog {...props} className={`exam-shell ${className}`.trim()}/>;
}
export function ExamHeader({label,time,timeLabel,position}:{label:ReactNode;time:string;timeLabel:string;position:string}){
 return <header className="exam-topbar"><span>{label}</span><strong className="exam-brand">The Maternity Method</strong><div className="exam-meta"><span className="exam-clock" aria-label={timeLabel}><Clock size={18}/>{time}</span><span>{position}</span></div></header>;
}
export function ExamFooter({children}:{children:ReactNode}){return <footer className="exam-footer">{children}</footer>;}
