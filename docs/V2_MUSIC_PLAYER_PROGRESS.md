# 第二版音乐播放器任务记录

更新时间：2026-09-05（Asia/Shanghai）
状态：已完成，浏览器实测与全套验证通过；经用户确认后本地提交，未推送、未部署。

## 用户需求

在首页主视觉截图所示的天空留白区域增加音乐播放器，并延续现有二次元背景、蓝白雾化层和玻璃面板风格。

## 本轮设计决定

- 桌面端：播放器位于首页 Hero 右侧天空留白区。
- 移动端：播放器随内容流排列在介绍卡片之后，避免遮挡 Saber。
- 功能：真实播放/暂停、可拖动进度、当前时间/总时长、音量、静音、加载错误提示。
- 不自动播放，避免浏览器限制和打扰访问者。
- 暂未接第三方音乐账号或接口；使用项目内原创合成演示音轨，后续可直接替换集中配置。
- 唱片仅在播放时缓慢旋转；`prefers-reduced-motion` 下禁用旋转。

## 已创建文件

- `components/music-player.tsx`：播放器客户端组件。
- `lib/music.ts`：集中音轨配置，目前为“晴空慢游 / 本地合成演示音轨”。
- `scripts/generate-demo-audio.mjs`：无依赖 WAV 演示音轨生成脚本。
- `public/audio/starlight-demo.wav`：48 秒、22.05 kHz、单声道 PCM WAV，约 2.1 MB。
- `public/audio/starlight-demo.vtt`：无歌词器乐辅助说明。

## 已修改文件

- `app/page.tsx`：引入并在 Hero 中渲染 `MusicPlayer`。
- `app/globals.css`：新增播放器玻璃样式、桌面/移动布局、播放动画和减少动态效果降级。
- `package.json`：新增 `npm run audio:generate`。

## 已完成验证

- `npm run audio:generate`：成功。
- `npm run lint`：通过（补充 `<track>` 和语义化 `<output>` 后）。
- `npm run typecheck`：通过。
- 本地音频 URL `http://localhost:3000/audio/starlight-demo.wav`：HTTP 200，`Content-Type: audio/wav`，长度 2,116,844 字节。
- 浏览器已渲染播放器，控件和无障碍名称可见。

## 问题定位与修复（2026-09-05 接手会话）

原「当前已知问题」两项现象，接手后在浏览器实测中定位为两个独立原因：

1. **进度 `0:00 / 0:00`、无法拖动（真实 bug）**：本地小文件的 `loadedmetadata`/`durationchange` 会在 React 挂载事件监听器的 `useEffect` 之前触发，`duration` 状态永远停在 0，进度条 `max=0` 导致拖动无效、总时长显示 0:00。修复：挂载时按 `readyState >= HAVE_METADATA` 补读一次 duration，并对非有限值加守卫（`components/music-player.tsx`）。
2. **「演示音轨加载失败」（一次性瞬时故障，未再复现）**：干净加载下音频正常（HTTP 200、`audio/wav`、长度精确、Range 206、WAV 头合法、实际出声）。原因为生成脚本当时直接覆盖最终文件，进行中的媒体请求可能读到截断数据。修复：脚本改为先写 `.tmp` 再 `rename` 原子替换（`scripts/generate-demo-audio.mjs`）。

顺带修复与加固：

- 音量初始值 0.65 此前只更新 UI，`audio.volume` 实际为 1.0；挂载时同步。
- 错误提示改为在 `canplay`/`playing` 事件时自动清除，完善重试路径。
- 进度与音量滑块补充 `aria-valuetext`。
- `proxy.ts` CSP 显式声明 `media-src 'self'`（此前仅靠 `default-src` 回退放行）。

## 完成验证记录（2026-09-05）

1. 音频加载/播放问题修复，浏览器实测通过（见上）。
2. 1440×900：播放器位于 Hero 右侧天空留白，不遮挡 Saber。
3. 390×844：播放器随内容流排列在介绍卡片后，控件完整、无横向溢出。
4. 实际操作：播放/暂停、点击与键盘方向键拖动进度、音量调节、静音/取消静音、循环、总时长 0:48 显示正常。
5. 深浅主题：`html.dark` 与玻璃面板配色随主题切换实测变化；`prefers-reduced-motion` 降级规则静态确认（`app/globals.css` 633、2041 行；IAB 无法模拟该媒体查询，未做动态验证）。
6. README 已补充音轨替换方法与播放器说明。
7. `npm run lint`（0 警告 0 错误）、`npm run typecheck`、`npm test`（4/4）、`npm run build`、`npm audit --omit=dev --offline`（0 vulnerabilities）、`git diff --check` 全部通过。
8. 经用户确认：验证通过后本地提交本批工作，不推送。

