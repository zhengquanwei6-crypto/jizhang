# Couple Ledger Optimization Rounds

## Round 001 - Visible Interaction Layer

Date: 2026-07-03

Scope:
- Added a global quick-action dock for authenticated app pages.
- Added cross-route quick actions for new transaction, ledger search, budgets, stats, and recurring bills.
- Added pending-action handling so "new transaction" and "ledger search" survive route changes.
- Added a network status strip with refresh action for offline/recovered states.
- Added a recent-login email shortcut on the login page.
- Added mobile and desktop polish for focus states, touch targets, panel layering, and horizontal overflow prevention.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-001.css`
- `/var/www/couple-ledger/assets/cl-round-001.js`
- `C:\Users\Administrator\.codex\skills\couple-ledger-optimizer\SKILL.md`
- `C:\Users\Administrator\.codex\skills\forms\SKILL.md`
- `C:\Users\Administrator\.codex\skills\data-viz\SKILL.md`

Verification:
- `node --check work/current-www/assets/cl-round-001.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-001.js`
- `curl http://162.243.80.127:8080/assets/cl-round-001.css`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round001-qa.js`

QA coverage:
- Desktop title updates for ledger route.
- Quick-action dock renders with 5 actions.
- Ledger search action focuses the search input.
- New-transaction action dispatches `cl:open-tx-editor`.
- Offline status strip appears when the browser goes offline.
- No desktop horizontal overflow on ledger.
- Recent-login shortcut fills login email input.
- No mobile horizontal overflow on login.

Next candidates:
- Round 002: improve empty states and no-data calls to action across ledger, budgets, and stats.
- Round 003: improve transaction entry form speed and validation clarity if frontend source becomes available.
- Round 004: add richer chart/summary surfaces to stats and budget pages.

## Round 002 - Empty State Action System

Date: 2026-07-03

Scope:
- Added contextual action panels for ledger zero-data states.
- Added a filtered/no-results helper that can clear ledger search and return users to the ledger overview.
- Added a stats zero-data coach that explains what data unlocks trends and summaries.
- Added a recurring-bills zero-data coach with concrete examples for rent, subscriptions, and salary.
- Added a budget-page rescue state for blank or failed budget loading, with actions back to bookkeeping.
- Added a couple-space benefits card explaining what binding unlocks, plus copy/invite and personal-ledger paths.
- Fixed additional skill invocation reliability by converting `empty-state` and `clarify` from broken compatibility wrappers into standalone actionable skills.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-002.css`
- `/var/www/couple-ledger/assets/cl-round-002.js`
- `C:\Users\Administrator\.codex\skills\empty-state\SKILL.md`
- `C:\Users\Administrator\.codex\skills\clarify\SKILL.md`

Verification:
- `node --check work/current-www/assets/cl-round-002.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-002.js`
- `curl http://162.243.80.127:8080/assets/cl-round-002.css`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`

QA coverage:
- Round 001 quick dock still works.
- Ledger empty coach renders with primary CTA.
- Stats empty coach renders.
- Recurring empty coach renders.
- Budget rescue state renders.
- Couple benefits card renders.
- Mobile ledger coach is visible without horizontal overflow.
- Desktop ledger has no horizontal overflow.

Next candidates:
- Round 003: improve transaction entry speed and form clarity where possible from runtime hooks.
- Round 004: improve budget and stats pages with clearer summary surfaces and chart helper states.
- Round 005: improve mobile navigation density and route-specific quick actions.

## Round 003 - Transaction Entry Assist Layer

Date: 2026-07-03

Scope:
- Hid the global quick dock, bottom navigation, and ledger empty-state fixed CTA while the transaction sheet is open, reducing tap interference.
- Added a compact helper panel near the top of the transaction sheet to clarify the fastest entry order.
- Added a fixed completion assist bar that stays inside the mobile viewport, summarizes amount/category/note, and gives a clear zero-amount prompt.
- Added note suggestion chips for common daily spending notes: lunch, dinner, commute, coffee, daily goods, rent, and membership.
- Added last-transaction memory after successful saves and a "reuse previous transaction" card that restores type, category, account, and note.
- Added sheet scrolling and spacing polish so the original save button and keypad no longer fight with bottom navigation layers.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-003.css`
- `/var/www/couple-ledger/assets/cl-round-003.js`
- `work/pw-qa/round003-qa.js`
- `screens/round003-recon-tx-drawer.jpg`

Verification:
- `node --check work/current-www/assets/cl-round-003.js`
- `node --check work/pw-qa/round003-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-003.js`
- `curl http://162.243.80.127:8080/assets/cl-round-003.css`
- `curl http://162.243.80.127:8080/api/health`
- `systemctl status couple-ledger.service --no-pager -l`
- `node work/pw-qa/round003-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- Visual screenshot check: `screens/round003-recon-tx-drawer.jpg`

QA coverage:
- Transaction sheet adds the Round 003 body state.
- Quick dock and bottom navigation hide while the sheet is open.
- Helper copy and note shortcut chips render.
- Fixed assist bar stays in the mobile viewport.
- Zero amount produces a clear prompt instead of trying to save.
- Note chips fill the note field.
- Assist bar summarizes entered amount.
- Successful save stores last transaction metadata.
- Reuse card appears on the next entry and restores the saved note.
- Mobile transaction sheet has no horizontal overflow.
- Round 001 quick dock regression remains green.
- Round 002 empty-state regression remains green.

Next candidates:
- Round 004: improve stats and budget summary surfaces with clearer trend cards and chart-ready empty states.
- Round 005: improve transaction list scanning, grouping, and edit affordances.
- Round 006: improve mobile route navigation and route-specific quick actions.

## Round 004 - Stats And Budget Insight Panels

Date: 2026-07-03

Scope:
- Added a stats "income and expense quick read" panel with income, expense, balance, and savings-rate metrics.
- Added ranked category spending bars so users can compare where money went without opening chart tooltips.
- Added a compact recent-days spending trend strip for fast rhythm checking on mobile.
- Added a budget thermometer panel with total budget, spent, remaining, daily spend allowance, and percent-used ring.
- Added budget category risk bars that surface overspent and nearly-used-up categories first.
- Made the panels scope-aware for personal/couple mode and resilient to multiple backend response shapes.
- Adjusted panel mounting so the new insight panels stay visible near the top of stats and budget pages after Vue re-renders.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-004.css`
- `/var/www/couple-ledger/assets/cl-round-004.js`
- `work/pw-qa/round004-qa.js`
- `screens/round004-stats-mobile.jpg`
- `screens/round004-budget-mobile.jpg`

Verification:
- `node --check work/current-www/assets/cl-round-004.js`
- `node --check work/pw-qa/round004-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-004.js`
- `curl http://162.243.80.127:8080/assets/cl-round-004.css`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round004-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- `node work/pw-qa/round003-qa.js`
- Visual screenshot checks for stats and budget mobile pages.

QA coverage:
- Stats panel renders once.
- Stats headline, savings-rate metric, category ranking, and recent-day trend bars render.
- Budget panel renders once.
- Budget thermometer headline, 83% ring value, risk category, and overspend copy render.
- Stats and budget mobile pages have no horizontal overflow.
- Round 001 quick dock regression remains green.
- Round 002 empty-state regression remains green.
- Round 003 transaction-sheet regression remains green.

Next candidates:
- Round 005: improve transaction list scanning, grouping, and edit affordances.
- Round 006: improve mobile route navigation and route-specific quick actions.
- Round 007: improve account/category pickers with clearer defaults and quicker selection.

## Round 005 - Ledger List Scanning And Repeat Actions

Date: 2026-07-03

