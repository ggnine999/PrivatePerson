# 星屿手记

完整、响应式的二次元风格个人博客，同时包含公开文章、项目档案与单用户零知识私人保险库。项目基于 TypeScript、React 19、Vinext、Cloudflare D1 与 Web Crypto API，当前仅在本地构建和验证，**没有发布到公网**。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run db:migrate:local
npm run dev
```

打开 `http://localhost:3000`。首次本地演示可以使用明确的虚构测试登录：

- 所有者账号：`demo-owner`
- 登录密码：`Sakura-Demo-2026!`
- 主密码：首次进入保险库时自行创建；本次验证使用 `Demo-Master-Password-2026!`

测试登录只在非生产模式且没有配置正式凭据时启用。生产环境不会接受这组凭据。

## 常用命令

```bash
npm run dev
npm run db:generate
npm run db:migrate:local
npm run auth:hash -- "至少 12 位的登录密码"
npm run lint
npm run typecheck
npm test
npm run build
```

Windows 上当前 Node 运行时的 `os.userInfo()` 会返回 ENOMEM，因此 `db:generate` 使用一个只影响该命令的轻量启动 shim；它不进入站点运行时。

## 内容管理

- 文章与 Markdown 正文：`lib/content.ts` 中的 `articles`
- 项目：`lib/content.ts` 中的 `projects`
- 个人介绍与社交链接：`app/about/page.tsx`
- 视觉令牌和响应式样式：`app/globals.css`
- 文章内示例插画：`public/images/night-editorial.png`
- 首页音乐播放器组件：`components/music-player.tsx`；曲库（多音轨 + 歌词）：`lib/music.ts`

### 第二版背景素材

- 固定背景：`public/images/saber-meadow-v2.avif`，不支持 AVIF 时回退到 `public/images/saber-meadow-v2.webp`；两者均为 1920×1080。
- 可编辑源图：`public/images/saber-meadow-v2.png`。这是根据用户提供的 Wallpaper Engine 预览图扩展生成的 16:9 静态版本。
- 样式使用蓝白渐变暗幕、玻璃面板、独立深浅主题和移动端焦点；当前没有启用动态视频，因此移动端和 `prefers-reduced-motion` 用户天然使用静态背景。
- 原 Wallpaper Engine 目录只提供专用 `scene.pkg`，没有可直接用于浏览器的视频文件；如后续获得明确授权的源视频，应转码为静音 WebM/MP4，并继续保留当前 AVIF/WebP 降级。
- 素材目录没有附带可确认的网站再分发许可证。公开部署前必须由站点所有者确认原素材及衍生背景的使用授权。

### 首页音乐播放器

- 组件为 `components/music-player.tsx`，曲库集中配置在 `lib/music.ts` 的 `tracks` 数组（标题、作者、`src`、可选 `lyrics`）。
- 当前曲库为 4 首本地合成演示曲（48 秒 + 36 秒 × 3），由 `npm run audio:generate`（`scripts/generate-demo-audio.mjs`）生成；脚本先写临时文件再原子替换，dev server 运行中也可重跑，但被播放中的那一首可能被占用而跳过（停止播放后重跑即可）。
- 播放器右上角的歌曲列表按钮可打开搜索面板：按歌名或歌手即时过滤，点击曲目即切换并自动续播；当前曲目以主题色高亮。新增歌曲只需把音频文件放入 `public/audio/` 并在 `tracks` 数组加一条记录。
- 歌词同样配置在 `lyrics`（每句 `time` 秒数 + `text` 文本），播放器高亮当前句（淡色变深色）并自动滚动居中；用户滚动歌词时暂停自动滚动 5 秒。无歌词音轨省略 `lyrics` 字段即可，面板自动隐藏。
- 行为：不自动播放（换曲续播除外）、循环播放、仅播放时旋转唱片；`prefers-reduced-motion` 下禁用旋转和平滑滚动。加载失败会在播放器内提示，恢复后自动清除。