## 追加：歌词面板（2026-09-05 第二轮）

- `lib/music.ts` 新增 `MusicLyric` 类型与演示音轨的 8 句同步歌词（每 6 秒一句，与合成音轨的旋律乐句对齐）；无歌词音轨省略 `lyrics` 字段即可自动隐藏面板。
- `components/music-player.tsx` 新增固定高度歌词面板：按 `currentTime` 推导当前句，淡色→深色高亮并平滑滚动居中；用户滚动歌词时锁定自动滚动 5 秒后恢复；移除旧 `<track kind="captions">`（歌词面板已在 DOM 提供全部文本，避免双份来源；lint 的 media-has-caption 规则以行内注释禁用并注明理由），同步删除 `public/audio/starlight-demo.vtt`。
- `app/globals.css` 新增 `.music-lyrics` 样式：固定高度、上下渐隐遮罩、隐藏滚动条、当前行颜色/缩放过渡；移动端断点缩小高度。平滑滚动走 CSS `scroll-behavior`，全局 `prefers-reduced-motion` 规则自动将其降级为瞬时滚动。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；浏览器实测 seek 与自然播放跨句时当前行高亮、自动滚动居中偏移 0px；深浅主题与 390×844 移动端截图确认。

## 追加：对称双卡片布局（2026-09-05 第三轮）

- 应用户要求，播放器卡片改为与左侧介绍卡片同宽同高：`.hero` 两列改为等宽 `minmax(0, 1fr)`；`.music-player` 改为 `align-self: stretch` 的 flex 列，移除天空悬浮偏移与 26rem 宽度上限。
- 歌词面板改为 `flex: 1 1 auto` 弹性填充卡片剩余高度；内容不满时通过首末行自动边距在面板内安全居中（溢出时自动边距归零，不影响滚动起点），并放大字号/行距使长卡片下歌词更饱满。
- ≤900px 单列布局下播放器与介绍卡片同样限制 `max-width: 650px`；≤560px 歌词回到 6rem 固定高度。
- 验证：1440×900 下两卡片实测均为 544×702 且顶边对齐；深浅主题截图确认；移动端 390×844 两卡片等宽（347px）、无横向溢出、6rem 歌词盒跨句自动滚动居中偏移 0px。
- 取舍：全高玻璃面板会遮住部分主视觉（浅色下 Saber 剪影透过磨砂玻璃隐约可见），属对称布局的预期效果。已知边界：播放中改变视口尺寸时歌词不重新居中，最多等 6 秒下一句播放时自纠正。

## 追加：曲库与歌曲搜索（2026-09-05 第四轮）

- `lib/music.ts` 升级为 `tracks` 曲库数组（4 首：晴空慢游 48s、星屿夜行/微光散步/午后电台 36s），每首自带同步歌词；第一首为默认播放曲目。
- `scripts/generate-demo-audio.mjs` 参数化重构，一次生成全部演示曲；Windows 下目标文件被播放中的媒体响应占用时 rename 会报 EPERM，已加重试与单曲容错（跳过被锁文件并在结尾汇总提示，清理临时文件）。
- `components/music-player.tsx` 新增歌曲列表面板：标题行右侧按钮开关（`aria-expanded`），搜索框按歌名/歌手即时过滤（空结果显示「没有找到匹配的歌曲」），点击曲目切歌并自动续播，当前曲以主题色高亮并带 `aria-current` 标记；audio 元素随曲目 `src` 由 key 重建，监听器 effect 依赖 `track.src` 重新挂载，清理时暂停旧元素防止换曲后旧歌继续播放。
- CSS 新增列表切换按钮、搜索框（`focus-within` 高亮）、曲目行与空态样式；列表与歌词面板共用同一弹性区域，卡片尺寸不因切换而变化。
- 验证：lint 0 警告、typecheck、test 4/4、build、audit 0 漏洞；浏览器实测搜索过滤（「夜」→ 仅星屿夜行）、空态、清空恢复、切歌续播（glimmer-stroll.wav 自动播放且歌词/标题跟随）、当前曲标记；深浅主题与 390×844 移动端截图确认。