Scope:
- Added a ledger scan panel above the transaction list with transaction count, largest expense, today spend, monthly spend, and monthly income.
- Added a mobile filter compactor that collapses the chip/search filter block when a transaction list is present, keeping more of the ledger visible.
- Added a filter toggle so users can expand filters again without losing control.
- Added a "large expense" shortcut that activates the existing native `>=500` amount filter.
- Added row-level badges for large expenses, income, today, and account context.
- Added day-group badges such as large-expense and income markers for faster date scanning.
- Added a per-transaction "repeat entry" action that stores the row as the reusable previous transaction and opens the transaction drawer.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-005.css`
- `/var/www/couple-ledger/assets/cl-round-005.js`
- `work/pw-qa/round005-qa.js`
- `work/pw-qa/screens/round005-ledger-before-repeat.jpg`
- `screens/round005-ledger-mobile.jpg`

Verification:
- `node --check work/current-www/assets/cl-round-005.js`
- `node --check work/pw-qa/round005-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-005.js`
- `curl http://162.243.80.127:8080/assets/cl-round-005.css`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round005-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- `node work/pw-qa/round003-qa.js`
- `node work/pw-qa/round004-qa.js`
- Visual screenshot check for ledger mobile list.

QA coverage:
- Ledger scan panel renders once.
- Scan panel headline and summary metrics render.
- Mobile filters collapse by default when transactions exist.
- Filter toggle expands the native controls.
- Large-expense shortcut activates the native `>=500` filter.
- Large and income transaction rows are highlighted.
- Transaction and day-group badges render.
- Repeat buttons render on transaction rows.
- Repeat action stores reusable transaction metadata and opens the transaction sheet.
- Mobile ledger has no horizontal overflow.
- Round 001 quick dock regression remains green.
- Round 002 empty-state regression remains green after rerun.
- Round 003 transaction-sheet regression remains green.
- Round 004 stats/budget regression remains green.

Next candidates:
- Round 006: improve mobile route navigation and route-specific quick actions.
- Round 007: improve account/category pickers with clearer defaults and quicker selection.
- Round 008: improve recurring bills and due-bill handling with clearer next-payment cues.

## Round 006 - Route Compass And Scroll Recovery

Date: 2026-07-03

Scope:
- Added a route-aware compass panel near the page header for home, ledger, stats, budgets, recurring bills, couple space, pet, mine, accounts, categories, and Jelly AI.
- Added page-specific quick actions, including direct transaction entry, ledger search, budget/stat navigation, recurring-bill entry, invite-code copy, account/category access, and export entry points.
- Added a recent-route shortcut so users can jump back to the last useful page from the current page.
- Made the ledger search action expand the Round 005 collapsed filters before focusing the search box.
- Made the transaction-entry action integrate with the existing sheet and hide route guidance while the sheet is open.
- Added a mobile-friendly back-to-top button that appears after scrolling and avoids the transaction sheet.
- Restored compatibility for the Round 002 stats empty-state coach when the new route compass changes the stats page render timing.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-006.css`
- `/var/www/couple-ledger/assets/cl-round-006.js`
- `work/pw-qa/round006-qa.js`
- `screens/round006-route-compass-mobile.jpg`

Verification:
- `node --check work/current-www/assets/cl-round-006.js`
- `node --check work/pw-qa/round006-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-006.js`
- `curl http://162.243.80.127:8080/assets/cl-round-006.css`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round006-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- `node work/pw-qa/round003-qa.js`
- `node work/pw-qa/round004-qa.js`
- `node work/pw-qa/round005-qa.js`
- Visual screenshot check for the mobile route compass.

QA coverage:
- Home, ledger, stats, and mine route compass states render without horizontal overflow.
- Compass actions open the transaction sheet and hide guidance while the sheet is open.
- Ledger search expands collapsed filters and focuses the native search input.
- Recent-route chip appears and navigates back to a prior route.
- Back-to-top button appears after scrolling and returns the page to the top.
- Round 001 quick dock regression remains green.
- Round 002 empty-state regression remains green after the compatibility restoration.
- Round 003 transaction-sheet regression remains green.
- Round 004 stats/budget regression remains green.
- Round 005 ledger scanning regression remains green.

Next candidates:
- Round 007: improve account/category pickers with clearer defaults and quicker selection.
- Round 008: improve recurring bills and due-bill handling with clearer next-payment cues.
- Round 009: improve export/backup and restore guidance from the mine page.

## Round 007 - Account And Category Selection Assist

Date: 2026-07-03

Scope:
- Added an account default panel on the accounts page so users can choose the account that new bills should use first.
- Added a transaction-sheet selection assistant with visible amount, category, and account readiness states.
- Added account chips inside the transaction sheet that update the native account select without hunting through the form.
- Added category chips inside the transaction sheet for faster repeated category selection.
- Added a category speed panel with total, expense, and income counts, quick filters, search focus feedback, and one-tap category search chips.
- Added a more reliable cross-route "use default to record" path from the accounts page into the transaction sheet.
- Restored budget empty-state compatibility when the native budget view has no data and the Round 004 panel is the only visible budget surface.
- Fixed the stats page flicker reported after Round 007 by pinning the Round 004 "income and expense quick read" panel below the Round 006 stats compass instead of letting both panels compete for the same header insertion point.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-007.css`
- `/var/www/couple-ledger/assets/cl-round-007.js`
- `/var/www/couple-ledger/assets/cl-round-004.js`
- `work/pw-qa/round007-qa.js`

Verification:
- `node --check work/current-www/assets/cl-round-007.js`
- `node --check work/current-www/assets/cl-round-004.js`
- `node --check work/pw-qa/round007-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-004.js`
- `curl http://162.243.80.127:8080/assets/cl-round-007.js`
- `curl http://162.243.80.127:8080/assets/cl-round-007.css`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round007-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- `node work/pw-qa/round003-qa.js`
- `node work/pw-qa/round004-qa.js`
- `node work/pw-qa/round005-qa.js`
- `node work/pw-qa/round006-qa.js`

QA coverage:
- Account default panel renders and saves a default account.
- Opening a new bill from the accounts page lands in the transaction sheet with the default account applied.
- Transaction-sheet category and account chips render, update native controls, and keep mobile layout free of horizontal overflow.
- The sheet can update the saved default account.
- Category speed panel renders, filters income/expense sections, highlights the search input, fills category search from a chip, and avoids horizontal overflow.
- Stats compass remains above the Round 004 income/expense quick-read panel across repeated samples, fixing the visible flicker/reordering issue.
- Round 001 quick dock regression remains green.
- Round 002 empty-state regression remains green after the budget compatibility restoration.
- Round 003 transaction-sheet regression remains green.
- Round 004 stats/budget regression remains green.
- Round 005 ledger scanning regression remains green.
- Round 006 route compass regression remains green.

Next candidates:
- Round 008: improve recurring bills and due-bill handling with clearer next-payment cues.
- Round 009: improve export/backup and restore guidance from the mine page.
- Round 010: improve stats period switching and comparison cues.

## Round 008 - Recurring Due Desk And Bill Filters

Date: 2026-07-03

Scope:
- Added a recurring-bill "due desk" below the route compass with pending, overdue, this-week, and pending-amount metrics.
- Added a next-bill preview so the most urgent fixed income/expense is visible without scanning the whole list.
- Added quick filters for all, due, overdue, this week, income, and expense recurring bills.
- Added user-facing actions for processing the first due bill, focusing this week's bills, adding a recurring bill, and opening the ledger.
- Added due/status/type/account badges to native recurring bill cards and a short urgent-note line inside the native due card.
- Fixed recurring-page mobile overflow by constraining bill cards, due cards, preset chips, and button rows inside the viewport.
- Tightened the new "process first" action so it cannot accidentally trigger the native weekly batch-entry confirmation.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-008.css`
- `/var/www/couple-ledger/assets/cl-round-008.js`
- `work/pw-qa/round008-qa.js`
- `work/pw-qa/screens/round008-recurring-mobile.jpg`

Verification:
- `node --check work/current-www/assets/cl-round-008.js`
- `node --check work/pw-qa/round008-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-008.css`
- `curl http://162.243.80.127:8080/assets/cl-round-008.js`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round008-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- `node work/pw-qa/round003-qa.js`
- `node work/pw-qa/round004-qa.js`
- `node work/pw-qa/round005-qa.js`
- `node work/pw-qa/round006-qa.js`
- `node work/pw-qa/round007-qa.js`
- Visual screenshot check for the recurring mobile page.