示例文章和项目均为虚构演示内容。新增文章时填写 slug、标题、摘要、分类、标签、发布日期、更新日期、阅读时长与 Markdown 正文即可；文章详情会自动生成目录、上下篇与相关文章。

## 已实现功能

- 首页：简介、精选文章、最新文章入口、精选项目、音乐播放器
- 文章：列表、全文搜索、分类、标签、Markdown、代码高亮、目录、阅读时长、日期、归档、上下篇、相关文章
- 项目：集中配置、分类/技术/状态/精选、网站与仓库安全外链
- 关于：介绍、经历、技能、兴趣和可替换联系方式
- 阅读体验：响应式、深浅主题、中文排版、图片预览、返回顶部、404、跳转主内容、键盘可访问控件、减少动画偏好
- SEO：Metadata、Open Graph 文本信息、`sitemap.xml`、`robots.txt`、`rss.xml`
- 保险库：登录/退出、初始化/解锁/锁定、5 分钟自动锁定、搜索、筛选、收藏、密码生成、再次认证后查看/复制、编辑、删除、API Key 到期/轮换字段、加密备份与恢复
- 安全：客户端加密、独立随机 IV、D1 只存密文、服务端会话、CSRF、登录限速、可选 TOTP、CSP、安全响应头、私人路由 no-store/noindex

## 安全设计与威胁模型

### 安全边界

登录密码与主密码是两套独立秘密：

1. 登录密码在服务端验证，用来确认单一所有者身份。生产环境保存的是 PBKDF2-SHA-256 哈希（600,000 次迭代），不是明文。
2. 主密码只进入浏览器 Web Crypto API，不发送到服务器，不写入 localStorage、cookie、数据库或日志。
3. 浏览器以 PBKDF2-SHA-256（600,000 次迭代、随机 128 位盐）派生不可导出的 AES-256-GCM 密钥。
4. 每次保存或编辑记录都生成新的 96 位随机 IV。用户名、密码、API Key、Secret、权限范围和备注位于加密 JSON 中。
5. 服务端只保存密文、IV，以及搜索/提醒所需的低敏元数据（平台、记录名、分类、标签、环境、日期、收藏和 Key 末四位）。

认证会话使用随机令牌；数据库只保存令牌 SHA-256 摘要。Cookie 为 HttpOnly、SameSite=Strict，生产环境加 Secure；写操作同时校验随机 CSRF token。每个客户端 15 分钟最多 5 次失败登录。设置 `OWNER_TOTP_SECRET` 后会强制校验 RFC 6238 六位 TOTP。

### 能防住什么

- 数据库、备份或普通网络响应泄露时，攻击者不能直接得到敏感明文。
- 未登录请求无法读取或修改保险库接口。
- CSRF、常见点击劫持、搜索引擎抓取、缓存残留和基础暴力登录受到约束。
- Markdown 内容来自受信任的本地源码；原始 HTML 会转义，降低文章内容带来的 XSS 风险。

### 不能防住什么

- 站点脚本、浏览器扩展或设备在保险库解锁期间被攻陷时，内存中的明文仍可能被读取。
- 浏览器不保证网页一定能读取或清空系统剪贴板；实现只在复制 30 秒后、且内容仍相同时尽力清空。
- 忘记主密码后无法恢复数据。零知识模型没有后门；请保存离线恢复材料。
- 当前没有硬件安全密钥/WebAuthn。第一版真实实现了可配置 TOTP，没有展示虚假的“已启用”状态。
- CSP 因 React/Vinext 当前运行模式保留了内联脚本/样式许可；生产部署前应基于最终平台切换到 nonce/hash CSP。
- Vinext 1.0.0-beta.9 的开发服务器会对其内部预取 shim 输出一条 RSC 依赖优化建议；生产构建、类型检查与浏览器流程均正常，后续升级 Vinext/RSC 插件时应复核并移除对应兼容配置。

### 加密备份与恢复