## 追加：网易云音乐外链页（2026-09-05 第五轮）

- 用户希望接入流媒体曲库（最初提出汽水音乐会员）；经核实汽水音乐无公开 API/外链播放器，且个人会员不覆盖博客公开传播所需的信息网络传播权，改用**网易云音乐官方外链播放器**方案。
- 新增 `/music` 页面（导航「音乐」、页脚、sitemap 同步）：玻璃卡片内嵌网易云官方 iframe（`music.163.com/outchain/player`），嵌入配置集中在 `lib/music.ts` 的 `neteaseEmbeds`（type: song/playlist + id + 说明），默认示例为海阔天空（347230）与晴天（186016），均已实测可渲染外链播放器。
- `proxy.ts` CSP 增加 `frame-src 'self' https://music.163.com`，否则 default-src 'self' 会拦截 iframe。
- 已知边界：自动化内置浏览器中点击外链播放器的播放键未出声（无报错/无登录墙，疑似环境限制），需在真实浏览器人工点播确认一次；版权受限歌曲会显示平台提示，VIP 歌曲对未登录访客可能仅试听。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；浅色/深色/390×844 截图确认页面与 iframe 渲染正常、无横向溢出。

## 追加：网易云搜索并入首页播放器（2026-09-05 第六轮）

- 按用户反馈撤销独立的 /music 页面（导航/sitemap/`neteaseEmbeds` 配置一并移除），改为把网易云整合进首页播放器卡片。
- 新增 `app/api/netease-search`：服务端只读代理网易云网页版公开搜索接口（关键词限长、5 秒超时、结果规范化含 VIP 标记）；音频播放仍全部经官方外链 iframe，不接触音频流。
- 播放器搜索面板改为双分组：本地曲库（原有交互不变）+ 网易云音乐（350ms 防抖、loading/失败/空态、结果带 VIP 标记与 `aria-current`）。点击网易云结果后卡片内嵌官方外链 iframe（`auto=1` + `allow="autoplay"`），控制条隐藏、标题栏切换为网易云来源；选本地曲目即切回自制界面。
- 状态设计：网易云搜索结果收敛为单一状态对象（keyword/state/results），setState 均在异步回调中以满足 react-compiler；结果仅在关键词与当前输入一致时渲染，防止迟到响应串台。
- 修复：重写组件时歌词面板分支曾遗漏，回归测试发现后补回；搜索列表加 `max-height: 22rem` 防止长结果把卡片撑高破坏与左侧卡片的对称。
- 验证：lint 0 警告、typecheck、test 4/4、build、audit 0 漏洞；浏览器实测完整回路（本地歌词 → 搜网易云并内嵌自动播放 → 切回本地歌词恢复）、卡片高度保持 702 与左卡对称；版权受限歌曲由平台在 iframe 内提示。

## 补充修复：双卡等高的浏览器差异（2026-09-05 用户反馈）

- 用户真实 Chrome 中左右卡片高度不一致：`.hero` 的 `min-height: calc(100svh - 72px)` 在部分 Chromium 下会把网格行拉伸到该高度，`align-self: stretch` 的播放器卡片跟随变高，而介绍卡片按 `align-items: center` 居中不拉伸，导致 703 vs 803 的错位（内置自动化浏览器不触发该拉伸路径，此前未测出）。
- 修复：`.hero-copy` 也改为 `align-self: stretch` 并转 flex 列布局，统计栏 `margin-top: auto` 钉底消化多余空间；因 flex 内外边距不再折叠，显式接管 `.lead` 默认边距（`.hero-actions` 底边距补回间距）。
- 验证：900/875/1200 三档视口高度下两卡实测严格等高且顶部对齐（700/700、696/696、1000/1000），lint/typecheck/build 通过。

## 追加：卡片视觉打磨（2026-09-05 第七轮，用户反馈）

