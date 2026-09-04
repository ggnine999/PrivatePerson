# 技术债与上线前检查清单

更新时间：2026-09-05
维护约定：解决一项就勾掉一项；新增债务往对应优先级里追加，标注位置与建议。

## 高优先（公开部署前必办）

- [ ] **壁纸/贴纸素材授权确认**：`public/images/saber-meadow-v2.*` 源自 Wallpaper Engine 预览扩展生成，无再分发许可证（README「第二版背景素材」已记录）；`public/images/mascots/` 为用户自行提供的卡通图，授权由站点所有者自行确认。公开部署前必须确认或替换。
- [ ] **CSP `script-src 'unsafe-inline'`**（`proxy.ts:3`）：削弱零知识保险库的 XSS 防线，README 威胁模型一节已自认。上线时应切换到 nonce/hash 方案（Vinext 运行模式限制，需要验证其是否支持）。
- [ ] **登录页演示凭据提示框**（`app/vault/login/page.tsx` 顶部常驻区块）：生产构建也会渲染 `demo-owner / Sakura-Demo-2026!` 的提示。服务端会拒绝该凭据（fail-closed），但不应在面向公网的页面暴露。建议改为仅非生产环境渲染。
- [ ] **生产环境变量**：`OWNER_LOGIN`/`OWNER_PASSWORD_HASH` 未配置时生产无人能登录（fail-closed，属预期）；上线前需生成正式哈希（`npm run auth:hash`）并配置。可选：`OWNER_TOTP_SECRET` 强制 2FA。
- [ ] **wrangler.jsonc 的 D1 `database_id` 仍为占位符** `00000000-…`：部署前需创建真实 D1 并替换。

## 中优先（体验 / 正确性）

- [ ] **保险库初始加载失败永久卡死**（`components/vault-app.tsx` 初始 `Promise.all` 的 `catch(() => {})`）：接口失败时 `loading` 永远为 true，页面停在「正在确认安全会话…」。建议 catch 中置错误态并提供重试。
- [ ] **登录限速 key 可伪造**（`lib/server-auth.ts`）：取 `cf-connecting-ip` 否则 `x-forwarded-for`，后者在代理配置不当时可伪造轮换绕过。建议生产只用 `cf-connecting-ip`。
- [ ] **过期会话行不清理**（`owner_sessions` 表）：无 prune 机制，长期运行无限增长。建议登录时顺带删除过期行。
- [ ] **歌词逐字节奏为线性近似**：句级时间轴均分到字（`components/music-player.tsx`），与真实演唱存在偏差。要逐字精准需增强 LRC 或语音对齐数据源，现有框架已支持接入。
- [ ] **CSP 放行的第三方域**：`giscus.app`（评论）、`v1.hitokoto.cn`（一言）、`music.163.com`（网易云外链）。均为功能必需，若停用对应功能应同步收紧。

## 低优先（优化 / 维护）

- [ ] **文章插画无现代格式**：`public/images/night-editorial.png` 单张约 2MB，建议补 AVIF/WebP 变体（壁纸已有 `image-set` 方案可复用）。
- [ ] **壁纸 PNG 源图随站部署**：`public/images/saber-meadow-v2.png`（约 2.1MB）仅作编辑源图，公开部署前可移出 `public/` 或加入部署忽略。
- [ ] **代码风格混杂**：约 10 个文件（`lib/server-auth.ts`、`lib/vault-crypto.ts`、`app/vault/*`、`app/api/*` 等）为压缩单行风格，与其余 oxfmt 格式化文件不一致。找低风险时段统一跑 `npm run format` 并回归。
- [ ] **看板娘台词较少**：`components/kanban-musume.tsx` 顶部 `LINES` 数组 6 句，可按站点人设扩充。
- [ ] **Windows 下 Vite 文件监视偶发漏变更**：组件改动后 dev server 可能持续供应旧模块（HMR 报旧错）。`touch` 对应文件或重启 dev 即可，属工具链已知问题。

## 已解决（存档备查）

- ~~音频生成脚本非原子覆盖~~ → 已改为临时文件 + rename + 重试（2026-09-05）
- ~~播放器音量初始值与 UI 不同步~~ → 挂载时同步（2026-09-05）
- ~~歌词 `duration` 未初始化导致进度条 max=0~~ → 挂载时按 `readyState` 补读（2026-09-05）
- ~~歌词面板分支在组件重写中遗漏~~ → 截图回归发现后补回（2026-09-05）
