# Round 021 - Page Form Bug Sweep

Date: 2026-07-03

Scope:
- Continued the post-Round-018/019 visible bug sweep across live production pages.
- Audited `/home`, `/ledger`, `/accounts`, `/categories`, `/budgets`, `/recurring`, `/stats`, `/mine`, `/couple`, `/pet`, and `/jelly` on a mobile viewport.
- Checked for remaining onboarding overlays, visible blocking overlays, horizontal overflow, console errors, and visible form controls.
- Tested key form flows: account creation sheet, category creation sheet, recurring bill creation, couple invite input, Jelly input, and profile nickname editing.
- Fixed the recurring page top shortcut: the route compass "添加周期" button was clicking itself instead of opening the real recurring bill form.
- Added `cl-round-016` to keep the collapsed floating quick-action menu out of keyboard focus and screen-reader navigation.
- Added `aria-expanded`, `aria-controls`, and a changing label to the floating quick-action trigger.
- Added basic labels for recurring bill sheet fields that only had placeholders.
- Updated static check/sync tooling to include `cl-round-016`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-016.css`
- `work/couple-ledger-vps/www/assets/cl-round-016.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`

Verification:
- Local static syntax check passed for rounds 001-016.
- Production static check confirmed `cl-round-016.css/js` are referenced.
- Production health returned `{"status":"ok"}` and service is `active`.
- Playwright page audit found no onboarding overlay, no modal blocker, and no horizontal overflow on the checked main routes.
- Playwright verified account creation, category creation, couple invite, Jelly input, and profile nickname inputs can focus and retain text.
- Playwright reproduced the recurring route shortcut bug before the fix.
- Playwright verified the recurring "添加周期" route shortcut now opens the recurring bill sheet.
- Playwright verified collapsed floating quick actions are `inert`, `aria-hidden`, and `tabIndex=-1`; opening the menu restores access.
- Playwright console check reported 0 errors.

Plain-language summary:
- This round checked more pages, not just the homepage.
- The biggest real bug found was on the cycle-bill page: the top "add cycle" shortcut looked clickable, but it was basically clicking itself, so the add form did not open.
- Now that shortcut opens the right form.
- The floating shortcut menu is also cleaner: when it is closed, hidden buttons will not accidentally get focus or confuse accessibility tools.
