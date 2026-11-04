import {NextRequest,NextResponse} from 'next/server';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {admin} from '@/lib/supabase/admin';
import {validExamId} from '@/lib/exam-review-server';
import {uploadedImageType} from '@/lib/question-education.mjs';
export async function POST(request:NextRequest){
 if(!await requireNgnAdmin())return NextResponse.json({error:'Administrator access required'},{status:403});
 // Bound the upload before reading when the client supplies its length.
 if(Number(request.headers.get('content-length'))>4*1024*1024)return NextResponse.json({error:'Images must be 3 MB or smaller.'},{status:413});
 const form=await request.formData().catch(()=>null),file=form?.get('file'),id=form?.get('questionId'),kind=form?.get('kind');
 if(!(file instanceof File)||!validExamId(id)||!['question','rationale'].includes(String(kind)))return NextResponse.json({error:'Choose a question and an image.'},{status:400});
 if(!file.size||file.size>3*1024*1024)return NextResponse.json({error:'Images must be 3 MB or smaller.'},{status:413});
 const db=admin(),question=await db.from('questions').select('id').eq('id',id).maybeSingle();
 if(question.error||!question.data)return NextResponse.json({error:'Question not found'},{status:404});
 const bytes=new Uint8Array(await file.arrayBuffer()),format=uploadedImageType(bytes);
 if(!format)return NextResponse.json({error:'Use a PNG, JPEG or WebP image. SVG and other file types are not accepted.'},{status:400});
 const path=`${id}/${kind}/${crypto.randomUUID()}.${format.extension}`;
 const {error}=await db.storage.from('question-media').upload(path,bytes,{contentType:format.mime,upsert:false,cacheControl:'31536000'});
 if(error)return NextResponse.json({error:'Image upload failed. Check the private question-media bucket setup.'},{status:500});
 const {data}=await db.storage.from('question-media').createSignedUrl(path,86400);
 return NextResponse.json({reference:'storage://question-media/'+path,previewUrl:data?.signedUrl??null},{headers:{'Cache-Control':'no-store'}});
}
