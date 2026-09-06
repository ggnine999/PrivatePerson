-- 站点内容：文章与项目入库（站主 CRUD），种子数据来自原 lib/content.ts 静态数组
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tags` text NOT NULL,
	`published_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`reading_minutes` integer NOT NULL,
	`featured` integer NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`modified_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_slug` ON `articles` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_articles_published` ON `articles` (`published_at`);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tech` text NOT NULL,
	`status` text NOT NULL,
	`website` text NOT NULL,
	`repository` text,
	`featured` integer NOT NULL,
	`mark` text NOT NULL,
	`created_at` integer NOT NULL,
	`modified_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_slug` ON `projects` (`slug`);
--> statement-breakpoint
INSERT INTO `articles` (id, slug, title, description, category, tags, published_at, updated_at, reading_minutes, featured, status, content, created_at, modified_at) VALUES (
	'seed-build-a-calm-digital-garden',
	'build-a-calm-digital-garden',
	'搭一座安静、耐用的数字花园',
	'从内容结构、阅读节奏到技术取舍，记录这个博客诞生时最重要的几个决定。',
	'创作札记',
	'["博客","设计","写作"]',
	'2026-08-18',
	'2026-08-26',
	7,
	1,
	'published',
	'## 写在开始之前

个人网站最迷人的地方，不是功能有多少，而是它能否诚实地容纳一个人的变化。

> 好的数字花园不急着长满，它先给想法留出呼吸。

## 内容先于装饰

我把文章、项目和关于页面看成三条线：文章保存思考，项目呈现行动，关于页面提供上下文。首页只负责把它们安静地连接起来。

## 技术选择

这次使用 TypeScript 与可迁移的内容模型。公开内容进入版本控制，敏感信息则永远不会以明文抵达服务器。

```ts
type Note = {
  title: string
  publishedAt: string
  tags: string[]
}
```

## 下一步

持续写作比一次性装修更重要。先让路径清楚、文字舒服，再慢慢增加真正需要的能力。',
	1787011200000,
	1787011200000
),
(
	'seed-zero-knowledge-vault-notes',
	'zero-knowledge-vault-notes',
	'零知识保险库：边界比口号重要',
	'客户端加密、会话认证和威胁模型如何各司其职，以及哪些承诺不应该轻易说出口。',
	'安全工程',
	'["Web Crypto","安全","隐私"]',
	'2026-07-09',
	'2026-07-14',
	9,
	1,
	'published',
	'## 两把不同的钥匙

登录密码回答“你是谁”，主密码回答“你能否解开数据”。把两者分开，服务器就不需要知道解密秘密。

## 每条记录独立随机参数

AES-GCM 要求 nonce 不重复。本项目为每次加密生成新的 96 位随机 IV，并用 PBKDF2 派生只存在于内存中的密钥。

## 不能被界面掩盖的限制

浏览器无法保证系统剪贴板一定被清空；XSS 仍可能读取已解锁页面中的数据；忘记主密码时，零知识模型也无法代替你恢复。

## 安全不是单点功能

真正的边界来自加密、授权、CSP、限速、无缓存策略与克制的日志共同作用。',
	1783555200000,
	1783555200000
),
(
	'seed-small-tools-long-life',
	'small-tools-long-life',
	'小工具，长寿命',
	'如何控制个人项目的复杂度，让一个周末原型有机会陪你很多年。',
	'工程实践',
	'["维护","产品思维","博客"]',
	'2025-12-21',
	'2026-01-03',
	5,
	0,
	'published',
	'## 从删除功能开始

个人项目最稀缺的资源不是算力，而是未来的注意力。每增加一个依赖、后台任务或外部服务，都在向未来借时间。

## 让数据能带走

优先选择容易导出的格式，保留清晰的数据边界，并为迁移写下最短路径。

## 写给未来的自己

README 不必宏大，但要回答：它为什么存在、怎样启动、哪里最危险。',
	1766275200000,
	1766275200000
);
--> statement-breakpoint
INSERT INTO `projects` (id, slug, name, description, category, tech, status, website, repository, featured, mark, created_at, modified_at) VALUES
	(
	'seed-luna-focus',
	'luna-focus',
	'Luna Focus（虚构演示）',
	'把番茄钟与每日复盘放在同一个安静界面里。',
	'效率工具',
	'["React","PWA"]',
	'开发中',
	'https://example.com/luna-focus',
	'https://github.com/example/luna-focus',
	1,
	'月',
	1766275200000,
	1766275200000
	),
	(
	'seed-hanabi-api',
	'hanabi-api',
	'Hanabi API（虚构演示）',
	'面向独立开发者的轻量通知编排服务。',
	'开发者工具',
	'["TypeScript","Workers"]',
	'维护中',
	'https://example.com/hanabi-api',
	'https://github.com/example/hanabi-api',
	1,
	'火',
	1766275200000,
	1766275200000
	),
	(
	'seed-mist-gallery',
	'mist-gallery',
	'Mist Gallery（虚构演示）',
	'为插画习作准备的本地优先归档工具。',
	'创作工具',
	'["Vite","IndexedDB"]',
	'概念验证',
	'https://example.com/mist-gallery',
	NULL,
	0,
	'雾',
	1766275200000,
	1766275200000
	);