QA coverage:
- Due desk renders once and stays stable across repeated samples.
- Pending count and pending amount summarize mocked due bills correctly.
- Filter chips and action buttons render with mobile-safe wrapping.
- Native recurring bill cards receive status/type badges.
- Native due card receives an urgent next-bill note.
- Overdue, income, all, and this-week filters work.
- The "process first" action gives feedback without opening the weekly batch confirmation.
- Recurring page remains free of horizontal overflow before and after filtering.
- Round 001-007 regressions remain green, including the Round 007 stats-order and action-button stacking checks.

Next candidates:
- Round 009: improve export/backup and restore guidance from the mine page.
- Round 010: improve stats period switching and comparison cues.
- Round 011: improve recurring bill creation/editing forms with clearer presets and validation feedback.

## Round 009 - Data Backup Desk And Import Surface Guard

Date: 2026-07-03

Scope:
- Added a mine-page backup desk with transaction, account, category, recurring-bill, oldest-record, and last-backup signals.
- Added backup actions for CSV export, bill import, checklist copy, and status refresh.
- Added native mine-page backup tags so the existing account summary, backup reminder, and import/export notes are easier to scan.
- Hid the quick dock and route-top button while import/sheet overlays are open.
- Fixed the transaction assistant so it only appears on the real new-bill sheet, not on import or unrelated sheets.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-003.js`
- `/var/www/couple-ledger/assets/cl-round-006.js`
- `/var/www/couple-ledger/assets/cl-round-009.css`
- `/var/www/couple-ledger/assets/cl-round-009.js`
- `work/pw-qa/round009-qa.js`

Verification:
- `node --check work/current-www/assets/cl-round-009.js`
- `node --check work/pw-qa/round009-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-009.css`
- `curl http://162.243.80.127:8080/assets/cl-round-009.js`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round009-qa.js`
- `node work/pw-qa/round001-qa.js`
- `node work/pw-qa/round002-qa.js`
- `node work/pw-qa/round003-qa.js`
- `node work/pw-qa/round004-qa.js`
- `node work/pw-qa/round005-qa.js`
- `node work/pw-qa/round006-qa.js`
- `node work/pw-qa/round007-qa.js`
- `node work/pw-qa/round008-qa.js`

QA coverage:
- Backup desk renders once, metrics populate, and coverage checks/actions stay visible.
- Export records the backup timestamp and updates the fresh status.
- Copy and refresh keep the panel stable.
- Import action gives feedback without opening the transaction assistant.
- Route-top and quick dock stay hidden while import/sheet surfaces are open.
- Mine page stays free of horizontal overflow.

Next candidates:
- Round 010: improve AI-assisted budget, savings, and spending planning.
- Round 011: add Excel bill import support and stronger import preview.
- Round 012: improve budget editing forms and category allocation.

## Round 010 - Qian Xiaocan Money Action Assistant

Date: 2026-07-03

Scope:
- Added the "钱小参" one-sentence AI money-action assistant on AI, budget, and stats pages.
- Added backend `/api/ai-extra/money-action` planning with deterministic support for monthly spending limit, monthly savings, category budget drafts, fixed-bill-aware spending plans, and 7-day meal suggestions.
- Added `apply=true` support so confirmed drafts write to monthly budgets, category budgets, and savings plans.
- Connected the existing savings-plan router by adding its schema, table migration, main router mount, and a looser monthly-saving validation.
- Added a compact frontend panel with month selector, one-sentence command input, quick chips, generate/apply actions, result metrics, spending plan, meal plan, suggestions, loading/error/success states, and responsive layout.
- Stabilized backend tests by matching feedback form submission format and clearing test-only rate-limit buckets between tests.

Files:
- `/opt/couple-ledger/app/db.py`
- `/opt/couple-ledger/app/main.py`
- `/opt/couple-ledger/app/schemas.py`
- `/opt/couple-ledger/app/routers/ai_extra.py`
- `/opt/couple-ledger/app/routers/savings_plan.py`
- `/opt/couple-ledger/tests/conftest.py`
- `/opt/couple-ledger/tests/test_api.py`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-010.css`
- `/var/www/couple-ledger/assets/cl-round-010.js`
- `work/pw-qa/round010-qa.js`

Verification:
- `python -m py_compile work/ai_extra.py work/schemas.py work/db.py work/main.py work/savings_plan.py work/test_api.py`
- `PYTHONPATH=. .venv/bin/pytest tests/test_api.py -k 'ai_money_action or ai_chat_query_fallback or budget_progress_capped' -q`
- `PYTHONPATH=. .venv/bin/pytest -q`
- `systemctl restart couple-ledger.service`
- `systemctl is-active couple-ledger.service`
- `curl http://127.0.0.1:8788/api/health`
- `curl http://127.0.0.1:8080/api/health`
- `curl http://162.243.80.127:8080/api/health`
- `node --check work/current-www/assets/cl-round-010.js`
- `node --check work/pw-qa/round010-qa.js`
- `node work/pw-qa/round010-qa.js`
- `node work/pw-qa/round006-qa.js`
- `node work/pw-qa/round009-qa.js`

QA coverage:
- Backend money-action generates a plan from "budget 5000, save 2000, meal plan" and does not apply by default.
- Backend apply writes the total budget, category budgets, and savings plan.
- Savings-plan API is mounted and returns the applied monthly amount.
- Money assistant panel renders once on mobile and desktop.
- Quick chip, generate, result metrics, 7-day meal plan, apply action, and applied badge all work.
- Mobile and desktop layouts avoid horizontal overflow.
- Round 006 route compass and Round 009 backup desk regressions remain green.

Next candidates:
- Round 011: add Excel bill import support and import preview accuracy.
- Round 012: improve budget editing and category allocation controls.
- Round 013: add AI plan history and side-by-side before/after budget comparison.

## Round 011 - Excel Bill Import And Preview Desk

Date: 2026-07-03

Scope:
- Added Excel `.xlsx` bill import support through `/api/data/import/excel` and the more general `/api/data/import/bills` endpoint.
- Kept the existing `/api/data/import/csv` endpoint compatible while allowing the shared CSV/XLSX import pipeline.
- Added stronger field detection for Chinese and English headers including date, amount, type, category, note, account_id, split_type, paid_by, and attributed_to.
- Added Excel date, numeric amount, currency text, negative amount, and generic income/expense parsing.
- Added dry-run previews for imported rows with count, preview rows, imported, skipped, filename, and detected format.
- Improved imported-account behavior by using `账单导入`, while still reusing the older `CSV导入` account if it exists.
- Preserved original account assignment when a valid `account_id` from an exported sheet belongs to the current ledger.
- Added a mine-page Excel import assistant with file picker, preview, confirm import, duplicate skip feedback, copyable table header, and mobile-safe result rows.
- Redirected the Round 009 import action to the new Excel import assistant instead of the older import surface.

Files:
- `/opt/couple-ledger/app/routers/import_export.py`
- `/opt/couple-ledger/tests/test_api.py`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-011.css`
- `/var/www/couple-ledger/assets/cl-round-011.js`
- `work/pw-qa/round009-qa.js`
- `work/pw-qa/round011-qa.js`

Verification:
- `python -m py_compile work/import_export.py work/test_api.py`
- `PYTHONPATH=. .venv/bin/pytest tests/test_api.py -k 'excel_bill_import or feedback_submit or ai_money_action' -q`
- `PYTHONPATH=. .venv/bin/pytest -q`
- `systemctl restart couple-ledger.service`
- `systemctl is-active couple-ledger.service`
- `curl http://127.0.0.1:8788/api/health`
- `curl http://127.0.0.1:8080/api/health`
- `curl http://162.243.80.127:8080/api/health`
- `node --check work/current-www/assets/cl-round-011.js`
- `node --check work/pw-qa/round011-qa.js`
- `node work/pw-qa/round011-qa.js`
- `node work/pw-qa/round009-qa.js`
- `node work/pw-qa/round010-qa.js`

