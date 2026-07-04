# Round 026 - Ledger Filter Clarity Sweep

Date: 2026-07-03

Scope:
- Continued the visible bug sweep on the ledger page after Round 024's search-entry fix.
- Rechecked mobile `/ledger` search behavior with a production QA account.
- Found a clear follow-up issue: after typing into the new Round 019 top search box, the native ledger search box also became visible, so users saw two search fields with the same value.
- Added static hotfix assets `cl-round-021.css` and `cl-round-021.js`.
- Hid the duplicate native search field while a Round 019 top-search keyword is active.
- Added a compact filter summary below the top search box, showing the active keyword and keeping a clear action nearby.
- Fixed the new summary `清空` action so it clears both the Round 019 visible search box and the native Vue search state.
- Kept the native search logic intact, so the existing backend keyword, amount, and filter requests still run.
- Updated static tooling so future sync/check steps include `cl-round-021`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-021.css`
- `work/couple-ledger-vps/www/assets/cl-round-021.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-021.css`
- `/var/www/couple-ledger/assets/cl-round-021.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local static syntax check passed for rounds 001-021.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-021.css/js` are referenced.
- Playwright reproduced the pre-fix issue: searching `R26` created two visible search inputs.
- Playwright verified the post-fix searched state has only one visible search input.
- Playwright verified the hidden native search still syncs the value and remains hidden.
- Playwright verified the new filter summary appears with `当前筛选：搜索「R26」`.
- Playwright verified `清空` clears both the visible Round 019 input and the native search value.
- Playwright verified amount search works: searching `64` shows the amount-64 result and hides the `3000` income row.
- Playwright verified clearing search restores the full ledger list.
- Playwright verified the filter summary and ledger search strip do not leak onto `/home`.
- Mobile viewport checks reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.

Plain-language summary:
- 这一轮修的是账本搜索后的“两个搜索框”问题。
- 上一轮把搜索框放到了账本顶部，但输入后页面原来的搜索框也会冒出来，用户会看到两个一样的输入框。
- 现在只保留顶部那个搜索框，并在下面显示一个清楚的“当前筛选”提示。
- 简单说：以前搜索后像有两个方向盘；现在只剩一个方向盘，旁边还告诉你正在按什么条件筛选。

Next candidates:
- Round 027: add import error-state polish for invalid files and empty CSV uploads.
- Round 028: migrate stats page source work with real summary and trend data.
- Round 029: improve ledger amount/type/date filter chips after search clarity is stable.
