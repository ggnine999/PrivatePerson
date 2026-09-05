export type MusicLyric = {
  /** 相对音轨开头的秒数 */
  time: number;
  text: string;
};

export type MusicTrack = {
  title: string;
  artist: string;
  src: string;
  /** 无歌词音轨可省略，播放器会自动隐藏歌词面板 */
  lyrics?: MusicLyric[];
};

const DAILY_RECOMMENDATION_QUERIES = [
  '治愈 轻音乐',
  '华语 慢歌',
  '日系 清新',
  '爵士 午后',
  '民谣 夜晚',
  '钢琴 纯音乐',
  'Lo-fi 学习',
] as const;

export function getDailyRecommendationQuery(date = new Date()) {
  const chinaDay = Math.floor(
    (date.getTime() + 8 * 60 * 60 * 1000) / 86_400_000,
  );
  return DAILY_RECOMMENDATION_QUERIES[
    chinaDay % DAILY_RECOMMENDATION_QUERIES.length
  ];
}

export function getWrappedQueueIndex(
  queueLength: number,
  currentIndex: number,
  step = 1,
) {
  if (!Number.isInteger(queueLength) || queueLength <= 0) return -1;
  const normalizedCurrent =
    Number.isInteger(currentIndex) &&
    currentIndex >= 0 &&
    currentIndex < queueLength
      ? currentIndex
      : 0;
  return (
    (((normalizedCurrent + step) % queueLength) + queueLength) % queueLength
  );
}

// 站内曲库：作为空队列时的安全降级来源，也可由访客按需加入听歌队列。
// 演示音轨每 6 秒一个乐句，歌词时间轴与 scripts/generate-demo-audio.mjs 的旋律结构对齐。
export const tracks: MusicTrack[] = [
  {
    title: '晴空慢游',
    artist: '本地合成 · 慢板',
    src: '/audio/starlight-demo.wav',
    lyrics: [
      { time: 0, text: '云把风声放得很轻' },
      { time: 6, text: '阳光落进草浪之间' },
      { time: 12, text: '我们慢下来，听时间走拍' },
      { time: 18, text: '铃音摇碎一整片蓝天' },
      { time: 24, text: '步伐追着微光的形状' },
      { time: 30, text: '把心事摊开，晾成晴天' },
      { time: 36, text: '远方有座安静的岛' },
      { time: 42, text: '梦，停靠在晴空那边' },
    ],
  },
  {
    title: '星屿夜行',
    artist: '本地合成 · 夜色',
    src: '/audio/starlit-night.wav',
    lyrics: [
      { time: 0, text: '路灯把影子拉得很长' },
      { time: 6, text: '晚风翻着白天的心事' },
      { time: 12, text: '星光在楼顶慢慢集合' },
      { time: 18, text: '夜色温柔得像一句晚安' },
      { time: 24, text: '我们绕过喧闹的街角' },
      { time: 30, text: '把今天轻轻放进梦里' },
    ],
  },
  {
    title: '微光散步',
    artist: '本地合成 · 轻快',
    src: '/audio/glimmer-stroll.wav',
    lyrics: [
      { time: 0, text: '清晨把窗帘掀开一角' },
      { time: 6, text: '微光排着队跳上桌' },
      { time: 12, text: '旧杯子冒着热的白气' },
      { time: 18, text: '我们散步到街心花园' },
      { time: 24, text: '蒲公英替我说了再见' },
      { time: 30, text: '脚步轻轻，日子慢慢' },
    ],
  },
  {
    title: '午后电台',
    artist: '本地合成 · 温暖',
    src: '/audio/afternoon-radio.wav',
    lyrics: [
      { time: 0, text: '午后的频率刚刚好' },
      { time: 6, text: '旧歌单转到第三十首' },
      { time: 12, text: '阳光在地板打了个盹' },
      { time: 18, text: '电台主持人换了话题' },
      { time: 24, text: '我们分享一副耳机' },
      { time: 30, text: '把下午留在这一侧' },
    ],
  },
];