QA coverage:
- Backend Excel preview reads `.xlsx`, detects two rows, parses date/type/category/amount/note, and imports nothing during dry run.
- Backend Excel commit imports rows, updates the import account balance, and skips duplicate rows on repeated import.
- Mine-page Excel import panel renders once on mobile and desktop.
- File selection enables preview, preview sends multipart dry-run requests, and confirm import sends the final request.
- Preview metrics and rows render with income/expense distinctions.
- Import result shows imported and skipped counts.
- Round 009 import action now opens the Excel assistant and does not open the legacy import sheet or transaction assistant.
- Mobile and desktop layouts avoid horizontal overflow.
- Round 010 money assistant regression remains green.

Next candidates:
- Round 012: improve budget editing and category allocation controls.
- Round 013: add AI plan history and side-by-side before/after budget comparison.
- Round 014: improve ledger search and duplicate cleanup after imports.

## Round 012 - Homepage One-Sentence Ledger Entry

Date: 2026-07-03

Scope:
- Replaced the unverified budget allocation enhancement with a homepage-first one-sentence bookkeeping entry.
- Added `/api/ai/quick-transaction`, which always performs local rule parsing first and only attempts LLM parsing when the text is complex and the AI switch is enabled.
- Added `AiQuickTransactionRequest` with `text`, `scope`, and `ai_enabled` so the UI switch can explicitly control manual/local vs AI-assisted parsing.
- Improved rule parsing for amount, income/expense direction, common Chinese categories, relative dates such as yesterday/tomorrow, Chinese amount words, and multi-amount complexity detection.
- Added a homepage top panel with AI toggle, quick chips, one-line input, editable draft fields, account selection, and confirm-to-create transaction.
- Kept the flow user-visible and non-security focused: the user can enter a sentence, review/edit the draft, then create the transaction in one compact surface.
- Replaced the Round 012 Playwright QA with coverage for the new homepage quick-entry flow on mobile and desktop.

Files:
- `/opt/couple-ledger/app/routers/ai.py`
- `/opt/couple-ledger/app/schemas.py`
- `/opt/couple-ledger/tests/test_api.py`
- `/var/www/couple-ledger/assets/cl-round-012.css`
- `/var/www/couple-ledger/assets/cl-round-012.js`
- `work/pw-qa/round012-qa.js`

Verification:
- `python -m py_compile work/ai.py work/schemas.py work/test_api.py`
- `node --check work/current-www/assets/cl-round-012.js`
- `node --check work/pw-qa/round012-qa.js`
- `cd /opt/couple-ledger && .venv/bin/python -m py_compile app/routers/ai.py app/schemas.py tests/test_api.py`
- `cd /opt/couple-ledger && PYTHONPATH=. .venv/bin/pytest tests/test_api.py -k ai_quick_transaction -q`
- `cd /opt/couple-ledger && PYTHONPATH=. .venv/bin/pytest -q`
- `systemctl restart couple-ledger.service`
- `systemctl is-active couple-ledger.service`
- `curl http://127.0.0.1:8788/api/health`
- `curl http://127.0.0.1:8080/api/health`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round012-qa.js`

QA coverage:
- Backend quick transaction parses manual mode with AI off.
- Backend quick transaction parses local mode with AI on for simple income and expense text.
- Backend flags multi-amount input as complex and requiring review when no LLM is configured.
- Homepage quick-entry panel renders once on mobile and desktop.
- AI toggle defaults on and can switch to manual mode.
- One-sentence parse sends the expected `ai_enabled` flag.
- Editable draft fields render amount, category, date, account, and note.
- Confirm action creates a transaction with the edited amount and selected account.
- Draft clears after save and success feedback remains visible.
- Mobile and desktop layouts avoid horizontal overflow.

Next candidates:
- Round 013: add quick-entry history and repeat-last transaction shortcuts.
- Round 014: improve ledger search and duplicate cleanup after imports.
- Round 015: add AI plan history and side-by-side before/after budget comparison.

## Round 013 - Quick Entry Reuse And Recent Templates

Date: 2026-07-03

Scope:
- Added a homepage `快捷复用` panel directly below the one-sentence bookkeeping entry.
- Reads recent personal/couple transactions from the existing transactions API and turns them into one-tap reuse cards.
- Adds dynamic common templates based on recent transaction category, note, amount, and type.
- Clicking a reuse card or template now fills the Round 012 one-sentence entry and immediately parses an editable draft.
- After confirming a repeated draft, the saved transaction is added to the reuse list immediately without waiting for a full page refresh.
- Added a refresh action, empty/loading states, and mobile-safe layout for the reuse panel.
- Hardened Round 012 ordering so the one-sentence entry and reuse panel stay above the Round 006 homepage compass.

Files:
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-012.js`
- `/var/www/couple-ledger/assets/cl-round-013.css`
- `/var/www/couple-ledger/assets/cl-round-013.js`
- `work/pw-qa/round013-qa.js`

Verification:
- `node --check work/current-www/assets/cl-round-012.js`
- `node --check work/current-www/assets/cl-round-013.js`
- `node --check work/pw-qa/round013-qa.js`
- `curl http://162.243.80.127:8080/`
- `curl http://162.243.80.127:8080/assets/cl-round-013.js`
- `curl http://162.243.80.127:8080/api/health`
- DOM order check: Round 012, Round 013, then Round 006 after the homepage header.
- `node work/pw-qa/round012-qa.js`
- `node work/pw-qa/round013-qa.js`

QA coverage:
- Reuse panel renders once on mobile and desktop.
- Recent items render from `/api/transactions`.
- Common templates render from recent transactions.
- Reuse button fills the Round 012 one-sentence entry.
- Reuse action triggers parsing and prepares an editable draft.
- Saving a repeated draft sends the transaction create request with the edited amount.
- Newly saved transaction appears immediately in the reuse list.
- Refresh refetches recent transactions.
- Round 012 remains stable after the ordering guard.
- Mobile and desktop layouts avoid horizontal overflow.

Next candidates:
- Round 014: add ledger duplicate cleanup and smarter import review.
- Round 015: add quick-entry batch mode for multiple simple lines.
- Round 016: add AI plan history and side-by-side before/after budget comparison.

## Round 014 - Batch One-Sentence Bookkeeping

Date: 2026-07-03

Scope:
- Added `/api/ai/quick-transactions` for multi-line one-sentence bookkeeping.
- Reused the existing local-first/LLM-if-complex quick parsing logic for each line.
- Added backend summary totals for parsed count, ready rows, review rows, income, and expense.
- Added a homepage `批量记账` panel below quick reuse.
- Users can paste several lines, generate editable drafts, pick a default account, edit amount/type/category/date/note, exclude rows, and confirm selected rows.
- Saved batch rows dispatch the same reuse event used by Round 013, so newly created transactions immediately become reusable.
- Extended homepage ordering so Round 012, Round 013, Round 014, and Round 006 remain in a stable user-first order.

Files:
- `/opt/couple-ledger/app/routers/ai.py`
- `/opt/couple-ledger/app/schemas.py`
- `/opt/couple-ledger/tests/test_api.py`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-012.js`
- `/var/www/couple-ledger/assets/cl-round-014.css`
- `/var/www/couple-ledger/assets/cl-round-014.js`
- `work/pw-qa/round014-qa.js`

Verification:
- `python -m py_compile work/ai.py work/schemas.py work/test_api.py`
- `node --check work/current-www/assets/cl-round-014.js`
- `node --check work/pw-qa/round014-qa.js`
- `cd /opt/couple-ledger && .venv/bin/python -m py_compile app/routers/ai.py app/schemas.py tests/test_api.py`
- `cd /opt/couple-ledger && PYTHONPATH=. .venv/bin/pytest tests/test_api.py -k "ai_quick_transaction" -q`
- `cd /opt/couple-ledger && PYTHONPATH=. .venv/bin/pytest -q`
- `systemctl restart couple-ledger.service`
- `systemctl is-active couple-ledger.service`
- `curl http://127.0.0.1:8788/api/health`
- `curl http://127.0.0.1:8080/api/health`
- `curl http://162.243.80.127:8080/api/health`
- `node work/pw-qa/round012-qa.js`
- `node work/pw-qa/round013-qa.js`
- `node work/pw-qa/round014-qa.js`
- DOM order check: Round 012, Round 013, Round 014, then Round 006 after the homepage header.

