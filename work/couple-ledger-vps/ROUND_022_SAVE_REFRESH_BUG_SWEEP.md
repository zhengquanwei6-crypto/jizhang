# Round 022 - Save Refresh Bug Sweep

Date: 2026-07-03

Scope:
- Continued the post-Round-018 visible bug sweep across real save flows.
- Verified account creation, category creation, recurring bill creation, and home quick bookkeeping on production.
- Found a clear home-page bug: quick bookkeeping saved successfully and the backend balance changed, but the home summary, monthly count, and recent bills stayed stale.
- Added static hotfix assets `cl-round-017.css` and `cl-round-017.js`.
- After legacy quick/batch bookkeeping emits a save event on `/home`, the hotfix debounces briefly and refreshes the page so the home cards reload real data.
- Added a small non-blocking status toast after refresh: `账单已保存，首页数据已刷新`.
- Protected active text entry: if the user already started typing the next item, refresh waits briefly instead of immediately interrupting the input.
- Updated static tooling so future sync/check steps include `cl-round-017`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-017.css`
- `work/couple-ledger-vps/www/assets/cl-round-017.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-017.css`
- `/var/www/couple-ledger/assets/cl-round-017.js`

Verification:
- Local static syntax check passed for rounds 001-017.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-017.css/js` are referenced.
- Playwright verified the home one-sentence input accepts Chinese text `奶茶18`.
- Playwright verified quick parse creates a draft with amount `18`.
- Playwright verified save triggers the Round 017 refresh toast and the page remains on `/home`.
- Playwright verified refreshed home text includes `奶茶`, `午餐`, `本月结余 ¥-46.00`, `净资产 ¥154.00`, `本周共支出 ¥46.00 · 2 笔`, and recent bills are no longer empty.
- API verification matched the UI: latest transactions are `奶茶 18` and `午餐 28`, and the test account balance is `154`.
- Mobile viewport check reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.

Plain-language summary:
- 这一轮不是加新花样，而是专门查“点了保存之后，页面到底有没有真的变”。
- 我发现顶部一句话记账其实已经保存到后台了，账户余额也变了，但首页还显示旧数字，所以用户会以为没保存成功。
- 现在保存后首页会自动刷新数据，最近账单、净资产、本月笔数、本月支出都会变成最新的。
- 简单说：以前是“账记进去了，页面装作没看见”；现在是“账记进去后，首页马上跟着更新”。

Next candidates:
- Round 023: continue save/error-state checks on ledger, budget, stats, and import/export flows.
- Round 024: migrate stats page source work with real summary and trend data.
- Round 025: add account edit/transfer flows to the source-owned accounts page.
