import Link from 'next/link';

export default function EnrollmentClosed(){
 return <main className="min-h-screen grid place-items-center p-6">
  <section className="surface w-full max-w-lg p-7 sm:p-9">
   <p className="text-xs font-bold uppercase tracking-widest text-mauve">The Maternity Method</p>
   <h1 className="mt-4 text-3xl sm:text-4xl">Enrollment opens January 11</h1>
   <p className="mt-4">The study suite is currently open to invited testers. If you’ve been invited, sign in with the email address on your invitation.</p>
   <div className="mt-6 flex flex-wrap gap-3">
    <Link className="btn-primary" href="/launch#launch">Join the launch list</Link>
    <Link className="btn-outline" href="/login">Tester sign-in</Link>
   </div>
  </section>
 </main>;
}
