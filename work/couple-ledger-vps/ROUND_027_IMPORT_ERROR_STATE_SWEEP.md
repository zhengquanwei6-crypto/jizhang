# Round 027 - Import Error State Sweep

Date: 2026-07-03

Scope:
- Continued the post-Round-018 visible bug sweep, this time on `/mine` import errors.
- Reproduced the issue where invalid CSV uploads only showed the backend English error `No valid transactions found in import file`.
- Added static hotfix assets `cl-round-022.css` and `cl-round-022.js`.
- Added a Chinese help panel under the import error state, explaining common causes: empty file, missing `amount`, or zero-only amounts.
- Added the required import columns directly in the UI: `date, amount, category, type, note`.
- Added a sample row: `2026-07-03,28,餐饮,expense,午餐`.
- Added quick actions for copying the standard header and clearing the failed file so the user can pick again.
- Kept confirm import disabled when no valid rows are detected, so bad files cannot be imported by mistake.
- Updated static tooling so future sync/check steps include `cl-round-022`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-022.css`
- `work/couple-ledger-vps/www/assets/cl-round-022.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-022.css`
- `/var/www/couple-ledger/assets/cl-round-022.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local `node --check` passed for `cl-round-022.js`.
- Local static syntax check passed for rounds 001-022.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-022.css/js` are referenced.
- Playwright verified `/mine` on mobile and desktop with an authenticated temporary QA account.
- Playwright verified empty CSV uploads show the new Chinese repair guide.
- Playwright verified missing-amount CSV uploads show the same repair guide.
- Playwright verified the guide includes the title, required columns, example row, copy-header action, and reselect-file action.
- Playwright verified confirm import stays disabled and no preview rows appear for invalid files.
- Playwright verified clearing the failed file hides the guide and returns the assistant to the waiting state.
- Mobile and desktop viewport checks reported no horizontal overflow.
- Page error checks reported 0 page errors; the only 400 responses were the expected invalid-import API rejections.
- Temporary QA account was deleted, and the old token returned 401 afterward.
- Playwright process cleanup check found no leftover browser processes.

Plain-language summary:
- 这一轮修的是“导入文件出错后，用户不知道该怎么改”的问题。
- 以前上传空 CSV 或缺少金额列的 CSV，页面只吐一句英文错误，普通用户看不懂，也不知道要补哪几列。
- 现在页面会直接用中文告诉你：文件没识别到账单、可能哪里错了、标准表头是什么，还给一行可照抄的示例。
- 简单说：以前像是只说“你错了”；现在会告诉你“错在哪、怎么改、点哪里继续”。

Next candidates:
- Round 028: continue the visible bug sweep on stats and summary pages, especially stale data and unclear empty states.
- Round 029: improve ledger amount/type/date filter chips after search clarity is stable.
- Round 030: audit home-page quick entry again after the recent input and scroll fixes.
