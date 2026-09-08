import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/server-auth', () => ({ getSession: mocks.getSession }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));

import StudioLayout from '@/app/studio/layout';

describe('studio server access boundary', () => {
  it('returns not found before rendering private navigation to a visitor', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(StudioLayout({ children: 'private studio' })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it('renders for an authenticated owner', async () => {
    mocks.getSession.mockResolvedValue({ token_hash: 'session' });
    await expect(StudioLayout({ children: 'private studio' })).resolves.toBe(
      'private studio',
    );
  });
});
