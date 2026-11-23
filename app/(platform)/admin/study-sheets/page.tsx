import {notFound} from 'next/navigation';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
import {StudyGuideUploadForm} from '@/components/study-guide-upload-form';

export default async function AdminStudySheets(){
 if(!await requireNgnAdmin())notFound();
 return <div className="space-y-6">
  <header className="mauve-page-header">
   <h1 className="text-4xl">Upload course study sheets</h1>
   <p className="mt-3">Upload the prepared ZIPs one at a time. The PDFs are stored in the private course library.</p>
  </header>
  <StudyGuideUploadForm/>
 </div>;
}