- 卡片空白处加入主视觉人物装饰：`.music-mascot` 以 Saber 壁纸为底部背景（72% 水平焦点对准人物），向上渐隐 + 半透明，`aria-hidden` + `pointer-events: none`；深色模式降低不透明度。播放器卡片加 `overflow: hidden` 裁剪，内容层（标题/控制条/歌词/列表）显式定位置于装饰层上方。
- 标题区改为水平居中：唱片居中、状态/歌名/歌手文字居中（网格 `justify-items: center` + `text-align: center`），歌曲列表按钮移到卡片右上角绝对定位。
- 歌词加大：桌面字号 0.95→1.05rem、行距 0.42→0.55rem；移动端 0.82→0.92rem、歌词盒高 6→7rem。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；深浅主题、网易云搜索模式（列表文字在装饰上方可读）、390×844 移动端截图确认。

## 追加：歌词居中（2026-09-05 用户反馈）

- 歌词文字改为水平居中（`text-align: center`），当前行缩放原点从左缘改为中心，与居中的标题区和人物装饰形成完整的「正在播放」界面。自动滚动居中逻辑基于行矩形计算，不受文字对齐影响。

## 追加：卡片内原创 kawaii 小伙伴（2026-09-05 第八轮，用户反馈）

- 用户希望在标题区空白处放网络流行的卡通形象（奶龙/Doro/小猫等）；这些是受版权保护的形象，抓图上站存在侵权风险，改为**原创手绘 SVG kawaii 小伙伴**：白猫（橙耳）、小黄龙（闭眼微笑 + 蓝围巾 + 薄荷小角，用户看过奶龙图后要求"自己想办法"，矢量绘制无画质损失）、小鸡（新芽），组件 `components/music-chibis.tsx`。
- 布局：白猫在标题区左侧、小鸡在右侧、小黄龙从唱片顶缘探出头；`chibi-float` 上下漂浮动画（错开相位），`prefers-reduced-motion` 下停用；移动端断点缩小尺寸。均为 `aria-hidden` + `pointer-events: none` 纯装饰。
- 已知小坑：Windows 下 Vite 文件监视偶发漏掉组件变更，dev server 持续供应旧模块（HMR 报导出缺失）——`touch` 相关文件即可强制重编译。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；桌面/移动端截图确认三个角色渲染与布局正常。

## 追加：换用 OpenMoji 开源表情（2026-09-05 第九轮，用户反馈）

- 用户在得知版权考量后选择「用开源表情包」：移除手绘 chibi 组件（`music-chibis.tsx` 已删除），改用 **Microsoft Fluent Emoji**？否——最终采用 **OpenMoji**（CC BY-SA 4.0，描边卡通风与卡片手绘感一致）。
- 素材：`public/images/mascots/`（dragon/cat/hamster/ghost/chick 五个 color SVG，各 2-3KB 矢量）+ `LICENSE-OpenMoji.txt`；通过 npm 包 `openmoji@17`（registry 直连可用）提取，README 已加来源与许可署名。
- 布局：猫脸（左）、龙王（唱片上）、仓鼠（右）、幽灵（卡片左下角，歌词居中后左侧留白处）。装饰改用 CSS 背景图（`aspect-ratio: 1` + `background-size: contain`）而非 `<img>`，规避 oxlint 的 no-img-element 规则且语义上更符合纯装饰定位。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；桌面截图确认四个形象渲染正常。

## 追加：移除卡通表情装饰（2026-09-05 用户反馈）

- 用户决定自行寻找卡通图素材，OpenMoji 表情装饰（猫/龙/仓鼠/幽灵）连同 `public/images/mascots/` 素材与 README 署名一并移除；相关 CSS（`.music-mascot-char`、`chibi-float` 动画）清理完毕。
- 卡片底部的 Saber 主视觉装饰（`music-mascot`，来自站点壁纸本身）保留。
- 待办：用户提供自选的卡通图素材后，可按第九轮的技术方案接入（`public/images/` 放图 + 装饰层背景图），需用户自行确认素材授权。

## 追加：用户自制贴纸上墙（2026-09-05 第十轮，用户反馈）

