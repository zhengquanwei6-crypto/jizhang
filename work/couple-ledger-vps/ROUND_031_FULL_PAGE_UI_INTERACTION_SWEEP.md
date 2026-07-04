# Round 031 - Full Page UI and Interaction Sweep

## Goal

按照用户要求，不只看首页和底部五个大板块，而是逐页截图检查登录、注册、找回密码、首页、账本、查重复、统计、聊天、我的、预算、账户、分类、情侣空间、宠物、存钱罐、归档、周期账单、Jelly AI、反馈、后台等可见页面，集中修复用户能看见、能点到、能输入、能跳转的问题。

## Fixed UI Problems

1. 首页右下角悬浮按钮容易压住底部导航。
2. 首页顶部快捷区内容太多，用户一进来就被信息挤满。
3. 首页折叠状态下仍露出多余快捷按钮。
4. 首页 Jelly AI 入口和独立 Jelly 页面重复。
5. 首页一屏内同时出现太多解释卡片，影响记账主任务。
6. 账本页重复出现引导/罗盘类入口，和已有操作冲突。
7. 周期账单页浮动入口容易靠近底部导航。
8. 查重复账单页面没有稳定的独立可见页面。
9. 直接打开 `/duplicates` 会回到首页，看起来像页面丢了。
10. 分类页增强摘要插入位置不对，会触发页面错误。
11. 后台页接口 mock 数据形状不对，容易把页面打空。
12. 登录/注册/找回密码的小链接触控面积偏小。
13. 注册页勾选框触控面积偏小。
14. 多个页面的图标按钮触控面积不稳定。
15. 预算页部分操作按钮太挤。
16. 账户页部分操作按钮太挤。
17. 存钱罐页部分操作按钮太挤。
18. 统计页部分按钮和输入区间距不稳定。
19. 情侣空间页部分小按钮不利于手机点按。
20. 反馈页输入和操作区域缺少统一的移动端保护。
21. 首页和账本页底部固定层过多，视觉上容易互相抢位置。
22. 二级页面缺少简短的“这个页面用来干什么”的操作提示。
23. 静态检查没有正确识别带版本号的资源引用。
24. 页面截图审计覆盖范围不够，容易漏掉子页面问题。

## Fixed Interaction Problems

1. 首页“一句话记账”输入框点击后焦点容易丢。
2. 首页输入框输入一个字符后可能中断。
3. 首页输入框在中文输入法组合输入时容易被页面刷新打断。
4. 首页忙碌 DOM 更新会让本轮修复脚本一直等不到执行机会。
5. 账本搜索框点击后焦点不够稳定。
6. 账本搜索连续输入时字符顺序可能异常。
7. Jelly AI 输入区连续输入时需要同样的焦点保护。
8. 统计页文本输入区需要同样的焦点保护。
9. 反馈页文本输入区需要同样的焦点保护。
10. 分类搜索输入需要同样的焦点保护。
11. 情侣空间愿望输入需要同样的焦点保护。
12. 注册勾选框手机上不容易点中。
13. 找回密码页返回/跳转链接不容易点中。
14. 多页面小链接不符合移动端常用触控尺寸。
15. 预算页按钮密集时误触风险高。
16. 账户页按钮密集时误触风险高。
17. 存钱罐页按钮密集时误触风险高。
18. 周期账单页底部操作容易和导航抢点击区域。
19. 查重复账单入口点击后不能稳定停在目标页面。
20. 直接访问子页面时 SPA 回退逻辑容易掩盖真实问题。
21. 旧浏览器缓存可能继续加载旧的 Round031 资源。
22. 本地审计脚本以前只覆盖少量页面，不足以发现子页面交互问题。
23. 后台接口 mock 报错会中断后续页面检查。
24. 分类页脚本报错会影响后续用户操作。

## Changes

- Added `cl-round-031.css` to enforce mobile touch targets, collapse noisy homepage tools, hide redundant floating action buttons, reduce repeated home/ledger widgets, and style the standalone duplicate-review page.
- Added `cl-round-031.js` to stabilize input focus during typing and IME composition, protect focused fields from DOM replacement, simplify repeated page areas, add concise feature summaries, and provide a standalone `/duplicates` route when the current production bundle lacks one.
- Updated `index.html` to store the original path before the Vue app boots, and to load Round 031 assets with cache-busting version `20260705-r31h`.
- Expanded `tools/ui-audit.mjs` from a small smoke script into a 21-route screenshot and interaction audit.
- Updated `tools/check-static.ps1` so asset references with query strings are still validated correctly.

## Verification

- `node --check work/couple-ledger-vps/www/assets/cl-round-031.js` passed.
- `powershell -ExecutionPolicy Bypass -File work/couple-ledger-vps/tools/check-static.ps1` passed.
- `node work/couple-ledger-vps/tools/ui-audit.mjs` passed across 21 routes.
- Playwright reported `errors: []`.
- Playwright reported `interactionFindings: []`.
- Playwright found no horizontal overflow on the audited mobile pages.
- Playwright verified consecutive input works on visible tested text fields, including the homepage quick ledger input and the ledger search input.
- Playwright verified `/duplicates` now renders an actual duplicate-review page instead of falling back to `/home`.

## Plain-Language Summary

这一轮不是只修一个按钮，而是把整套页面按“普通用户能不能看懂、能不能点到、能不能正常输入、点了会不会跳错地方”重新扫了一遍。

最关键的修复有三个：第一，首页一句话记账现在会保护输入框焦点，点进去后不再像之前那样把输入法弹一下又收回去；第二，右下角多余悬浮按钮和首页重复信息被收起来，手机上不再那么挤；第三，查重复账单这样的子页面现在能直接打开，页面不会莫名其妙跳回首页。

简单说：以前像是很多功能都摆在桌面上，按钮还会互相挡住，输入框也不太听话；现在先把常用入口留下，把重复和挡手的东西收起来，并且让输入框、跳转和子页面更稳定。

## Next Candidates

- Round 032: 继续压缩按钮过多的页面，重点是账本、我的、预算、账户、情侣空间。
- Round 033: 把已经稳定的 Round031 行为迁回正式 Vue 源码，减少长期 overlay 层数。
- Round 034: 做真实登录态下的账单新增、编辑、删除、重复合并全流程截图检查。
