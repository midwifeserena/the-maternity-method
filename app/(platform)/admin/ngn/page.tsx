import {redirect} from 'next/navigation';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {NgnAdminEditor} from '@/components/ngn-admin-editor';
export default async function AdminNgnPage(){
 const user=await requireNgnAdmin();
 if(!user)redirect('/dashboard');
 return <div className="space-y-8"><header><div className="uppercase tracking-[.25em] text-xs font-bold text-mauve">The Maternity Method · Administration</div><h1 className="text-4xl md:text-5xl mt-4">NGN Content Studio</h1><p className="text-sm text-espresso/65 mt-3">A calm place to review, revise, approve, and publish your clinical case studies.</p></header><NgnAdminEditor/></div>;
}
