import type { Metadata } from 'next';
import { photos } from '@/lib/content';
import { PhotoGallery } from '@/components/photo-gallery';
export const metadata: Metadata = { title: '相册', description: '插画、壁纸与随手收藏的图像小站。' };
export default function PhotosPage(){return <main className="page shell"><header className="page-head"><span className="kicker">GALLERY</span><h1>相册</h1><p>收录喜欢的插画与壁纸——数量不多，都是愿意反复看的。点击任意一张可以看大图。</p></header><PhotoGallery items={photos}/></main>}