“导出密文备份”下载 profile 与记录密文，不包含主密码或明文。恢复时浏览器先用当前内存密钥逐条验证 AES-GCM 完整性，再发送密文；损坏或主密码不匹配的文件会被拒绝。建议把密文备份、主密码恢复材料与 TOTP 恢复码分开离线保存。

## 环境变量

复制 `.env.example` 为本地私有配置（`.env*` 已被 gitignore）：

- `NEXT_PUBLIC_SITE_URL`：公开站点可信源
- `OWNER_LOGIN`：生产所有者账号
- `OWNER_PASSWORD_HASH`：通过 `npm run auth:hash` 生成
- `OWNER_TOTP_SECRET`：可选 Base32 TOTP 秘钥；设置后登录强制 2FA
- `SESSION_TTL_MINUTES`：服务端登录会话时长

服务端秘密不得使用 `NEXT_PUBLIC_` 前缀，也不要提交 `.env`。

## 数据库与迁移

D1 schema 在 `db/schema.ts`，生成的不可变迁移在 `drizzle/`。本地状态保存在忽略提交的 `.wrangler/state/`。

```bash
npm run db:generate
npm run db:migrate:local
```

生产部署时先创建 D1，替换 `wrangler.jsonc` 或托管平台注入的数据库 ID，然后按顺序应用迁移。不要在运行时自动建表，也不要修改已应用迁移。

## 生产部署前

最低限度需要站点所有者提供：

1. 公开域名或正式 origin；
2. D1/兼容数据库的部署项目与权限；
3. 正式 `OWNER_LOGIN` 和本地生成的 `OWNER_PASSWORD_HASH`；
4. 如启用 2FA，身份验证器生成的 Base32 TOTP secret；
5. 部署平台的 Secret 写入权限。

建议把 `/vault` 放到独立子域名（例如 `vault.example.com`），通过反向代理只暴露 `/vault` 与 `/api/vault`、`/api/auth`，并对该子域名追加访问控制、HSTS、独立 CSP 与备份策略。公开博客与保险库已在路由、API 和数据表层面分离，但当前仍共享一个构建产物。

## 验证记录

本次交付实际执行并通过：

- `npm run lint`
- `npm run typecheck`
- `npm test`：2 个测试文件、4 个测试全部通过；覆盖密码哈希验证、常量形态比较、AES-GCM 往返、唯一 IV、错误主密码拒绝
- `npm run build`
- 本地 D1 迁移：3 个迁移全部成功
- 浏览器：桌面/移动首页、深浅主题、固定背景焦点与玻璃面板、文章搜索、归档、文章详情/目录/图片预览、项目安全外链
- 首页音乐播放器：播放/暂停、点击与键盘拖动进度、音量、静音、循环与总时长显示；与介绍卡片同宽同高的对称双卡片布局，1440×900 与 390×844、深浅主题验证通过；`audio:generate` 原子重新生成音轨正常
- 保险库：登录、初始化、刷新与无操作自动锁定、解锁、账号与 API Key 新增/查看/复制/编辑、删除确认、删除接口、退出/未授权 API
- WebMCP：`lock_vault` 工具注册、有效调用和无效参数拒绝均已在浏览器中验证
- 数据库查询：测试密码、邮箱和 API Key 未出现在 `ciphertext` 中；每条记录 IV 长度与密文长度正常
- 私人响应头：`Cache-Control: no-store`、`X-Robots-Tag: noindex`、CSP、X-Frame-Options、nosniff

初始联网审计发现 Vinext 图片解析、React Server Components、Vite 与 Undici 的 high 级公告。已升级到 React 19.2.8、Vinext 1.0.0-beta.9、Vite 8.2.2、RSC 插件 0.5.34，并通过 overrides 统一使用 Undici 7.29.0；随后 `npm audit --omit=dev --offline` 基于已缓存公告返回 0 vulnerabilities。上线 CI 仍应重新执行在线审计。
