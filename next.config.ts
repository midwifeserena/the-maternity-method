import type {NextConfig} from 'next';
const nextConfig:NextConfig={
 // Include private PDF assets in the Vercel function that serves signed-in students.
 outputFileTracingIncludes:{'/api/study-guides/*':['./content/study-guides/**/*.pdf']}
};
export default nextConfig;