- 用户自行提供 5 张卡通图（`public/images/mascots/`：nailong01/doro01/lulu01/cat01/niu01，RGB 无透明通道），授权由站点所有者负责；替换 OpenMoji 表情。
- 因为图带背景（白底与照片场景混合），采用**白色贴纸**统一样式：白底圆角小卡 + 细边框 + 投影 + 每张独立微倾斜（keyframes 经 `--tilt` 变量组合 rotate），漂浮动画沿用，`prefers-reduced-motion` 停用；移动端断点缩小。
- 布局：小猫（标题左）、噜噜（标题右）、奶龙（左下，全身可见）、Doro（唱片顶探头，只露眼睛刚好是梗图效果）、牛牛（右下）。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；深浅主题截图确认贴纸观感（白贴纸在深色卡上即贴纸质感）。

## 追加：贴纸全部移至左右两列（2026-09-05 用户反馈）

- 撤掉唱片顶缘的 Doro，五张贴纸全部沿左右两边分布：左列 = 小猫（标题左）→ Doro（中部）→ 奶龙（底部），右列 = 噜噜（标题右）→ 牛牛（底部）；唱片区与歌词中线完全留空。
- 顺带修正：奶龙原锚定在标题区（`bottom: 18%` 按标题高度解析导致与小猫重叠），已移到卡片层级钉在左下角。

## 追加：贴纸目录化自动管理（2026-09-05 第十一轮，用户需求）

- 用户需求：以后增加卡通形象直接往 `public/images/mascots/` 丢图即可。
- 新增 `scripts/generate-mascot-manifest.mjs` + `npm run mascots:sync`：扫描目录内图片（png/svg/webp/jpg/gif，忽略大小写）生成 `lib/mascots.generated.json`；挂到 `predev`/`prebuild` 钩子，dev/build 自动同步，dev 运行中加图后手动跑一次。
- 播放器改为读取清单动态渲染：按文件名排序左右两列交替（左列 = 排序偶数位，右列 = 奇数位），列内 8%~72% 均分纵向位置，水平位置与倾斜角/尺寸由索引伪随机微调；跳过中间唱片区。上限约每列 6 张（再多会互相贴近）。
- 清理：手写的 `.music-char-*` 每角色 CSS 与组件内固定 span 全部移除，共用贴纸样式保留（白底圆角 + aspect-ratio 1 + contain）；此前的自动布局首版漏了 background-image 内联，回归截图发现后补上。
- 验证：lint 0 警告、typecheck、test 4/4、build 通过；浏览器确认 5 张贴纸按自动布局渲染（左列 cat01/lulu01/niu01，右列 doro01/nailong01）。

## 追加：歌词逐字变色（2026-09-05 用户反馈）

- 歌词升级为 KTV 式逐字跟唱：当前句拆分为单字 span，按 `currentTime` 在句内（句起点 → 下一句起点，末句以时长兜底）的线性进度逐字点亮为主题蓝（`--primary`），单字颜色 0.4s 平滑过渡；切换到下一句时上一句所有字缓慢恢复淡色，循环回环时末句自然复原。
- 节奏精度说明：逐字时点为句内线性插值（句级时间轴均分到字），`timeupdate` 约 4Hz 驱动；如需与真实演唱逐字对齐，需要逐字级时间轴（增强 LRC 或语音对齐），当前为最佳近似。
- 验证：t=20s 时 9 字句前 3 字变蓝（进度 33%），t=38s 时 7 字句前 2 字变蓝（进度 33%），seek 跨句后上一句 0 个蓝色残留；lint/typecheck/test/build 通过。

## 追加：KTV 式滚动歌词（2026-09-05 用户反馈）

- 歌词改为两阶段滚动行为：前几句高亮行在顶部区域自然下走；当放大变蓝的高亮行到达面板中部后即被钉在正中，其余歌词从下往上滚过、顶部渐隐——实现方式为歌词内容包一层轨道层并加大上下留白（桌面 11rem/移动 2.2rem）制造滚动余量，既有 `scrollTop` 居中逻辑（`Math.max(0,…)` 截断）在此余量下自然产生「先下走、后钉中」的两阶段行为。
- 逐字变色与滚动叠加验证：滚动中逐字点亮依然精确（第 6 句 48% 进度 → 7 字亮 3）；移动端滚动居中同样生效。

## 环境与预览

- 工作区：`D:\develop\PrivatePerson`
- 本地预览：`http://localhost:3000/`
- 2026-09-05 接手会话使用 ZCode 内置浏览器完成验证；`/.zcode/` 会话元数据已加入 `.gitignore`。
- 原第二版背景改动仍与本轮播放器改动一起处于未提交状态（随本次一并提交）。
