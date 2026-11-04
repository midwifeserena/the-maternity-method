import {redirect} from 'next/navigation';
import {requireNgnAdmin} from '@/lib/ngn-admin-auth';
export default async function QuestionAdminLayout({children}:{children:React.ReactNode}){if(!await requireNgnAdmin())redirect('/dashboard');return children}
