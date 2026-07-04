# Round 017 - Source-Owned Accounts Page

Date: 2026-07-03

## Scope

- Replaced the `/accounts` placeholder with a real Vue page.
- Connected the page to `GET /api/accounts?scope=...`.
- Added net worth, account count, top account, attention count, account list, archived toggle, and account-kind summary.
- Added a manual refresh button and a user-triggered balance recompute button.
- Added a local mock API script for future frontend verification.
- Made the Vite API proxy target configurable for mock testing.
- Did not deploy or modify `/var/www/couple-ledger`.

## Verification

- `npm.cmd run build`: passed.
- Mock API: returned valid account JSON.
- Mock Vite app: returned `200` at `/accounts`.
- Playwright: account page rendered with mock login state.
- Playwright: account list showed active accounts, then showed archived account after checking `显示归档`.
- Playwright console: `0` errors.
- Mobile screenshot: no obvious overlap or unreadable controls at `390x844`.

## Plain-Language Summary

This round turned the new source-code version of the account page from a placeholder into a real page.

It now asks the backend for account data, adds up balances, shows account cards, separates active and archived accounts, and gives a clear place to refresh or recalibrate balances.

The live public site was not replaced yet. This is the safe preparation step before switching production pages to the new source-built frontend.
