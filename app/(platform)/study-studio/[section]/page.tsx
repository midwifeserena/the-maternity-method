import {notFound} from 'next/navigation';
import {StudyStudio} from '@/components/study-studio';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['notebook','flashcards','sheets','podcast'].includes(section))notFound();return <StudyStudio section={section}/>}
