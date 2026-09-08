import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: '投喂',
  description: '通过微信赞赏码支持作者。',
};

export default function FeedPage() {
  return (
    <main className="page shell narrow">
      <header className="page-head">
        <span className="kicker">FEED THE AUTHOR</span>
        <h1>投喂</h1>
        <p>感谢你的喜欢与支持。可以使用微信扫描下方赞赏码，量力而行，心意本身就很珍贵。</p>
      </header>
      <figure className="feed-art">
        <Image
          className="feed-reward-code"
          src="/images/wechat-reward-code.jpg"
          alt="陈handsome 的微信赞赏码"
          width={1210}
          height={1210}
          priority
          sizes="(max-width: 640px) calc(100vw - 3rem), 720px"
        />
        <figcaption>饿饿</figcaption>
      </figure>
    </main>
  );
}
