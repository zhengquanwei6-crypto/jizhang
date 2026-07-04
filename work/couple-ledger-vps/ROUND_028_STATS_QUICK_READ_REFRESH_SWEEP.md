# Round 028 - Stats Quick Read Refresh Sweep

Date: 2026-07-03

Scope:
- Continued the post-Round-018 visible bug sweep on `/stats` and the related budget quick-read overlay.
- Checked the stats API with a temporary QA account and seeded controlled July transactions.
- Verified the backend summary was correct before touching the frontend: income `3000`, expense `220`, and 4 transactions.
- Reproduced a visible product issue: the stats quick-read panel still showed the internal label `Round 004`, which is not meaningful to normal users.
- Updated `cl-round-004.js` directly instead of adding another overlay layer.
- Replaced the stats quick-read kicker with `本月统计`.
- Replaced the budget quick-read kicker with `实时预算`.
- Added short-lived cache handling for the legacy stats/budget quick-read data so it does not keep old monthly values for long.
- Added refresh triggers when a quick-entry save event fires, when the tab regains focus, and when the page returns from the background.
- Added a cache-busting query parameter for the legacy quick-read stats/budget API calls.

Files:
- `work/couple-ledger-vps/www/assets/cl-round-004.js`
- `/var/www/couple-ledger/assets/cl-round-004.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local `node --check` passed for `cl-round-004.js`.
- Local static syntax check passed for rounds 001-022.
- Production deploy health check returned `{"status":"ok"}`.
- Playwright verified `/stats` on mobile shows `本月统计` and no longer shows `Round 004`.
- Playwright verified `/stats` on desktop shows `本月统计` and no longer shows `Round 004`.
- Playwright verified mobile stats refreshed from expense `250` to `281` after adding a new transaction and refocusing the page.
- Playwright verified desktop stats refreshed from expense `281` to `312` after adding another new transaction and refocusing the page.
- Playwright verified `/budgets` quick-read shows `实时预算` and no longer shows `Round 004`.
- Mobile and desktop viewport checks reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.
- Temporary QA account was deleted, and the old token returned 401 afterward.

Plain-language summary:
- 这一轮修的是统计页里“露出开发编号”和“旧快读面板可能不够新鲜”的问题。
- 以前用户会在统计快读上看到 `Round 004`，这像施工标签，不像正式产品。
- 现在它显示成“本月统计”；预算快读也显示成“实时预算”。
- 另外，统计快读现在会更积极地重新拿最新数据，记完账或回到页面时更不容易看见旧数字。
- 简单说：以前像页面还挂着内部施工牌；现在换成了用户能懂的标题，并且数字刷新更跟手。

Next candidates:
- Round 029: audit ledger amount/type/date filter chips after search clarity is stable.
- Round 030: audit home-page quick entry again after recent input and scroll fixes.
- Round 031: continue visible bug sweeps on accounts and budget pages.
