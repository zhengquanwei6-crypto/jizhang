# Round 018 - Duplicate Transaction Review

Date: 2026-07-03

## Scope

- Added `GET /api/transactions/duplicates`.
- Used the existing import duplicate rule: date, type, rounded amount, and note.
- Returned duplicate groups with a recommended keep item and removable item IDs.
- Added a Vue `/duplicates` review page.
- Added month filter, scope switch, metrics, duplicate group list, and manual delete action.
- Added mock API support for duplicate review testing.
- Did not deploy or modify `/var/www/couple-ledger`.

## Verification

- Backend targeted duplicate test: passed.
- Backend full suite: `19 passed`.
- Frontend build: passed.
- Playwright duplicate page render: passed.
- Playwright delete-confirm flow: passed.
- Playwright console: `0` errors.
- Mobile screenshot: no obvious overlap or unreadable controls at `390x844`.

## Plain-Language Summary

This round added a duplicate-bill checker.

It finds bills that look repeated, shows which one should probably be kept, and lets the user manually delete the extra one after confirmation.

This is useful after importing bills or using batch bookkeeping, because repeated entries can now be found and cleaned safely.
