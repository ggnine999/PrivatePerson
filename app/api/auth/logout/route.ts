import { destroySession, requireApiSession } from '@/lib/server-auth';
export async function POST(request:Request){if(!await requireApiSession(request,true))return Response.json({error:'未授权'},{status:401});await destroySession();return Response.json({ok:true},{headers:{'cache-control':'no-store'}})}
