import { getSession } from '@/lib/server-auth';

const noStore = { 'cache-control': 'no-store' };

export async function GET() {
  const session = await getSession();
  return session
    ? Response.json(
        {
          authenticated: true,
          csrfToken: session.csrf_token,
          expiresAt: session.expires_at,
        },
        { headers: noStore },
      )
    : Response.json({ authenticated: false }, { headers: noStore });
}
