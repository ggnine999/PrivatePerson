import { describe, expect, it } from 'vitest';
import {
  ADMIN_PERMISSION,
  COMMUNITY_PERMISSION,
  isAdminPermission,
} from '@/lib/account-permission';

describe('account permission policy', () => {
  it('uses zero for ordinary registrations and one for administrators', () => {
    expect(COMMUNITY_PERMISSION).toBe(0);
    expect(ADMIN_PERMISSION).toBe(1);
  });

  it('grants administration only to the exact numeric value one', () => {
    expect(isAdminPermission(1)).toBe(true);
    expect(isAdminPermission(0)).toBe(false);
    expect(isAdminPermission('1')).toBe(false);
    expect(isAdminPermission(2)).toBe(false);
    expect(isAdminPermission(null)).toBe(false);
  });
});
