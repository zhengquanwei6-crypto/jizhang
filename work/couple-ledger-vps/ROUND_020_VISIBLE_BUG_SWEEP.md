# Round 020 - Visible Bug Sweep

Date: 2026-07-03

Scope:
- Audited the live static app after Round 018/019 work instead of continuing with a new feature first.
- Reproduced a blocking issue where the onboarding overlay covered every page and intercepted clicks, including the home quick-entry input and ledger search.
- Added `cl-round-015` as a small production hotfix layer.
- Auto-dismissed the blocking onboarding tour by using the app's own skip button.
- Added focus restoration for quick-entry, batch-entry, command, search, chat, and common form controls when legacy overlays re-render while a field is active.
- Restored mobile browser zoom by removing `maximum-scale=1.0, user-scalable=no` from the viewport meta tag.
- Added touch/input CSS guards for inputs, textareas, selects, buttons, and dynamic ledger panels.
- Disabled scroll anchoring on dynamic top-of-page panels to reduce unwanted scroll jumps while swiping back upward.
- Updated static check/sync tooling to include `cl-round-015`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-015.css`
- `work/couple-ledger-vps/www/assets/cl-round-015.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`

Verification:
- `node --check work/couple-ledger-vps/www/assets/cl-round-015.js` passed.
- `powershell -ExecutionPolicy Bypass -File work/couple-ledger-vps/tools/check-static.ps1` passed and found rounds 001-015.
- Playwright reproduced the pre-fix bug: the onboarding `.overlay[data-v-c8822885]` intercepted clicks on the home quick-entry input.
- Production static check confirmed `cl-round-015.css/js` are referenced and the viewport zoom lock is gone.
- Production Playwright verified the onboarding overlay auto-dismisses and writes `cl_onboarded=1`.
- Production Playwright verified home one-sentence bookkeeping input keeps focus and retains `午餐28`.
- Production Playwright verified batch bookkeeping textarea and ledger search can receive text input.
- Production Playwright verified home and ledger scroll positions do not auto-drop after scrolling back upward.
- Test account was deleted after QA.

Plain-language summary:
- This round fixed a big "I tapped it but nothing happens" problem.
- The app had a full-screen beginner guide sitting above the real page, so the home one-sentence bookkeeping box and other page controls could not receive taps.
- Now that guide gets skipped automatically, text boxes are harder to lose focus from, and mobile scrolling should feel less like the page is pulling itself back.
