'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {useRouter} from 'next/navigation';
export default function Login(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
 const router=useRouter();
 async function submit(mode:'signin'|'signup'){
  setLoading(true);setMessage('');const supabase=createClient();
  const result=mode==='signin'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
  setLoading(false);if(result.error){setMessage(result.error.message);return}
  if(mode==='signup'&&!result.data.session){setMessage('Please check your email to confirm your account.');return}
  router.push('/dashboard');router.refresh();
 }
 return <main className="min-h-screen flex items-center justify-center p-6"><div className="surface w-full max-w-md p-10 shadow-xl shadow-espresso/5"><div className="text-mauve tracking-[.25em] uppercase text-xs font-bold">The Maternity Method</div><h1 className="text-4xl mt-5">Welcome back.</h1><p className="mt-3 text-espresso/70">Your calm space to learn, practice, and grow.</p><form onSubmit={e=>{e.preventDefault();void submit('signin')}} className="mt-8 space-y-4"><label className="block text-sm font-semibold">Email<input type="email" required autoComplete="email" className="mt-2 w-full border border-rose/50 p-3 rounded-xl bg-white" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm font-semibold">Password<input type="password" required minLength={6} autoComplete="current-password" className="mt-2 w-full border border-rose/50 p-3 rounded-xl bg-white" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={loading} className="btn-primary w-full">{loading?'Working…':'Sign in'}</button><button type="button" onClick={()=>void submit('signup')} disabled={loading} className="btn-outline w-full">Create an account</button></form>{message&&<p role="status" className="mt-4 text-sm text-mauve">{message}</p>}</div></main>
}
