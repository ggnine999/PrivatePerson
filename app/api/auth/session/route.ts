import { getSession } from '@/lib/server-auth';
export async function GET(){const session=await getSession();return session?Response.json({authenticated:true,csrfToken:session.csrf_token,expiresAt:session.expires_at},{headers:{'cache-control':'no-store'}}):Response.json({authenticated:false},{status:401,headers:{'cache-control':'no-store'}})}
