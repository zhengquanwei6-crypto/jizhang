# Round 024 - Ledger Search Visibility Sweep

Date: 2026-07-03

Scope:
- Continued the visible bug sweep on the ledger page after Round 023.
- Reproduced a mobile ledger issue: the native ledger search input existed in the DOM but was `display:none` on initial page load.
- Confirmed users had to tap the route shortcut `查账本` before the search input became visible, which made search feel hidden.
- Added static hotfix assets `cl-round-019.css` and `cl-round-019.js`.
- Added a visible top search strip on `/ledger`.
- Synced the new visible search input into the native hidden ledger search input so the existing Vue search logic and API requests still run.
- Added a clear button and a filter button that opens the existing filter controls.
- Kept the search strip scoped to `/ledger` only so it does not leak onto `/home` or other pages.
- Updated static tooling so future sync/check steps include `cl-round-019`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-019.css`
- `work/couple-ledger-vps/www/assets/cl-round-019.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-019.css`
- `/var/www/couple-ledger/assets/cl-round-019.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local static syntax check passed for rounds 001-019.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-019.css/js` are referenced.
- Playwright reproduced the pre-fix state: native ledger search existed but had `display:none`.
- Playwright verified the new Round 019 ledger search strip is visible on initial `/ledger` load.
- Playwright verified typing `早餐R24` into the new search strip syncs the native search value to `早餐R24`.
- Playwright verified the ledger results filter correctly: `早餐R24` remains visible while `打车R24` and `奶茶R24` disappear.
- Playwright verified clearing search restores all three transactions.
- Playwright verified the Round 019 search strip does not appear on `/home`.
- Mobile viewport checks reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.

Plain-language summary:
- 这一轮修的是账本页“搜索入口藏起来”的问题。
- 以前账本页其实有搜索框，但一开始是隐藏的，用户要先点 `查账本` 才能看到。
- 现在账本页顶部直接有一个搜索条，打开账本就能搜备注、分类或金额。
- 简单说：以前搜索像放在抽屉里；现在搜索框直接摆在桌面上，输入后账单会马上按关键词筛选。

Next candidates:
- Round 025: continue import preview and CSV import save-flow QA.
- Round 026: improve ledger filter chips and active-filter clarity after mobile search.
- Round 027: migrate stats page source work with real summary and trend data.
