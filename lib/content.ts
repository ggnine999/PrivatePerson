export type Article = { slug: string; title: string; description: string; category: string; tags: string[]; publishedAt: string; updatedAt: string; readingMinutes: number; featured: boolean; content: string };
export const articles: Article[] = [
  { slug: 'build-a-calm-digital-garden', title: '搭一座安静、耐用的数字花园', description: '从内容结构、阅读节奏到技术取舍，记录这个博客诞生时最重要的几个决定。', category: '创作札记', tags: ['博客', '设计', '写作'], publishedAt: '2026-08-18', updatedAt: '2026-08-26', readingMinutes: 7, featured: true, content: `## 写在开始之前\n\n个人网站最迷人的地方，不是功能有多少，而是它能否诚实地容纳一个人的变化。\n\n> 好的数字花园不急着长满，它先给想法留出呼吸。\n\n## 内容先于装饰\n\n我把文章、项目和关于页面看成三条线：文章保存思考，项目呈现行动，关于页面提供上下文。首页只负责把它们安静地连接起来。\n\n## 技术选择\n\n这次使用 TypeScript 与可迁移的内容模型。公开内容进入版本控制，敏感信息则永远不会以明文抵达服务器。\n\n\`\`\`ts\ntype Note = {\n  title: string\n  publishedAt: string\n  tags: string[]\n}\n\`\`\`\n\n## 下一步\n\n持续写作比一次性装修更重要。先让路径清楚、文字舒服，再慢慢增加真正需要的能力。` },
  { slug: 'zero-knowledge-vault-notes', title: '零知识保险库：边界比口号重要', description: '客户端加密、会话认证和威胁模型如何各司其职，以及哪些承诺不应该轻易说出口。', category: '安全工程', tags: ['Web Crypto', '安全', '隐私'], publishedAt: '2026-07-09', updatedAt: '2026-07-14', readingMinutes: 9, featured: true, content: `## 两把不同的钥匙\n\n登录密码回答“你是谁”，主密码回答“你能否解开数据”。把两者分开，服务器就不需要知道解密秘密。\n\n## 每条记录独立随机参数\n\nAES-GCM 要求 nonce 不重复。本项目为每次加密生成新的 96 位随机 IV，并用 PBKDF2 派生只存在于内存中的密钥。\n\n## 不能被界面掩盖的限制\n\n浏览器无法保证系统剪贴板一定被清空；XSS 仍可能读取已解锁页面中的数据；忘记主密码时，零知识模型也无法代替你恢复。\n\n## 安全不是单点功能\n\n真正的边界来自加密、授权、CSP、限速、无缓存策略与克制的日志共同作用。` },
  { slug: 'small-tools-long-life', title: '小工具，长寿命', description: '如何控制个人项目的复杂度，让一个周末原型有机会陪你很多年。', category: '工程实践', tags: ['维护', '产品思维', '博客'], publishedAt: '2025-12-21', updatedAt: '2026-01-03', readingMinutes: 5, featured: false, content: `## 从删除功能开始\n\n个人项目最稀缺的资源不是算力，而是未来的注意力。每增加一个依赖、后台任务或外部服务，都在向未来借时间。\n\n## 让数据能带走\n\n优先选择容易导出的格式，保留清晰的数据边界，并为迁移写下最短路径。\n\n## 写给未来的自己\n\nREADME 不必宏大，但要回答：它为什么存在、怎样启动、哪里最危险。` },
];
export type Project = { slug: string; name: string; description: string; category: string; tech: string[]; status: string; website: string; repository?: string; featured: boolean; mark: string };
export const projects: Project[] = [
  { slug: 'luna-focus', name: 'Luna Focus（虚构演示）', description: '把番茄钟与每日复盘放在同一个安静界面里。', category: '效率工具', tech: ['React', 'PWA'], status: '开发中', website: 'https://example.com/luna-focus', repository: 'https://github.com/example/luna-focus', featured: true, mark: '月' },
  { slug: 'hanabi-api', name: 'Hanabi API（虚构演示）', description: '面向独立开发者的轻量通知编排服务。', category: '开发者工具', tech: ['TypeScript', 'Workers'], status: '维护中', website: 'https://example.com/hanabi-api', repository: 'https://github.com/example/hanabi-api', featured: true, mark: '火' },
  { slug: 'mist-gallery', name: 'Mist Gallery（虚构演示）', description: '为插画习作准备的本地优先归档工具。', category: '创作工具', tech: ['Vite', 'IndexedDB'], status: '概念验证', website: 'https://example.com/mist-gallery', featured: false, mark: '雾' },
];

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
