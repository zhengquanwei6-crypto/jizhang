# Round 029 - Home Mobile Drawer Sweep

Date: 2026-07-03

Scope:
- Responded to the user-provided mobile screenshot showing three homepage issues.
- Fixed the homepage floating lightning button overlapping the bottom content and mobile navigation.
- Stabilized the Round 012 one-sentence bookkeeping input so tapping the field no longer causes the focused input to be replaced while the keyboard is opening.
- Added a compact homepage drawer so extra quick tools are collapsed by default and can be expanded only when the user wants them.
- Kept the quick-entry card visible, but hid secondary chips, helper blocks, empty-state actions, and repeated home widgets while the page is in compact mode.
- Added direct compact shortcuts for `账本`, `预算`, and `统计` inside the drawer area.
- Preserved the existing expanded homepage tools behind the `展开更多首页工具` toggle.
- Updated static check and sync scripts so `cl-round-023` is part of future static QA.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-012.js`
- `work/couple-ledger-vps/www/assets/cl-round-023.css`
- `work/couple-ledger-vps/www/assets/cl-round-023.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-012.js`
- `/var/www/couple-ledger/assets/cl-round-023.css`
- `/var/www/couple-ledger/assets/cl-round-023.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local `node --check` passed for `cl-round-012.js` and `cl-round-023.js`.
- Local static syntax check passed for rounds 001-023.
- Production deploy health check returned `{"status":"ok"}`.
- Playwright verified mobile and desktop homepage behavior with an authenticated temporary QA account.
- Playwright verified the bottom-right quick dock is hidden on `/home`, removing the screenshot overlap.
- Playwright verified the homepage starts in compact mode with the drawer text `展开更多首页工具`.
- Playwright verified the Round 012 card height is reduced in compact mode: 158px on mobile and 115px on desktop.
- Playwright verified the one-sentence input remains focused after tapping and waiting while empty.
- Playwright verified typing `午餐28` works and keeps focus in the input.
- Playwright verified the drawer expands the original repeat, batch, and compass tools when requested.
- Playwright verified mobile and desktop viewports have no horizontal overflow.
- Playwright console, page error, and bad response checks reported 0 unexpected errors.
- Temporary QA accounts were deleted through the account API, and old tokens returned 401 afterward.
- Playwright process cleanup check found no leftover browser processes.

Plain-language summary:
- 这一轮修的是用户截图里最明显的首页问题。
- 右下角金色闪电按钮以前会压住页面内容和底部导航，现在首页不再显示这个悬浮按钮，所以不会挡住操作。
- 顶部“一句话记账”以前点输入框时，页面可能正好重画，把输入框顶掉，手机输入法就会闪一下又收回去；现在输入框获得焦点时会被保护住，可以正常输入。
- 首页顶部工具以前全都摊开，占用空间太多；现在默认先收起来，只保留最重要的一句话记账和一个“展开更多首页工具”的抽屉按钮。
- 简单说：以前首页像一张桌子上什么都摆出来，还挡手；现在先把不急用的东西收到抽屉里，需要时再展开，输入框也不会一碰就跑。

Next candidates:
- Round 030: audit the home quick-entry parse/save flow after the drawer and focus fixes.
- Round 031: improve ledger amount, type, and date filter chips after the interrupted Round 029 filter work.
- Round 032: continue visible bug sweeps on accounts and budget pages.