QA coverage:
- Backend batch quick parser handles three simple lines and returns correct income/expense totals.
- Backend batch quick parser rejects empty input.
- Batch panel renders once on mobile and desktop.
- Sample text fills the multi-line textarea.
- Batch parse sends the expected text to `/api/ai/quick-transactions`.
- Three editable draft rows render with summary metrics.
- Edited amount is saved.
- Unchecked rows are skipped.
- Selected default account is applied to saved transactions.
- Saved rows are visibly marked.
- Round 012 and Round 013 homepage flows remain green.
- Mobile and desktop layouts avoid horizontal overflow.

Next candidates:
- Round 015: add duplicate detection and cleanup after imports/batch entry.
- Round 016: add batch preset memory and custom quick templates.
- Round 017: add AI plan history and side-by-side before/after budget comparison.

## Round 000 - Execution Baseline and Skill Setup

Date: 2026-07-03

Note:
- This is a setup round and does not count toward the 100 product optimization rounds.

Scope:
- Installed and validated high-quality skills for frontend design, web app testing, spreadsheet handling, React performance, UI audits, component composition, view transitions, and writing.
- Rebuilt the project-specific `couple-ledger-optimizer` skill under `C:\Users\Administrator\.codex\skills`.
- Added a reusable preflight script at `couple-ledger-optimizer/scripts/ledger-preflight.ps1`.
- Verified the working SSH path and recorded the preferred key.
- Built a local execution workspace at `work/couple-ledger-vps`.
- Synced backend source/tests and the current static frontend baseline needed for migration planning.

Verification:
- All newly installed skills passed `quick_validate.py` with `PYTHONUTF8=1`.
- `couple-ledger-optimizer` passed `quick_validate.py`.
- Preflight public health returned `{"status":"ok"}`.
- Static entry includes `cl-round-001` through `cl-round-014`.
- `ssh couplespace-vps` connects with `C:\Users\Administrator\Desktop\id_ed25519`.
- `couple-ledger.service` is `active`.
- Full backend tests on VPS: `18 passed`.
- Local syntax check passed for every `cl-round-001.js` through `cl-round-014.js`.

Next candidates:
- Round 015: formalize deployment/QA fast loop and duplicate cleanup discovery.
- Round 016: create the frontend source skeleton or adopt a discovered canonical source path.
- Round 017: begin migrating static overlay behavior into source-owned modules.

## Round 015 - Fast Deploy Loop and Duplicate Cleanup Discovery

Date: 2026-07-03

Scope:
- Added local tooling to make future rounds faster and less error-prone.
- Added a repeatable static syntax check for all `cl-round-001` through `cl-round-014` scripts.
- Added a local preflight wrapper that checks public health, static overlay presence, SSH, service activity, static syntax, and backend pytest.
- Added a targeted VPS sync script for backend source/tests and selected static assets.
- Added a static deploy helper that backs up `index.html` before replacement and verifies public health after upload.
- Audited the current import duplicate skip behavior and transaction delete path before building a user-facing cleanup feature.

Files:
- `work/couple-ledger-vps/tools/preflight.ps1`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `work/couple-ledger-vps/tools/deploy-static.ps1`
- `work/couple-ledger-vps/ROUND_015_FAST_LOOP.md`
- `/opt/couple-ledger/tools/*`
- `/opt/couple-ledger/ROUND_015_FAST_LOOP.md`

Discovery:
- Import duplicate skip already exists in `app/routers/import_export.py`.
- Current import duplicate key uses date, type, rounded amount, and note prefix.
- Category is not part of the existing import duplicate key.
- `DELETE /api/transactions/{id}` reverses account balance deltas before deletion, so cleanup can safely use the standard delete path after user confirmation.
- There is no dedicated duplicate candidate API or review UI yet.

Verification:
- `tools/check-static.ps1` passed.
- `tools/preflight.ps1` passed.
- Public health returned `{"status":"ok"}`.
- `ssh couplespace-vps` connected with `C:\Users\Administrator\Desktop\id_ed25519`.
- `couple-ledger.service` reported `active`.
- Backend tests on VPS: `18 passed`.
- All `cl-round-001.js` through `cl-round-014.js` passed `node --check`.

Next candidates:
- Round 016: create a formal Vue/Vite frontend source skeleton and migrate shared design tokens.
- Round 017: migrate the first low-risk overlay group from static scripts into source-owned Vue modules.
- Round 018: implement a duplicate cleanup API and review panel.

## Round 016 - Vue/Vite Frontend Source Skeleton

Date: 2026-07-03

Scope:
- Added a production-safe frontend source tree at `work/couple-ledger-vps/frontend`.
- Matched the discovered live stack direction by using Vue 3 and Vite instead of introducing React.
- Added TypeScript, Pinia, Vue Router, `@lucide/vue`, Day.js, design tokens, shared base styles, and source-owned app shell components.
- Added a reusable API client that keeps the current `/api` path and `cl_auth` localStorage session shape.
- Added route coverage for the current live paths: `/home`, `/ledger`, `/stats`, `/chat`, `/mine`, `/accounts`, `/budgets`, `/categories`, `/couple`, `/pet`, `/savings`, `/archives`, `/recurring`, `/jelly`, `/feedback`, `/admin`, `/login`, `/register`, `/reset-password`, and `/legal`.
- Added a local dev proxy for `/api` and `/ws` to `http://162.243.80.127:8080`.
- Added a lightweight SVG favicon so the new app opens without console noise.
- Kept `/var/www/couple-ledger` untouched; this round does not replace the live production static bundle.

Files:
- `work/couple-ledger-vps/frontend/package.json`
- `work/couple-ledger-vps/frontend/package-lock.json`
- `work/couple-ledger-vps/frontend/index.html`
- `work/couple-ledger-vps/frontend/vite.config.ts`
- `work/couple-ledger-vps/frontend/tsconfig.json`
- `work/couple-ledger-vps/frontend/public/favicon.svg`
- `work/couple-ledger-vps/frontend/src/*`
- `/opt/couple-ledger/frontend/*`

Dependency baseline:
- Vue: `3.5.39`
- Vite: `8.1.3`
- `@vitejs/plugin-vue`: `6.0.7`
- Pinia: `3.0.4`
- Vue Router: `4.6.4`
- `@lucide/vue`: `1.23.0`
- TypeScript: `6.0.3`
- `vue-tsc`: `3.3.6`
- Day.js: `1.11.21`

Verification:
- `npm.cmd install` completed with `0 vulnerabilities`.
- Replaced deprecated `lucide-vue-next` with current `@lucide/vue`.
- `npm.cmd run build` passed with TypeScript and Vite.
- Local dev server returned `200` at `http://127.0.0.1:5173/home`.
- Playwright snapshot verified `/login` renders.
- Playwright verified `/home` redirects to `/login?next=/home` while unauthenticated.
- Playwright console check reported `0` errors and `0` warnings after adding the favicon.

Next candidates:
- Round 017: migrate one low-risk visible page into the Vue source tree with real API data.
- Round 018: add duplicate candidate detection API and a review UI.
- Round 019: add source-owned quick/batch bookkeeping controls and retire the matching static overlay.

## Round 017 - Source-Owned Accounts Page

Date: 2026-07-03

Scope:
- Replaced the `/accounts` placeholder with a real Vue source page.
- Added live account loading from `GET /api/accounts?scope=...`.
- Added account metrics for net worth, active account count, top account, and attention count.
- Added account list cards with account kind, currency, opening balance, archived state, and balance color states.
- Added account structure grouping by account kind.
- Added manual refresh and a user-triggered balance recompute action through `POST /api/accounts/recompute?scope=...`.
- Added an archived-account toggle that sends `include_archived=true`.
- Added responsive list and empty-state styles for desktop and mobile.
- Added `frontend/scripts/mock-api.mjs` and `npm.cmd run mock-api` so future frontend rounds can verify page behavior with deterministic local data.
- Made the Vite API proxy target configurable with `VITE_API_PROXY_TARGET`.
- Kept `/var/www/couple-ledger` untouched; this round does not replace the live production static bundle.

