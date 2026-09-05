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
- 可编辑源图：`assets/source/saber-meadow-v2.png`。这是根据用户提供的 Wallpaper Engine 预览图扩展生成的 16:9 静态版本。
- 样式使用蓝白渐变暗幕、玻璃面板、独立深浅主题和移动端焦点；当前没有启用动态视频，因此移动端和 `prefers-reduced-motion` 用户天然使用静态背景。
- 原 Wallpaper Engine 目录只提供专用 `scene.pkg`，没有可直接用于浏览器的视频文件；如后续获得明确授权的源视频，应转码为静音 WebM/MP4，并继续保留当前 AVIF/WebP 降级。
- 素材目录没有附带可确认的网站再分发许可证。公开部署前必须由站点所有者确认原素材及衍生背景的使用授权。

### 首页音乐播放器

- 组件为 `components/music-player.tsx`，曲库集中配置在 `lib/music.ts` 的 `tracks` 数组（标题、作者、`src`、可选 `lyrics`）。
- 当前曲库为 4 首本地合成演示曲（48 秒 + 36 秒 × 3），由 `npm run audio:generate`（`scripts/generate-demo-audio.mjs`）生成；脚本先写临时文件再原子替换，dev server 运行中也可重跑，但被播放中的那一首可能被占用而跳过（停止播放后重跑即可）。
- 播放器右上角的队列按钮可打开管理面板：当前队列支持选歌、移除、上一首和下一首；一首时单曲循环，多首时按顺序循环，末曲结束后回到第一首。本地曲目和可匿名播放的网易云搜索结果均可加入，重复项会被阻止。新增本地歌曲只需把音频文件放入 `public/audio/` 并在 `tracks` 数组加一条记录。
- 歌词同样配置在 `lyrics`（每句 `time` 秒数 + `text` 文本），播放器高亮当前句（淡色变深色）并自动滚动居中；用户滚动歌词时暂停自动滚动 5 秒。无歌词音轨省略 `lyrics` 字段即可，面板自动隐藏。
- 首次进入时队列为空，播放器会按中国日期从网易云公开曲库加载一组“今日推荐”并尝试从第一首开始播放；这不是账号个性化推荐，也不会共享本机登录态。浏览器若拦截无手势自动播放，会保留完整队列并提示点击播放；推荐接口不可用时降级为一首本地演示曲。唱片仅在播放时旋转，`prefers-reduced-motion` 下禁用旋转和平滑滚动。
- **增减卡通贴纸**：把图片（PNG/SVG/WebP/JPG，建议方形或接近方形）放入 `public/images/mascots/`，运行 `npm run mascots:sync` 生成清单（`npm run dev` / `build` 前会自动执行；dev 运行中加图后手动跑一次即可）。贴纸按文件名顺序左右两列自动排布、跳过中间唱片区，白底圆角贴纸样式统一处理混合背景；清单文件为 `lib/mascots.generated.json`。

### 网易云音乐搜索播放（首页播放器内）

- 首页播放器的歌曲列表面板同时覆盖**本地曲库**与**网易云音乐**：输入关键词后，`/api/netease-search` 在服务端代理查询网易云网页版的公开搜索接口（只读元数据，带防抖、5 秒超时、D1 原子限速与 5 分钟公共缓存），并批量验证匿名播放地址。受版权、会员或地区限制的项目会明确标记“版权限制”，但仍提供安全的“打开”外链。
- 可播放的网易云结果通过“加入”进入听歌队列，只有空队列的第一首会立即成为当前曲目；`/api/netease-playback` 在实际切换时按需获取不缓存的临时播放地址，仅接受网易云 `*.music.126.net` CDN 并强制 HTTPS。若地址失效或加载失败，播放器会停止并显示“在网易云音乐中打开”的安全降级入口。网易云歌曲与本地歌曲共用原生音频控制条和真实 `currentTime`，所以暂停会停止歌词、拖动会立即切换并居中当前歌词。`/api/netease-lyric` 负责加载和清洗 LRC，并提供加载/空/失败状态。
- 安全边界：网页搜索/播放接口不是网易云开放平台的稳定公开 API，存在变更风险；本机 `ncm-cli` 的 App ID、Private Key 和登录会话不会注入网页、写入仓库或共享给访客。VIP 登录不等于开放平台允许网页播放全部歌曲，版权判定始终以网易云返回为准。CSP 仅向网易云 CDN 开放所需的 `media-src`。

示例文章和项目均为虚构演示内容。新增文章时填写 slug、标题、摘要、分类、标签、发布日期、更新日期、阅读时长与 Markdown 正文即可；文章详情会自动生成目录、上下篇与相关文章。

## 已实现功能

