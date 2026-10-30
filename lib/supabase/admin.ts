import {createClient as createAdminClient} from '@supabase/supabase-js';
/** Use ONLY in server-side route handlers. Never prefix the service key with NEXT_PUBLIC_. */
export function admin(){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{autoRefreshToken:false,persistSession:false}})}