Files:
- `work/couple-ledger-vps/frontend/src/views/AccountsView.vue`
- `work/couple-ledger-vps/frontend/src/router/index.ts`
- `work/couple-ledger-vps/frontend/src/types/api.ts`
- `work/couple-ledger-vps/frontend/src/styles/base.css`
- `work/couple-ledger-vps/frontend/scripts/mock-api.mjs`
- `work/couple-ledger-vps/frontend/package.json`
- `work/couple-ledger-vps/frontend/vite.config.ts`
- `work/couple-ledger-vps/frontend/README.md`
- `/opt/couple-ledger/frontend/*`

Verification:
- `npm.cmd run build` passed.
- Temporary mock API returned valid JSON for `GET /api/accounts?scope=personal`.
- Temporary Vite app with `VITE_API_PROXY_TARGET=http://127.0.0.1:18080` returned `200` at `/accounts`.
- Playwright verified `/accounts` renders with mock login state.
- Playwright verified account totals and list data render from mocked `GET /api/accounts`.
- Playwright verified `显示归档` updates the list from 2 accounts to 3 accounts and shows the archived badge.
- Playwright console check reported `0` errors.
- Mobile viewport `390x844` snapshot and screenshot showed no obvious overlap or unreadable controls.

Next candidates:
- Round 018: add duplicate candidate detection API and a review UI.
- Round 019: migrate source-owned quick/batch bookkeeping controls.
- Round 020: migrate the stats page with real summary and trend data.

## Round 018 - Duplicate Transaction Review

Date: 2026-07-03

Scope:
- Added `GET /api/transactions/duplicates` for safe duplicate candidate detection.
- Matched the existing import duplicate rule: date, type, rounded amount, and note.
- Returned grouped duplicate candidates with recommended keep ID, removable IDs, categories, confidence, reason, and serialized transactions.
- Kept cleanup explicit: the API does not auto-delete; the UI calls the existing `DELETE /api/transactions/{id}` only after user confirmation.
- Added backend coverage for detection, cleanup through the delete path, and account balance restoration after deletion.
- Added a source-owned Vue page at `/duplicates`.
- Added duplicate metrics, month filter, scope switch, candidate groups, recommended keep marker, and per-transaction delete action.
- Added a deterministic mock duplicate dataset to `frontend/scripts/mock-api.mjs`.
- Kept `/var/www/couple-ledger` untouched; this round does not replace the live production static bundle.

Files:
- `work/couple-ledger-vps/backend/app/routers/transactions.py`
- `work/couple-ledger-vps/backend/tests/test_api.py`
- `work/couple-ledger-vps/frontend/src/views/DuplicatesView.vue`
- `work/couple-ledger-vps/frontend/src/router/index.ts`
- `work/couple-ledger-vps/frontend/src/types/api.ts`
- `work/couple-ledger-vps/frontend/src/styles/base.css`
- `work/couple-ledger-vps/frontend/scripts/mock-api.mjs`
- `/opt/couple-ledger/app/routers/transactions.py`
- `/opt/couple-ledger/tests/test_api.py`
- `/opt/couple-ledger/frontend/*`

Verification:
- Local backend targeted test passed: `test_duplicate_candidates_and_cleanup_path`.
- Local backend full test suite passed: `19 passed`.
- Frontend `npm.cmd run build` passed.
- Mock API returned one duplicate group for July 2026.
- Playwright verified `/duplicates` renders the duplicate group and metrics.
- Playwright verified user confirmation delete flow removes the duplicate and refreshes the page to zero candidates.
- Playwright console check reported `0` errors.
- Mobile viewport screenshot at `390x844` showed no obvious overlap or unreadable controls.

Plain-language summary:
- This round added a duplicate-bill checker. It looks for bills that have the same date, type, amount, and note.
- It does not delete anything by itself. It shows the suspected duplicates, marks one as the one to keep, and lets the user manually delete the extra one.
- This helps after importing bills or using batch bookkeeping, because repeated entries can be found and cleaned without guessing.

Next candidates:
- Round 019: migrate source-owned quick/batch bookkeeping controls.
- Round 020: migrate the stats page with real summary and trend data.
- Round 021: add account create/edit/transfer forms to the source-owned accounts page.

## Round 019 - Source-Owned Quick and Batch Ledger Entry

Date: 2026-07-03

Scope:
- Replaced the `/ledger` placeholder with a real Vue source page.
- Added single-entry natural-language parsing through `POST /api/ai/quick-transaction`.
- Added batch parsing through `POST /api/ai/quick-transactions`.
- Added editable draft cards for type, amount, category, date, and note.
- Added per-draft save through `POST /api/transactions`.
- Added save-all-ready flow for batch drafts.
- Added metrics for draft count, saveable count, review count, and net amount.
- Added direct navigation from the ledger page to duplicate review.
- Expanded `frontend/scripts/mock-api.mjs` so the ledger page can be verified with deterministic parse and save responses.
- Fixed mobile grid behavior for `span-5` and `span-7` so ledger panels stack cleanly on small screens.
- Kept `/var/www/couple-ledger` untouched; this round does not replace the live production static bundle.

Files:
- `work/couple-ledger-vps/frontend/src/views/LedgerView.vue`
- `work/couple-ledger-vps/frontend/src/router/index.ts`
- `work/couple-ledger-vps/frontend/src/types/api.ts`
- `work/couple-ledger-vps/frontend/src/styles/base.css`
- `work/couple-ledger-vps/frontend/scripts/mock-api.mjs`
- `/opt/couple-ledger/frontend/*`

Verification:
- Frontend `npm.cmd run build` passed.
- Local backend full test suite passed: `19 passed`.
- Mock API passed Node syntax check.
- Playwright verified `/ledger` renders with mock login state.
- Playwright verified single-entry parse from `午餐28`.
- Playwright verified single-entry save updates the draft to `已入账`.
- Playwright verified batch parse for `午餐28`, `打车36`, and `工资8000到账`.
- Playwright verified save-all marks all three batch drafts as saved.
- Playwright console check reported `0` errors.
- Mobile viewport screenshot initially revealed a two-column overflow; the CSS was fixed and the follow-up screenshot showed clean single-column layout.

Plain-language summary:
- This round made the new ledger page actually usable.
- Users can type one sentence or multiple lines, let the system turn them into editable bill drafts, check them, and save them into the ledger.
- It also caught and fixed a mobile layout issue before the page ever reaches production.

Next candidates:
- Round 020: migrate the stats page with real summary and trend data.
- Round 021: add account create/edit/transfer forms to the source-owned accounts page.
- Round 022: add a production switch plan for source-built pages once enough key workflows are migrated.

## Round 020 - Visible Bug Sweep

Date: 2026-07-03

