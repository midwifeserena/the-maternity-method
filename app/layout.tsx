import type {Metadata} from 'next';
import {Inter,Playfair_Display} from 'next/font/google';
import './globals.css';
const inter=Inter({subsets:['latin'],variable:'--font-inter'});
const playfair=Playfair_Display({subsets:['latin'],variable:'--font-playfair'});
export const metadata:Metadata={title:'The Maternity Method | Maternity Made Clear',description:'Beautifully focused maternity nursing and NCLEX preparation.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body className={`${inter.variable} ${playfair.variable}`}>{children}</body></html>}
