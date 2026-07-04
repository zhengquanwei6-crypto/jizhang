# Round 030 - Reference UI Polish

## Goal

Use the supplied reference screenshots as the visual target for the mobile-first ledger experience, while keeping the existing production build stable.

## Changes

- Added `cl-round-030.css` to refresh the visible UI with a softer rose/coral primary system, clearer white cards, tighter mobile spacing, better bottom navigation, and safer floating action placement.
- Added `cl-round-030.js` to repair document title/meta copy, add bottom navigation to secondary pages, enhance login/register switching, and reinforce mobile input focus so the one-line ledger field can keep the keyboard open.
- Updated `index.html` to load Round 030 and switched the app theme color to the new primary color.
- Expanded `tools/check-static.ps1` so it validates all referenced round assets and lazy-loaded Vite bundles instead of assuming a fixed round range.
- Added local screenshot audit output and static server pid files to `.gitignore`.

## Verification

- Passed local static syntax/reference check for `cl-round-001` through `cl-round-024`, `cl-round-030`, `cl-interaction-hotfix.js`, and 125 static/lazy-loaded asset references.
- Passed Playwright mobile screenshot audit for login, home, ledger, budgets, accounts, couple, savings, and Jelly AI.
- Verified all audited pages report no horizontal overflow.
- Verified the homepage one-line ledger input keeps focus after click and accepts `午餐28`.
- The local WebSocket console errors are expected in the static-only audit server because the real backend WebSocket only exists on the VPS.

## Plain-Language Summary

这一轮就是把“看起来挤、颜色旧、按钮容易挡住、二级页面没底部导航、输入框不好点”的问题集中修一遍。用户打开页面后会更像参考图：底部导航更稳，按钮不贴着挤在一起，输入框更容易正常弹出键盘，登录页也更像一个正式产品。