Scope:
- Paused the feature roadmap to inspect obvious live bugs after Round 018/019.
- Reproduced the home quick-entry input issue with Playwright: a full-screen onboarding overlay was intercepting pointer events.
- Confirmed the same overlay followed into other pages, including the ledger page, so the fix needed to be global rather than home-only.
- Added static hotfix assets `cl-round-015.css` and `cl-round-015.js`.
- Auto-dismissed the blocking onboarding tour through the app's own skip button.
- Added focus restoration for quick-entry, batch-entry, command, search, chat, and common form controls when legacy overlays re-render during typing.
- Removed the viewport zoom lock from `index.html`.
- Added touch/input CSS guards and disabled scroll anchoring on dynamic top-of-page panels to reduce unwanted upward-scroll bounce.
- Updated static tooling so future sync/check steps include `cl-round-015`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-015.css`
- `work/couple-ledger-vps/www/assets/cl-round-015.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-015.css`
- `/var/www/couple-ledger/assets/cl-round-015.js`

Verification:
- Local static syntax check passed for rounds 001-015.
- Playwright reproduced the pre-fix overlay interception bug.
- Production static check confirmed `cl-round-015.css/js` are referenced and `maximum-scale/user-scalable` are gone.
- Production health check returned `{"status":"ok"}`.
- Production Playwright verified the onboarding overlay auto-dismisses and writes `cl_onboarded=1`.
- Production Playwright verified the home one-sentence bookkeeping input keeps focus and retains `午餐28`.
- Production Playwright verified the batch bookkeeping textarea and ledger search can receive text input.
- Production Playwright verified home and ledger scroll positions do not auto-drop after scrolling back upward.
- Temporary QA account was deleted after verification.

Plain-language summary:
- This round fixed a very直接的点击问题：页面上有一层新手引导遮罩挡住了真正的按钮和输入框。
- 所以用户点首页“一句话记账”时，点到的不是输入框，输入法自然弹不出来。
- 现在这层遮罩会自动跳过，输入框也加了防丢焦保护，手机上滑动页面时也减少自动回弹/下滑。

Next candidates:
- Round 021: verify remaining page-level form bugs after the hotfix is live.
- Round 022: migrate the stats page with real summary and trend data.
- Round 023: add account create/edit/transfer forms to the source-owned accounts page.

## Round 021 - Page Form Bug Sweep

Date: 2026-07-03

Scope:
- Continued the visible bug sweep across live production pages, not just the homepage.
- Audited `/home`, `/ledger`, `/accounts`, `/categories`, `/budgets`, `/recurring`, `/stats`, `/mine`, `/couple`, `/pet`, and `/jelly` on a mobile viewport.
- Checked for remaining onboarding overlays, visible blocking overlays, horizontal overflow, console errors, and visible form controls.
- Tested key form flows: account creation sheet, category creation sheet, recurring bill creation, couple invite input, Jelly input, and profile nickname editing.
- Fixed the recurring page top shortcut: the route compass "添加周期" button was clicking itself instead of opening the real recurring bill form.
- Added static hotfix assets `cl-round-016.css` and `cl-round-016.js`.
- Kept the collapsed floating quick-action menu out of keyboard focus and screen-reader navigation.
- Added `aria-expanded`, `aria-controls`, and a changing label to the floating quick-action trigger.
- Added basic labels for recurring bill sheet fields that only had placeholders.
- Updated static tooling so future sync/check steps include `cl-round-016`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-016.css`
- `work/couple-ledger-vps/www/assets/cl-round-016.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-016.css`
- `/var/www/couple-ledger/assets/cl-round-016.js`

Verification:
- Local static syntax check passed for rounds 001-016.
- Production static check confirmed `cl-round-016.css/js` are referenced.
- Production health check returned `{"status":"ok"}` and service is `active`.
- Playwright page audit found no onboarding overlay, no modal blocker, and no horizontal overflow on the checked main routes.
- Playwright verified account creation, category creation, couple invite, Jelly input, and profile nickname inputs can focus and retain text.
- Playwright reproduced the recurring route shortcut bug before the fix.
- Playwright verified the recurring "添加周期" route shortcut now opens the recurring bill sheet.
- Playwright verified collapsed floating quick actions are `inert`, `aria-hidden`, and `tabIndex=-1`; opening the menu restores access.
- Playwright console check reported 0 errors.

Plain-language summary:
- This round checked more pages, not just the homepage.
- The biggest real bug found was on the cycle-bill page: the top "添加周期" shortcut looked clickable, but it was actually clicking itself, so the add form did not open.
- Now that shortcut opens the right form.
- The floating shortcut menu is also cleaner: when it is closed, hidden buttons will not accidentally get focus or confuse accessibility tools.

Next candidates:
- Round 022: continue page-level bug checks for save flows and error states.
- Round 023: migrate the stats page with real summary and trend data.
- Round 024: add account create/edit/transfer forms to the source-owned accounts page.

## Round 022 - Save Refresh Bug Sweep

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

## Round 023 - Budget Feedback Sweep

Date: 2026-07-03

Scope:
- Continued the post-Round-018 visible bug sweep for save and feedback flows beyond the homepage.
- Checked production `/budgets`, `/ledger`, `/stats`, and `/mine` with a temporary QA account.
- Found a clear budget-page bug: after saving a total budget, the native budget section showed the new value, but the older Round 004 "budget thermometer" still showed stale numbers such as `总预算 ¥0` and a misleading remaining amount.
- Added static hotfix assets `cl-round-018.css` and `cl-round-018.js`.
- Hid the stale Round 004 budget thermometer on `/budgets`.
- Rendered a replacement real-time budget card in the same area, reading directly from `/api/budgets`.
- Refreshed the replacement card after total budget changes, category budget changes, month changes, and budget-plan actions.
- Updated static tooling so future sync/check steps include `cl-round-018`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-018.css`
- `work/couple-ledger-vps/www/assets/cl-round-018.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-018.css`
- `/var/www/couple-ledger/assets/cl-round-018.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local static syntax check passed for rounds 001-018.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-018.css/js` are referenced.
- Playwright verified the stale Round 004 budget card is hidden on `/budgets`.
- Playwright verified the new real-time budget card shows `总预算 ¥400`, `已用 ¥226`, `剩余 ¥174`, and category budget `餐饮 剩余 ¥82`.
- API verification matched the UI: total budget `400`, spent `226`, remaining `174`, dining category budget `100`, dining spent `18`, remaining `82`.
- Playwright verified `/ledger` displays the new `早餐R23` transaction.
- Playwright verified `/stats` reflects `226` spending and the dining category.
- Playwright verified `/mine` shows import/export controls and CSV export downloads `ledger_personal_2026-07-03.csv`.
- Mobile viewport checks reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.

Plain-language summary:
- 这一轮修的是预算页“数字打架”的问题。
- 以前你设置完预算后，页面下方已经显示新预算，但页面上方旧卡片还在显示旧数字，甚至会出现 `总预算 ¥0` 这种误导信息。
- 现在旧卡片会被隐藏，换成一张实时读取后台数据的新预算卡。
- 简单说：以前预算页像两个收银员各说各话；现在只保留一个会看最新账本的收银员，数字不会互相打架。

Next candidates:
- Round 024: audit ledger search/filter visibility on mobile and make the search entry easier to reach.
- Round 025: continue import preview and CSV import save-flow QA.
- Round 026: migrate stats page source work with real summary and trend data.

## Round 024 - Ledger Search Visibility Sweep

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

## Round 025 - Import Feedback Sweep

Date: 2026-07-03

Scope:
- Continued the visible bug sweep on the profile/import area after Round 024.
- Verified the Round 011 import assistant on production: file selection, dry-run preview, confirmed import, duplicate skip handling, profile summary refresh, and ledger visibility.
- Confirmed the core import flow works: a UTF-8 CSV with `date, amount, category, type, note` previewed 3 rows and imported them into the ledger.
- Confirmed the profile backup summary updates from 0 to 3 bills after import.
- Added static enhancement assets `cl-round-020.css` and `cl-round-020.js`.
- Added post-import next-step actions after a successful import: `查看账本`, `看统计`, and `继续导入`.
- Kept the enhancement scoped to the import completion state so it does not show before a file is imported or after leaving/reloading the page without an import result.
- Updated static tooling so future sync/check steps include `cl-round-020`.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-020.css`
- `work/couple-ledger-vps/www/assets/cl-round-020.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-020.css`
- `/var/www/couple-ledger/assets/cl-round-020.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local static syntax check passed for rounds 001-020.
- Production deploy health check returned `{"status":"ok"}`.
- Production static check confirmed `cl-round-020.css/js` are referenced.
- Playwright verified selecting `round25-import.csv` enables preview while keeping confirm import disabled until preview succeeds.
- Playwright verified preview shows 3 importable rows: `早餐R25`, `打车R25`, and `工资R25`.
- Playwright verified confirmed import returns `已导入 3 笔，跳过重复 0 笔`.
- API verification matched the UI: three transactions were created and a `账单导入` account balance became `4836.5`.
- Playwright verified `/ledger` shows all three imported rows.
- Playwright verified `/mine` summary shows 3 bills and 1 account after import.
- Playwright verified duplicate import handling shows skipped duplicates.
- Playwright verified the new Round 020 next-step panel appears after import and contains `查看账本`, `看统计`, and `继续导入`.
- Playwright verified clicking `查看账本` navigates to `/ledger` and the imported rows are visible.
- Mobile viewport checks reported no horizontal overflow.
- Playwright console and page error checks reported 0 errors.

Plain-language summary:
- 这一轮检查的是“导入账单”这条链路。
- CSV 文件能先预览，再确认导入；导入后账本里真的有这几笔，个人页的账单数量也会更新。
- 这轮额外加了一个导入完成后的下一步面板：可以直接去看账本、看统计，或者继续导入下一个文件。
- 简单说：以前导入完只告诉你成功；现在导入完还会顺手告诉你下一步该点哪里。

Next candidates:
- Round 026: improve ledger filter chips and active-filter clarity after mobile search.
- Round 027: add import error-state polish for invalid files and empty CSV uploads.
- Round 028: migrate stats page source work with real summary and trend data.

## Round 026 - Ledger Filter Clarity Sweep

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

## Round 027 - Import Error State Sweep

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

## Round 028 - Stats Quick Read Refresh Sweep

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

## Round 029 - Home Mobile Drawer Sweep

Date: 2026-07-03

Scope:
- Responded to the user-provided mobile screenshot showing three homepage issues.
- Fixed the homepage floating lightning button overlapping the bottom content and mobile navigation.
- Stabilized the Round 012 one-sentence bookkeeping input so tapping the field no longer causes the focused input to be replaced while the keyboard is opening.
- Added a compact homepage drawer so extra quick tools are collapsed by default and can be expanded only when the user wants them.
- Kept the quick-entry card visible, but hid secondary chips, helper blocks, empty-state actions, and repeated home widgets while the page is in compact mode.
- Added direct compact shortcuts for `账本`, `预算`, and `统计` inside the drawer area.
- Preserved the existing expanded homepage tools behind the `展开更多首页工具` toggle.
- Updated static check and sync scripts so `cl-round-023` is part of future static QA.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-012.js`
- `work/couple-ledger-vps/www/assets/cl-round-023.css`
- `work/couple-ledger-vps/www/assets/cl-round-023.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/sync-from-vps.ps1`
- `/var/www/couple-ledger/index.html`
- `/var/www/couple-ledger/assets/cl-round-012.js`
- `/var/www/couple-ledger/assets/cl-round-023.css`
- `/var/www/couple-ledger/assets/cl-round-023.js`

