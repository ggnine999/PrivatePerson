import { notFound } from 'next/navigation';
import { isAdminPermission } from '@/lib/account-permission';
import { getCommunitySessionUser } from '@/lib/community-auth';

export const dynamic = 'force-dynamic';

export default async function VaultLoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCommunitySessionUser();
  if (!user || !isAdminPermission(user.permission)) notFound();
  return children;
}
