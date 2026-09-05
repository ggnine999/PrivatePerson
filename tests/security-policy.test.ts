import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, isPrivatePath } from '@/lib/security-policy';

describe('route security policy', () => {
  it('isolates only vault and auth APIs as private routes', () => {
    expect(isPrivatePath('/vault')).toBe(true);
    expect(isPrivatePath('/vault/login')).toBe(true);
    expect(isPrivatePath('/api/auth/session')).toBe(true);
    expect(isPrivatePath('/api/vault/records')).toBe(true);
    expect(isPrivatePath('/api/netease-search')).toBe(false);
    expect(isPrivatePath('/api/netease-playback')).toBe(false);
    expect(isPrivatePath('/articles')).toBe(false);
  });

  it('does not allow third-party script execution on any route', () => {
    expect(contentSecurityPolicy(false)).not.toContain('giscus.app');
    expect(contentSecurityPolicy(true)).not.toContain('giscus.app');
    expect(contentSecurityPolicy(false)).toContain(
      "media-src 'self' https://*.music.126.net",
    );
    expect(contentSecurityPolicy(false)).toContain("frame-src 'self'");
  });

  it('removes all third-party connections and frames from private routes', () => {
    const policy = contentSecurityPolicy(true);
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("frame-src 'self'");
    expect(policy).not.toContain('hitokoto.cn');
    expect(policy).not.toContain('music.163.com');
    expect(policy).not.toContain('music.126.net');
  });
});
