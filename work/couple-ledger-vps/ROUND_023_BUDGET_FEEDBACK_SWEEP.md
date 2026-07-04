# Round 023 - Budget Feedback Sweep

Date: 2026-07-03

Scope:
- Continued the post-Round-018 visible bug sweep for save and feedback flows beyond the homepage.
- Checked production `/budgets`, `/ledger`, `/stats`, and `/mine` with a temporary QA account.
- Found a clear budget-page bug: after saving a total budget, the native budget section showed the new value, but the older Round 004 "budget thermometer" still showed stale numbers such as `总预算 ¥0` and a misleading remaining amount.
- Added static hotfix assets `cl-round-018.css` and `cl-round-018.js`.
- Hid the stale Round 004 budget thermometer on `/budgets`.
- Rendered a replacement real-time budget card in the same area, reading directly from `/api/budgets`.
- Refreshed the replacement card after total budget changes, category budget changes, month changes, and budget-plan actions.
- Updated static tooling so future sync/check steps include `cl-round-018`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-018.css`
- `work/couple-ledger-vps/www/assets/cl-round-018.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-018.css`
- `/var/www/couple-ledger/assets/cl-round-018.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local static syntax check passed for rounds 001-018.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-018.css/js` are referenced.
- Playwright verified the stale Round 004 budget card is hidden on `/budgets`.
- Playwright verified the new real-time budget card shows `总预算 ¥400`, `已用 ¥226`, `剩余 ¥174`, and category budget `餐饮 剩余 ¥82`.
- API verification matched the UI: total budget `400`, spent `226`, remaining `174`, dining category budget `100`, dining spent `18`, remaining `82`.
- Playwright verified `/ledger` displays the new `早餐R23` transaction.
- Playwright verified `/stats` reflects `226` spending and the dining category.
- Playwright verified `/mine` shows import/export controls and CSV export downloads `ledger_personal_2026-07-03.csv`.
- Mobile viewport checks reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.

Plain-language summary:
- 这一轮修的是预算页“数字打架”的问题。
- 以前你设置完预算后，页面下方已经显示新预算，但页面上方旧卡片还在显示旧数字，甚至会出现 `总预算 ¥0` 这种误导信息。
- 现在旧卡片会被隐藏，换成一张实时读取后台数据的新预算卡。
- 简单说：以前预算页像两个收银员各说各话；现在只保留一个会看最新账本的收银员，数字不会互相打架。

Next candidates:
- Round 024: audit ledger search/filter visibility on mobile and make the search entry easier to reach.
- Round 025: continue import preview and CSV import save-flow QA.
- Round 026: migrate stats page source work with real summary and trend data.
