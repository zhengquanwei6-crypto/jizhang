# Round 032 - Density Drawer Sweep

## Goal

继续完成全页 UI/交互检查，把 Round031 审计里剩下的“按钮过多、信息太挤、首页和子页面功能摊得太开”的问题继续压缩。重点不是删功能，而是把低频功能、重复入口、说明性内容收进抽屉，让用户默认先看到最常用的内容，需要时再展开。

## Problems Fixed

1. 首页“本月概览”默认展开，占用一大段首屏空间。
2. 首页 9 宫格快捷入口默认展开，和底部导航重复。
3. 首页最近账单、月度洞察、情侣分摊全部展开，页面被拉得过长。
4. 账本页账单行右侧重复出现“复记/编辑”等次要按钮。
5. 账本页账本罗盘、账本扫描和行内操作互相抢注意力。
6. 统计页钱小参 AI 计划默认展开，和统计主数据抢空间。
7. 统计页复制/保存类按钮偏多，影响快速阅读。
8. 我的页“我的罗盘”默认展开，和记录管理入口重复。
9. 我的页数据备份台默认展开，信息量过大。
10. 我的页 CSV/XLSX 导入识别区默认展开，占用较长空间。
11. 我的页快捷入口默认展开，和底部导航重复。
12. 我的页情侣互动默认展开，和空间/果冻/聊天入口重复。
13. 我的页提醒偏好默认展开，一次性出现太多开关。
14. 我的页导入导出、主题、账号安全等高级设置全部摊开。
15. 预算页钱小参预算计划默认展开，挤占预算主面板。
16. 预算页分类预算卡片动作按钮过密。
17. 预算页底部预算建议说明占用过长。
18. 账户页默认账户卡片和账户操作按钮过密。
19. 账户页最近转账默认展开，和账户列表抢空间。
20. 情侣空间顶部罗盘与空间内快捷动作重复。
21. 情侣空间养成、存钱、聊天、分享按钮默认露出过多。
22. 情侣空间纪念日、目标、共享清单操作按钮过密。
23. 周期账单页工具/说明类内容占用过长。
24. Jelly 页工具入口与底部导航和首页快速入口重复。

## Changes

- Added `cl-round-032.css` for compact drawer rows, collapsed section states, and secondary action hiding.
- Added `cl-round-032.js` to detect dense route sections and collapse low-frequency areas by default.
- Added persistent per-section drawer state with `localStorage`, so users展开后下次仍然记得选择。
- Collapsed homepage monthly overview, quick shortcuts, recent bills, monthly insight, and split summary.
- Collapsed ledger compass/scan areas and hid repetitive row actions by default.
- Collapsed AI planning panels on stats and budgets so core numbers appear first.
- Collapsed multiple Profile/Mine sections: quick shortcuts, backup, import, reminders, data/settings, appearance/account actions.
- Collapsed account, budget, couple-space, recurring, and Jelly secondary tool areas.
- Updated `index.html` to load Round032 assets with cache-busting version `20260705-r32d`.
- Added an extra caret guard for the homepage one-sentence ledger input so repeated single-character typing appends in the right order.

## Verification

- `node --check work/couple-ledger-vps/www/assets/cl-round-032.js` passed.
- `powershell -ExecutionPolicy Bypass -File work/couple-ledger-vps/tools/check-static.ps1` passed.
- `node work/couple-ledger-vps/tools/ui-audit.mjs` passed across 21 routes.
- Playwright reported `uiFindings: []`.
- Playwright reported `interactionFindings: []`.
- Playwright reported `errors: []`.
- Playwright verified no horizontal overflow on audited pages.
- Playwright verified text inputs still keep focus and accept consecutive typing after the density changes.

## Plain-Language Summary

这一轮修的是“页面太满、按钮太多、用户一打开不知道先看哪里”的问题。

我没有把功能删掉，而是把不常用的内容收进“展开”抽屉里。比如首页默认先保留一句话记账、结余、目标和洞察；本月概览、快捷入口、最近账单、情侣分摊这些内容需要时再点开。我的页也一样，备份、导入、提醒、主题、账号操作都先收起来，用户不用一上来被一大堆按钮淹没。

简单说：以前像所有抽屉都打开着，桌面很乱；现在先把抽屉关上，只把常用东西放在手边，需要哪个再打开哪个。

## Next Candidates

- Round 033: 做真实登录态下的记一笔、编辑、删除、重复复核全流程截图检查。
- Round 034: 把稳定的 Round031/Round032 overlay 行为迁回正式 Vue 源码，减少长期脚本叠层。
- Round 035: 检查移动端输入法弹出时底部导航、输入框和按钮是否仍然互相遮挡。