- 首页：简介、精选文章、最新文章入口、精选项目、音乐播放器
- 文章：列表、全文搜索、分类、标签、Markdown、代码高亮、目录、阅读时长、日期、归档、上下篇、相关文章
- 项目：集中配置、分类/技术/状态/精选、网站与仓库安全外链
- 关于：介绍、经历、技能、兴趣和可替换联系方式
- 阅读体验：响应式、深浅主题、中文排版、图片预览、返回顶部、404、跳转主内容、键盘可访问控件、减少动画偏好
- SEO：Metadata、Open Graph 文本信息、`sitemap.xml`、`robots.txt`、`rss.xml`
- 保险库：登录/退出、初始化/解锁/锁定、5 分钟自动锁定、搜索、筛选、收藏、密码生成、再次认证后查看/复制/**编辑**、删除、API Key 到期/轮换字段、加密备份与恢复；锁定、退出、保存或取消都会清除解密表单状态
- 二次元体验：安全评论占位（同源构建不执行第三方评论脚本）、一言（仅公开路由请求，失败回退站点语句）、文章阅读进度条、樱花飘落特效（左下角开关、localStorage 记忆、尊重减少动态偏好）、轻量看板娘（贴纸卡看板娘：`mascots` 目录卡通形象轮换 + 点击换台词气泡，可关闭，窄屏隐藏）
- 安全：客户端加密、独立随机 IV、D1 只存密文、服务端会话、CSRF、原子登录/公开搜索限速、可选 TOTP、路由分级 CSP、安全响应头、私人路由 no-store/noindex

## 安全设计与威胁模型

### 安全边界

登录密码与主密码是两套独立秘密：

1. 登录密码在服务端验证，用来确认单一所有者身份。生产环境保存的是 PBKDF2-SHA-256 哈希（600,000 次迭代），不是明文。
2. 主密码只进入浏览器 Web Crypto API，不发送到服务器，不写入 localStorage、cookie、数据库或日志。
3. 浏览器以 PBKDF2-SHA-256（600,000 次迭代、随机 128 位盐）派生不可导出的 AES-256-GCM 密钥。
4. 每次保存或编辑记录都生成新的 96 位随机 IV。用户名、密码、API Key、Secret、权限范围和备注位于加密 JSON 中。
5. 服务端只保存密文、IV，以及搜索/提醒所需的低敏元数据（平台、记录名、分类、标签、环境、日期、收藏和 Key 末四位）。

认证会话使用随机令牌；数据库只保存令牌 SHA-256 摘要。Cookie 为 HttpOnly、SameSite=Strict，生产环境加 Secure；写操作同时校验随机 CSRF token。登录尝试会在验证前通过 D1 原子递增，每个客户端 15 分钟最多 5 次；生产环境只信任 Cloudflare 注入的客户端地址头，缺失时统一进入保守限速桶。创建新会话时会清理过期会话。设置 `OWNER_TOTP_SECRET` 后会强制校验 RFC 6238 六位 TOTP。

### 能防住什么

- 数据库、备份或普通网络响应泄露时，攻击者不能直接得到敏感明文。
- 未登录请求无法读取或修改保险库接口。
- CSRF、常见点击劫持、搜索引擎抓取、缓存残留和基础暴力登录受到约束。
- Markdown 内容来自受信任的本地源码；原始 HTML 会转义，降低文章内容带来的 XSS 风险。

### 同源第三方脚本策略

公开博客与保险库目前仍共享一个 origin。为避免第三方评论脚本读取同源认证/CSRF 上下文，当前构建不会加载 Giscus 或其他远程评论脚本，CSP 也未放行该脚本域。页脚一言只在公开路由请求；私人路由 CSP 的连接与 iframe 来源均限制为本站。要恢复第三方评论，应先把公开博客与保险库部署到不同 origin，再在公开博客的独立 CSP 中启用。

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

完整的技术债与上线前检查清单见 [`docs/TECH_DEBT.md`](docs/TECH_DEBT.md)，部署前逐项过一遍。

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
- `npm test`：5 个测试文件、20 个测试全部通过；覆盖密码哈希验证、常量形态比较、AES-GCM 往返、唯一 IV、错误主密码拒绝、路由 CSP 隔离、限速边界、第三方响应净化、网易云链接/歌词解析与队列首尾循环
- `npm run build`
- 本地 D1 迁移：4 个迁移全部成功（含 `request_rate_limits`）
- 浏览器：桌面/移动首页、深浅主题、固定背景焦点与玻璃面板、文章搜索、归档、文章详情/目录/图片预览、项目安全外链
- 首页音乐播放器：今日推荐初始化、本地/网易云加入队列、重复阻止、移除、上一首/下一首、单曲循环与多曲首尾循环；播放/暂停、拖动进度、歌词同步、音量与静音；桌面和 390×844 移动端布局验证通过
- 保险库：登录、初始化、刷新与无操作自动锁定、解锁、账号与 API Key 新增/查看/复制/编辑、删除确认、删除接口、退出/未授权 API
- WebMCP：`lock_vault` 工具注册、有效调用和无效参数拒绝均已在浏览器中验证
- 数据库查询：测试密码、邮箱和 API Key 未出现在 `ciphertext` 中；每条记录 IV 长度与密文长度正常
- 私人响应头：`Cache-Control: no-store`、`X-Robots-Tag: noindex`、CSP、X-Frame-Options、nosniff

本轮重新执行在线审计并升级 Vitest 3.2.7、Cloudflare Vite Plugin 1.54.4、Wrangler 4.129.0 与 Workers Types 5.20260905.1；Drizzle CLI 的传递依赖使用兼容的已修复 esbuild 版本。最终完整 `npm audit` 返回 0 vulnerabilities。上线 CI 仍应重新执行在线审计。
