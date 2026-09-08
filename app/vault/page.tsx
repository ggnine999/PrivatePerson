import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VaultApp } from '@/components/vault-app';
import { getSession } from '@/lib/server-auth';

export const metadata: Metadata = {
  title: '私人保险库',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

export default async function VaultPage() {
  if (!(await getSession())) notFound();
  return <VaultApp />;
}
