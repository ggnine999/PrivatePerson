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

export const homeTrack: MusicTrack = {
  title: '晴空慢游',
  artist: '本地合成演示音轨',
  src: '/audio/starlight-demo.wav',
  // 演示音轨每 6 秒一个乐句，共 8 句，时间轴与旋律结构对齐
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
};
