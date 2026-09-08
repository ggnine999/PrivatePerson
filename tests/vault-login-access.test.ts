import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCommunitySessionUser: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/community-auth', () => ({
  getCommunitySessionUser: mocks.getCommunitySessionUser,
}));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));

import VaultLoginLayout from '@/app/vault/login/layout';

describe('vault login permission boundary', () => {
  it('hides the entry from visitors', async () => {
    mocks.getCommunitySessionUser.mockResolvedValue(null);
    await expect(VaultLoginLayout({ children: 'private login' })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('hides the entry from permission zero community accounts', async () => {
    mocks.getCommunitySessionUser.mockResolvedValue({ permission: 0 });
    await expect(VaultLoginLayout({ children: 'private login' })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('renders the entry for a permission one administrator', async () => {
    mocks.getCommunitySessionUser.mockResolvedValue({ permission: 1 });
    await expect(VaultLoginLayout({ children: 'private login' })).resolves.toBe(
      'private login',
    );
  });
});
