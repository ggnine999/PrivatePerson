import { loginSchema } from '@/lib/vault-schemas';
import {
  clearLoginAttempts,
  clientKey,
  createSession,
  reserveLoginAttempt,
  validateOwner,
} from '@/lib/server-auth';

const noStore = { 'cache-control': 'no-store' };

export async function POST(request: Request) {
  try {
    const key = await clientKey();
    if (!(await reserveLoginAttempt(key))) {
      return Response.json(
        { error: '尝试次数过多，请 15 分钟后再试。' },
        { status: 429, headers: noStore },
      );
    }

    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: '登录信息不完整。' },
        { status: 400, headers: noStore },
      );
    }

    const admin = await validateOwner(
      parsed.data.username,
      parsed.data.password,
      parsed.data.otp || undefined,
    );
    if (!admin) {
      return Response.json(
        { error: '账号、密码或验证码不正确。' },
        { status: 401, headers: noStore },
      );
    }

    await clearLoginAttempts(key);
    const csrfToken = await createSession(admin.id);
    return Response.json({ ok: true, csrfToken }, { headers: noStore });
  } catch {
    return Response.json(
      { error: '登录暂时不可用。' },
      { status: 500, headers: noStore },
    );
  }
}
