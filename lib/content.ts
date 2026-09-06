// 文章与项目已迁入 D1 数据库（见 drizzle/0009_site_content.sql 种子与 lib/site-content.ts 数据层），
// 由站主在 /studio 增删改查；此处仅保留追番 / 相册 / 收藏 / 首页轮播等静态特色数据。


// ===== P2 特色内容页静态数据（追番 / 相册 / 收藏）=====
export type AnimeEntry = {
  title: string;
  status: '在看' | '看完' | '想看';
  year: string;
  stars: number;
  progress: string;
  comment: string;
};
export const animeList: AnimeEntry[] = [
  { title: '葬送的芙莉莲', status: '在看', year: '2023', stars: 5, progress: '第二季追至最新', comment: '关于时间与告别的魔法叙事，看一集少一集。' },
  { title: '孤独摇滚', status: '在看', year: '2022', stars: 5, progress: '重刷中', comment: '社恐人的摇滚狂想，波奇酱天下第一。' },
  { title: 'CLANNAD ~AFTER STORY~', status: '看完', year: '2008', stars: 5, progress: '全集补完', comment: '写家族与成长的天花板，看到后面哭到不行。' },
  { title: '四月是你的谎言', status: '看完', year: '2014', stars: 5, progress: '全集补完', comment: '春天，马上就要来了。' },
  { title: '夏日重现', status: '看完', year: '2022', stars: 4, progress: '全集补完', comment: '时间回溯 × 海岛悬疑，节奏稳到可怕。' },
  { title: '紫罗兰永恒花园', status: '想看', year: '2018', stars: 0, progress: '列入计划', comment: '京阿尼的画面口碑太盛，留一次完整的观看。' },
  { title: '轻音少女', status: '想看', year: '2009', stars: 0, progress: '列入计划', comment: '据说是最治愈的社团日常。' },
  { title: '魔法少女小圆', status: '想看', year: '2011', stars: 0, progress: '列入计划', comment: '虚渊玄的剧本，做好心理准备再看。' },
  { title: '凉宫春日的忧郁', status: '想看', year: '2006', stars: 0, progress: '列入计划', comment: '入宅老宅的必修课，补课计划第一位。' },
];

export type PhotoEntry = { src: string; title: string; date: string; note: string };
export const photos: PhotoEntry[] = [
  { src: '/images/cover-miku-ocean.jpg', title: '海面之歌', date: '2026-08', note: '初音·白裙与海，首页封面原画。' },
  { src: '/images/night-editorial.png', title: '夜樱窗边', date: '2026-07', note: '深夜写作场景插画，文章页封面。' },
  { src: '/images/saber-meadow-v2.webp', title: '草原之风', date: '2026-06', note: '全站壁纸：Saber 与风车草原。' },
];

export type CollectEntry = { name: string; url: string; description: string; group: string };
export const collectLinks: CollectEntry[] = [
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', description: 'Web 标准的一手手册，查 API 语义首选。', group: '开发常备' },
  { name: 'Can I Use', url: 'https://caniuse.com/', description: '浏览器兼容性查询，新特性上线前先看一眼。', group: '开发常备' },
  { name: 'GitHub', url: 'https://github.com/', description: '代码与项目的家，本站源码也在上面。', group: '开发常备' },
  { name: 'Cloudflare Developers', url: 'https://developers.cloudflare.com/', description: 'Workers / D1 的文档，本站后端的地基。', group: '开发常备' },
  { name: 'Bangumi', url: 'https://bgm.tv/', description: '番剧条目与评分维基，追番记录的家。', group: '二次元补给' },
  { name: '萌娘百科', url: 'https://zh.moegirl.org.cn/', description: '万物皆可考据的二次元百科。', group: '二次元补给' },
  { name: 'Saraba1st', url: 'https://bbs.saraba1st.com/2b/', description: 'Stage1 论坛，动画讨论深度最高的社区之一。', group: '二次元补给' },
  { name: '少数派', url: 'https://sspai.com/', description: '效率工具与数字生活方式的读物。', group: '灵感补给' },
  { name: 'CSS-Tricks', url: 'https://css-tricks.com/', description: 'CSS 技巧与布局灵感的老牌博客。', group: '灵感补给' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/', description: '看看独立开发者们最近在发布什么。', group: '灵感补给' },
];

// 首页封面轮播（tone 决定该图上标题用深色还是白色文字）
export type HeroSlide = { src: string; alt: string; tone: 'light' | 'dark' };
export const heroSlides: HeroSlide[] = [
  { src: '/images/cover-miku-ocean.jpg', alt: '初音 · 白裙与海', tone: 'light' },
  { src: '/images/hero/blue-sky-gaze.jpg', alt: '蓝发少女与晴空', tone: 'light' },
  { src: '/images/hero/violet-water.jpg', alt: '薇尔莉特 · 水边拾信', tone: 'light' },
  { src: '/images/hero/miku-graffiti.jpg', alt: '初音 · 涂鸦墙', tone: 'dark' },
  { src: '/images/hero/akari-night-city.jpg', alt: '红发和服少女 · 夜城', tone: 'dark' },
];
