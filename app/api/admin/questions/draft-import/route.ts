import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {parseDraftBankImport} from '@/lib/draft-bank-import.mjs';
import {parseCsvQuestionImport} from '@/lib/csv-question-import.mjs';

export async function POST(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required.'},{status:403});
 const csv=request.nextUrl.searchParams.get('format')==='csv';
 const size=Number(request.headers.get('content-length'));
 if(size>1_500_000)return NextResponse.json({error:'Choose a question file under 1.5 MB.'},{status:413});
 const input=await request.text();
 if(Buffer.byteLength(input)>1_500_000)return NextResponse.json({error:'Choose a question file under 1.5 MB.'},{status:413});
 let records;
 try{records=csv?parseCsvQuestionImport(input):parseDraftBankImport(input);}
 catch(error){return NextResponse.json({error:error instanceof Error&&error.name!=='CsvError'?error.message:'The CSV could not be read. Check its headers and quoted fields.'},{status:400});}
 if(request.nextUrl.searchParams.get('preview')==='1')return NextResponse.json(csv?{questions:records.length}:{pediatric:645,maternity:2});
 const {data,error}=await admin().rpc('import_and_publish_bank_questions',{p_records:records});
 if(error?.code==='P0001'&&csv&&error.message==='Expected the reviewed 647-question import')return NextResponse.json({error:'Run the CSV question import migration in Supabase first.'},{status:409});
 if(error)return NextResponse.json({error:error.code==='PGRST202'?'Apply the question bank publishing migration in Supabase before importing.':'The import was rolled back. Check the Supabase logs before retrying.'},{status:500});
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
