import { notFound } from 'next/navigation';
import { getSession } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  if (!session) {
    notFound();
  }

  return children;
}