Verification:
- Preflight confirmed production health, SSH access, and `couple-ledger.service` active.
- Local `node --check` passed for `cl-round-012.js` and `cl-round-023.js`.
- Local static syntax check passed for rounds 001-023.
- Production deploy health check returned `{"status":"ok"}`.
- Playwright verified mobile and desktop homepage behavior with an authenticated temporary QA account.
- Playwright verified the bottom-right quick dock is hidden on `/home`, removing the screenshot overlap.
- Playwright verified the homepage starts in compact mode with the drawer text `展开更多首页工具`.
- Playwright verified the Round 012 card height is reduced in compact mode: 158px on mobile and 115px on desktop.
- Playwright verified the one-sentence input remains focused after tapping and waiting while empty.
- Playwright verified typing `午餐28` works and keeps focus in the input.
- Playwright verified the drawer expands the original repeat, batch, and compass tools when requested.
- Playwright verified mobile and desktop viewports have no horizontal overflow.
- Playwright console, page error, and bad response checks reported 0 unexpected errors.
- Temporary QA accounts were deleted through the account API, and old tokens returned 401 afterward.
- Playwright process cleanup check found no leftover browser processes.

Plain-language summary:
- 这一轮修的是用户截图里最明显的首页问题。
- 右下角金色闪电按钮以前会压住页面内容和底部导航，现在首页不再显示这个悬浮按钮，所以不会挡住操作。
- 顶部“一句话记账”以前点输入框时，页面可能正好重画，把输入框顶掉，手机输入法就会闪一下又收回去；现在输入框获得焦点时会被保护住，可以正常输入。
- 首页顶部工具以前全都摊开，占用空间太多；现在默认先收起来，只保留最重要的一句话记账和一个“展开更多首页工具”的抽屉按钮。
- 简单说：以前首页像一张桌子上什么都摆出来，还挡手；现在先把不急用的东西收到抽屉里，需要时再展开，输入框也不会一碰就跑。

Next candidates:
- Round 030: audit the home quick-entry parse/save flow after the drawer and focus fixes.
- Round 031: improve ledger amount, type, and date filter chips after the interrupted Round 029 filter work.
- Round 032: continue visible bug sweeps on accounts and budget pages.

## Round 030 - Reference UI Polish

Date: 2026-07-04

Scope:
- Followed the user's reference screenshots and continued the visible mobile-page bug sweep.
- Added `cl-round-030.css` with a rose/coral primary palette, lighter white cards, tighter spacing, refined bottom navigation, and safer floating action placement.
- Added `cl-round-030.js` to repair route titles/meta copy, add bottom navigation on secondary pages, enhance the login/register switcher, and reinforce mobile input focus.
- Kept the existing Round 023 homepage drawer behavior while restyling it to match the new visual system.
- Hid redundant floating action buttons on secondary pages where inline actions already exist, reducing content overlap.
- Updated the static checker so it validates actual referenced round assets and lazy-loaded Vite chunks.
- Added `tools/ui-audit.mjs` for repeatable mobile screenshot QA across login, home, ledger, budgets, accounts, couple, savings, and Jelly AI.

Files:
- `work/couple-ledger-vps/www/index.html`
- `work/couple-ledger-vps/www/assets/cl-round-030.css`
- `work/couple-ledger-vps/www/assets/cl-round-030.js`
- `work/couple-ledger-vps/www/assets/cl-interaction-hotfix.css`
- `work/couple-ledger-vps/www/assets/cl-interaction-hotfix.js`
- `work/couple-ledger-vps/tools/check-static.ps1`
- `work/couple-ledger-vps/tools/ui-audit.mjs`
- `work/couple-ledger-vps/ROUND_030_REFERENCE_UI_POLISH.md`
- `.gitignore`

Verification:
- Local static syntax/reference check passed for `cl-round-001` through `cl-round-024`, `cl-round-030`, `cl-interaction-hotfix.js`, and 125 static/lazy-loaded asset references.
- Playwright mobile screenshot audit passed for `/login`, `/home`, `/ledger`, `/budgets`, `/accounts`, `/couple`, `/savings`, and `/jelly`.
- Playwright reported no horizontal overflow on all audited pages.
- Playwright verified the homepage one-line ledger input remained focused after click and accepted `午餐28`.
- The only local console errors were expected WebSocket 404s from the static-only test server; production has the backend WebSocket route.

Plain-language summary:
- 这一轮修的是“页面看起来拥挤、颜色不统一、二级页底部导航缺失、右下角按钮挡内容、首页一句话记账输入不够稳”的问题。
- 现在整体颜色更接近参考图，主按钮和选中状态统一成粉橙色，卡片更轻，底部导航更稳定。
- 登录页增加了更明显的登录/注册切换；账户、预算、存钱、情侣空间、Jelly AI 等页面不会再被多余的右下角加号挡住。
- 最关键的是，脚本专门点了首页顶部“一句话记账”输入框，确认它能保持焦点并输入 `午餐28`。
- 简单说：以前像每个页面各修各的，有些地方还挡手；现在整体更像一个统一产品，输入框也更听话。

Next candidates:
- Round 031: check the quick-entry parse/save result states after input stability is confirmed.
- Round 032: continue page-by-page screenshots for transaction detail drawers, duplicate review, categories, and import/feedback.
- Round 033: migrate the most stable overlay behavior back into source-owned Vue components.
