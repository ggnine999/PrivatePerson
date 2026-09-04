import Link from 'next/link';
export default function NotFound(){return <main className="not-found shell"><span>404</span><h1>这颗星暂时没有坐标</h1><p>页面可能被移动，或者从未存在过。</p><Link className="button primary" href="/">回到首页</Link></main>}
