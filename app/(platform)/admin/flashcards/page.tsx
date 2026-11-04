import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {FlashcardStudio} from '@/components/flashcard-studio';

export default async function AdminFlashcardsPage(){
 if(!await requireNgnAdmin())redirect('/dashboard');
 return <div className="space-y-7">
  <header><p className="uppercase tracking-[.25em] text-xs font-bold text-mauve">The Maternity Method · Administration</p><h1 className="text-4xl md:text-5xl mt-4">Flashcard Studio</h1><p className="text-sm text-espresso/65 mt-3">Add cards, review their content, and publish them to the student library.</p></header>
  <nav className="flex flex-wrap gap-3" aria-label="Studio navigation"><Link href="/admin/ngn" className="btn-outline">NGN Studio</Link><Link href="/flashcards" className="btn-outline">View student flashcards</Link></nav>
  <FlashcardStudio/>
 </div>;
}
