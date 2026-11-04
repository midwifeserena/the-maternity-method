import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {categories} from '@/lib/questions';
export async function GET(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required'},{status:403});
 const params=request.nextUrl.searchParams,offset=Number(params.get('offset')??0),search=(params.get('search')??'').trim();
 const category=params.get('category')||null,type=params.get('type')||null,status=params.get('status')||'active',difficulty=params.get('difficulty')||null;
 if(!Number.isSafeInteger(offset)||offset<0||search.length>200||(category&&!categories.some(value=>value===category))||(type&&!['single','sata','matrix-single','matrix-multiple'].includes(type))||!['all','active','draft','published','archived'].includes(status)||(difficulty&&!['easy','medium','hard','unset'].includes(difficulty)))return NextResponse.json({error:'Invalid library filters.'},{status:400});
 const {data,error}=await admin().rpc('admin_question_library',{p_search:search,p_category:category,p_type:type,p_status:status,p_difficulty:difficulty,p_offset:offset,p_limit:25});
 if(error)return NextResponse.json({error:['PGRST202','42883','42703'].includes(error.code)?'The Question Studio database setup needs to be installed. Existing questions have not been changed.':'Could not load the question library. Please retry.'},{status:503});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
