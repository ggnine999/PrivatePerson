import type { MetadataRoute } from 'next';
import { listPublishedArticleMetas } from '@/lib/site-content';
export const dynamic = 'force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000';const pages:MetadataRoute.Sitemap=['','/articles','/archive','/projects','/moments','/circle','/games','/anime','/photos','/collect','/feed','/about'].map(path=>({url:`${base}${path}`,lastModified:new Date(),changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:.7}));const articles=await listPublishedArticleMetas(200);return pages.concat(articles.map(article=>({url:`${base}/articles/${article.slug}`,lastModified:new Date(article.updatedAt),changeFrequency:'monthly' as const,priority:.8})))}
