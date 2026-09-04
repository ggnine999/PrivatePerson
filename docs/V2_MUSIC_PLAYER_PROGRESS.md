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

## 环境与预览

- 工作区：`D:\develop\PrivatePerson`
- 本地预览：`http://localhost:3000/`
- 2026-09-05 接手会话使用 ZCode 内置浏览器完成验证；`/.zcode/` 会话元数据已加入 `.gitignore`。
- 原第二版背景改动仍与本轮播放器改动一起处于未提交状态（随本次一并提交）。
