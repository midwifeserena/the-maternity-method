import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';import {Sidebar} from '@/components/sidebar';import {ContentProtection} from '@/components/content-protection';
export default async function Layout({children}:{children:React.ReactNode}){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return <main className="p-12"><h1 className="text-4xl">Connect Supabase to begin</h1><p className="mt-5">Copy .env.example to .env.local and set up the SQL schema. See README.md.</p></main>;
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const adminEmails=(process.env.NGN_ADMIN_EMAILS??'').split(',').map(email=>email.trim().toLowerCase()).filter(Boolean);
 const isAdmin=Boolean(user.email&&adminEmails.includes(user.email.toLowerCase()));
 return <div className="min-h-screen"><Sidebar isAdmin={isAdmin}/><ContentProtection watermark={`Student ${user.id.slice(0,8)}`}><main className="md:ml-[270px] min-h-screen px-6 py-10 pt-20 md:px-12 md:py-11 xl:px-16">{children}</main></ContentProtection></div>
}
