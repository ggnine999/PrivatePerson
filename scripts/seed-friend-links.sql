-- 初始友链种子（2026-09-06 调研的 7 个链接去重后 5 个站点）。
-- zmoe.com 与 blog.kt.sb 同站、onetuzi.cn 与 023.me 同站，各收录一个主域名。
-- 幂等：重复执行不会产生重复行。
-- 本地：npm run db:migrate:local 后执行 wrangler d1 execute site-creator-d1 --local --persist-to .wrangler/state --config wrangler.jsonc --file scripts/seed-friend-links.sql
-- 生产：同命令加 --remote（公开部署前先替换 wrangler.jsonc 的 database_id）。

INSERT OR IGNORE INTO friend_links (id, name, url, description, status, created_at) VALUES ('8348038afa3b44c8b37456b1c8ea11d5', '阿珏酱のBlog', 'https://moejue.cn/', '充满二次元风情的技术博客，博主自研 LoLiMeow 萌系主题。', 'approved', 1788710400000);
INSERT OR IGNORE INTO friend_links (id, name, url, description, status, created_at) VALUES ('e5abd5bdd8603e7c3f08ba2b8157b7e3', 'A/B''s Blog', 'https://zmoe.com/', 'B分之A的自留地：技术、兴趣与圣地巡礼（blog.kt.sb 为同站）。', 'approved', 1788710400000);
INSERT OR IGNORE INTO friend_links (id, name, url, description, status, created_at) VALUES ('a89437087c09e314250aa63e7a26d654', 'Hackyh''Blog', 'https://www.hackyh.com/', '网络技术、精品软件与网络杂谈，安全运行十多年的老站。', 'approved', 1788710400000);
INSERT OR IGNORE INTO friend_links (id, name, url, description, status, created_at) VALUES ('b0ebb00524ee5966fcf723833171eb81', '初之音', 'https://www.himiku.com/', 'Mikusa 的自留地：自托管、追番与 Typecho 生态作品，LOVE MIKU FOREVER.', 'approved', 1788710400000);
INSERT OR IGNORE INTO friend_links (id, name, url, description, status, created_at) VALUES ('e715bcd6bd0a95a05318a827bb4739a2', '彼岸临窗', 'https://onetuzi.cn/', '一名律师的思考与独白，极简文学风随笔（023.me 为同站新域名）。', 'approved', 1788710400000);
