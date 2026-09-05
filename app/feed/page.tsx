import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '投喂',
  description: '作者偷懒中。',
};

export default function FeedPage() {
  return (
    <main className="page shell narrow">
      <header className="page-head">
        <span className="kicker">FEED THE AUTHOR</span>
        <h1>投喂</h1>
        <p>这里是阿枫摸鱼的小角落。投喂通道施工中——其实作者只是想先睡一觉。</p>
      </header>
      <figure className="feed-art">
        <svg viewBox="0 0 360 250" aria-hidden="true">
          {/* 月亮 */}
          <circle cx="185" cy="140" r="78" fill="#f2e3a8" />
          <circle cx="150" cy="112" r="10" fill="#e6d190" opacity="0.9" />
          <circle cx="216" cy="168" r="14" fill="#e6d190" opacity="0.9" />
          <circle cx="190" cy="92" r="7" fill="#e6d190" opacity="0.9" />
          {/* 睡着的小猫 */}
          <ellipse
            cx="130"
            cy="95"
            rx="52"
            ry="30"
            fill="#fff7ee"
            stroke="#e3d2bc"
            strokeWidth="2"
            transform="rotate(-10 130 95)"
          />
          <path
            d="M 175 105 q 22 4 20 -18"
            stroke="#fff7ee"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="196" cy="86" r="5" fill="#ffb469" />
          <path
            d="M 72 58 L 66 40 L 82 50 Z"
            fill="#fff7ee"
            stroke="#e3d2bc"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M 98 56 L 105 38 L 88 48 Z"
            fill="#fff7ee"
            stroke="#e3d2bc"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M 73 53 L 70 44 L 79 49 Z" fill="#ffb5c2" />
          <path d="M 97 51 L 100 42 L 92 47 Z" fill="#ffd0da" />
          <circle cx="86" cy="74" r="23" fill="#fff7ee" stroke="#e3d2bc" strokeWidth="2" />
          <path
            d="M 72 72 q 4 -4 8 0"
            stroke="#4a4038"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 90 72 q 4 -4 8 0"
            stroke="#4a4038"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="68" cy="80" r="3.4" fill="#ffb5c2" opacity="0.7" />
          <circle cx="102" cy="80" r="3.4" fill="#ffb5c2" opacity="0.7" />
          <path
            d="M 120 80 q 10 6 20 2"
            stroke="#ecd9bd"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 128 98 q 10 6 20 2"
            stroke="#ecd9bd"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Zzz */}
          <g className="feed-zzz">
            <text
              x="248"
              y="56"
              fontSize="26"
              fontWeight="700"
              fill="#b9c8ff"
              fontFamily="Georgia, serif"
              transform="rotate(12 248 56)"
            >
              Z
            </text>
            <text
              x="270"
              y="36"
              fontSize="19"
              fontWeight="700"
              fill="#b9c8ff"
              fontFamily="Georgia, serif"
              transform="rotate(8 270 36)"
            >
              z
            </text>
            <text
              x="288"
              y="22"
              fontSize="14"
              fontWeight="700"
              fill="#b9c8ff"
              fontFamily="Georgia, serif"
              transform="rotate(4 288 22)"
            >
              z
            </text>
          </g>
          {/* 星星 */}
          <path
            d="M 48 36 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 z"
            fill="#ffffff"
            opacity="0.85"
          />
          <path
            d="M 306 92 l 2.5 7 l 7 2.5 l -7 2.5 l -2.5 7 l -2.5 -7 l -7 -2.5 l 7 -2.5 z"
            fill="#ffffff"
            opacity="0.8"
          />
          <path
            d="M 38 196 l 2.5 7 l 7 2.5 l -7 2.5 l -2.5 7 l -2.5 -7 l -7 -2.5 l 7 -2.5 z"
            fill="#ffffff"
            opacity="0.7"
          />
        </svg>
        <figcaption>作者偷懒中……请勿打扰（Zzz）</figcaption>
      </figure>
      <p className="feed-note">
        想催更的话，去
        <Link href="/messages">留言板</Link>
        留言会比投喂更有用（笑）。
      </p>
    </main>
  );
}
