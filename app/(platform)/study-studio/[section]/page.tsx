import {notFound,redirect} from 'next/navigation';
import {StudyStudio} from '@/components/study-studio';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(['podcast','newborn-assessment'].includes(section))redirect('/study-studio');if(!['notebook','flashcards','sheets'].includes(section))notFound();return <StudyStudio section={section}/>}
