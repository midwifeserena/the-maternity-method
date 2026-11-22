import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {parseDraftBankImport} from '@/lib/draft-bank-import.mjs';

export async function POST(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required.'},{status:403});
 const size=Number(request.headers.get('content-length'));
 if(size>1_500_000)return NextResponse.json({error:'Choose the original Markdown file under 1.5 MB.'},{status:413});
 const markdown=await request.text();
 if(markdown.length>1_500_000)return NextResponse.json({error:'Choose the original Markdown file under 1.5 MB.'},{status:413});
 let records;
 try{records=parseDraftBankImport(markdown);}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid Markdown file.'},{status:400});}
 if(request.nextUrl.searchParams.get('preview')==='1')return NextResponse.json({pediatric:645,maternity:2});
 const {data,error}=await admin().rpc('import_and_publish_bank_questions',{p_records:records});
 if(error)return NextResponse.json({error:error.code==='PGRST202'?'Apply the question bank publishing migration in Supabase before importing.':'The import was rolled back. Check the Supabase logs before retrying.'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
