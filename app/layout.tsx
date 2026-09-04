import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { BackToTop } from '@/components/back-to-top';
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), title: { default: '星屿手记', template: '%s · 星屿手记' }, description: '记录工程实践、创作札记与个人项目的安静角落。', openGraph: { title: '星屿手记', description: '把代码、生活与微小的灵感写进夜色。', type: 'website', locale: 'zh_CN' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN" suppressHydrationWarning><body><a className="skip-link" href="#main-content">跳到主要内容</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /><BackToTop /></body></html> }
