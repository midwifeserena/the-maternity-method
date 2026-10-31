import {createClient} from '@/lib/supabase/server';
export async function requireNgnAdmin(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return null;
 const allowed=(process.env.NGN_ADMIN_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!allowed.includes(user.email.toLowerCase()))return null;
 return user;
}
