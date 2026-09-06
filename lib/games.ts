// 游戏目录：/games 页的游戏架从这份列表自动渲染。
// 添加新游戏 = 在这里加一条；status 为 playable 时卡片可点击，
// 锚点指向页面上对应的游戏区块（<section id={id}>）。

export type GameStatus = 'playable' | 'soon';

export type GameEntry = {
  /** 锚点 id，playable 游戏的页面区块用它命名 */
  id: string;
  title: string;
  tagline: string;
  /** 卡片图标（emoji） */
  icon: string;
  /** 卡片点缀色 */
  accent: string;
  status: GameStatus;
};

export const GAME_CATALOG: GameEntry[] = [
  {
    id: 'starbeat',
    title: '星屿音击',
    tagline: '四键下落式音游，三首原创合成曲，云端排行榜',
    icon: '🎵',
    accent: '#7c9cf0',
    status: 'playable',
  },
  {
    id: 'snake',
    title: '贪吃蛇',
    tagline: '经典街机复刻，键盘触屏都能玩',
    icon: '🐍',
    accent: '#5ecfb1',
    status: 'soon',
  },
  {
    id: '2048',
    title: '2048',
    tagline: '滑动合并数字，越玩越上头',
    icon: '🔢',
    accent: '#f2b53c',
    status: 'soon',
  },
  {
    id: 'astro-blaster',
    title: '太空弹幕',
    tagline: '躲避弹幕，反击 Boss',
    icon: '🛸',
    accent: '#e08bb0',
    status: 'soon',
  },
];
