'use client';

import {useRef,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {useRouter} from 'next/navigation';

type Action='signin'|'signup'|'resend'|'reset';

export default function Login(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
 const [working,setWorking]=useState<Action|null>(null);
 const emailInput=useRef<HTMLInputElement>(null);
 const router=useRouter();

 async function submit(action:Action){
  if(working||!emailInput.current?.reportValidity())return;
  setWorking(action);
  setNotice(null);
  const address=email.trim();
  const callback=new URL('/auth/callback',window.location.origin);

  try{
   const {auth}=createClient();
   if(action==='reset'){
    callback.searchParams.set('next','/reset-password');
    const {error}=await auth.resetPasswordForEmail(address,{redirectTo:callback.href});
    if(error)throw error;
    setNotice({text:'If an account exists for this email, look for a password reset message from The Maternity Method.',error:false});
    return;
   }
   if(action==='resend'){
    const {error}=await auth.resend({type:'signup',email:address,options:{emailRedirectTo:callback.href}});
    if(error)throw error;
    setNotice({text:'If this account still needs confirmation, look for a new email from The Maternity Method. Check Spam if it doesn’t arrive.',error:false});
    return;
   }

   const result=action==='signin'
    ?await auth.signInWithPassword({email:address,password})
    :await auth.signUp({email:address,password,options:{emailRedirectTo:callback.href}});
   if(result.error)throw result.error;
   if(!result.data.session){
    setNotice({text:'For a new account, look for a confirmation email from The Maternity Method and check Spam. If you already have an account, choose Sign in or Reset password.',error:false});
    return;
   }
   router.push('/dashboard');
   router.refresh();
  }catch(error){
   const code=(error as {code?:string})?.code;
   const text=code==='email_not_confirmed'
    ?'This email still needs confirmation. Choose Resend confirmation below.'
    :code==='invalid_credentials'
     ?'We couldn’t sign you in with that email and password. Check both or choose Reset password.'
     :error instanceof Error?error.message:'Something went wrong. Please try again.';
   setNotice({text,error:true});
  }finally{
   setWorking(null);
  }
 }

 function handleSubmit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const button=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
  void submit(button?.value==='signup'?'signup':'signin');
 }

 return <main className="min-h-screen flex items-center justify-center p-6">
  <div className="surface sign-in-card w-full max-w-md p-6 shadow-xl shadow-espresso/5 sm:p-10">
   <div className="text-mauve tracking-[.25em] uppercase text-xs font-bold">The Maternity Method</div>
   <h1 className="text-4xl mt-5">Welcome back.</h1>
   <p className="mt-3 text-espresso/70">Invited testers can sign in with the email address on their invitation. Public enrollment opens January 11.</p>
   <form onSubmit={handleSubmit} className="mt-8 space-y-4">
    <label className="block text-sm font-semibold">Email
     <input ref={emailInput} type="email" required autoComplete="email" className="mt-2 w-full border border-rose/50 p-3 rounded-xl bg-white" value={email} onChange={event=>setEmail(event.target.value)}/>
    </label>
    <label className="block text-sm font-semibold">Password
     <input type="password" required minLength={6} autoComplete="current-password" className="mt-2 w-full border border-rose/50 p-3 rounded-xl bg-white" value={password} onChange={event=>setPassword(event.target.value)}/>
    </label>
    <button type="submit" value="signin" disabled={!!working} className="btn-primary w-full">{working==='signin'?'Signing in…':'Sign in'}</button>
    <button type="submit" value="signup" disabled={!!working} className="btn-outline w-full">{working==='signup'?'Creating account…':'Create a tester account'}</button>
   </form>
   {notice&&<p role={notice.error?'alert':'status'} className="mt-4 text-sm text-mauve">{notice.text}</p>}
   <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-mauve">
    <button type="button" disabled={!!working} className="underline" onClick={()=>void submit('resend')}>{working==='resend'?'Requesting…':'Resend confirmation'}</button>
    <button type="button" disabled={!!working} className="underline" onClick={()=>void submit('reset')}>{working==='reset'?'Requesting…':'Reset password'}</button>
   </div>
  </div>
 </main>;
}
