'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const FALLBACK = {
  text: '愿每一次认真记录，都成为照亮来路的小小星光。',
  from: '星屿手记',
};

export function Hitokoto() {
  const [quote, setQuote] = useState(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [remoteAllowed, setRemoteAllowed] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        'https://v1.hitokoto.cn/?c=i&c=k&encode=json',
        { signal: controller.signal },
      );
      clearTimeout(timer);
      if (!response.ok) throw new Error('hitokoto failed');
      const data = (await response.json()) as {
        hitokoto?: string;
        from?: string;
        from_who?: string;
      };
      if (data.hitokoto) {
        setQuote({
          text: data.hitokoto,
          from: data.from_who || data.from || '一言',
        });
      }
    } catch {
      setQuote(FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (location.pathname.startsWith('/vault')) return;
    const timer = setTimeout(() => {
      setRemoteAllowed(true);
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="hitokoto">
      {remoteAllowed && (
        <button
          type="button"
          className="hitokoto-refresh"
          onClick={() => void load()}
          aria-label="换一句一言"
          disabled={loading}
        >
          <RefreshCw aria-hidden="true" />
        </button>
      )}
      <p>
        「{quote.text}」<span className="hitokoto-from">—— {quote.from}</span>
      </p>
    </div>
  );
}
