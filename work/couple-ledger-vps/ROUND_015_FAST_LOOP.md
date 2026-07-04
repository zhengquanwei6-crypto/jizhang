# Round 015 Fast Loop And Duplicate Cleanup Discovery

Date: 2026-07-03

Purpose:
- Reduce repeated setup work before future rounds.
- Keep production changes safer by making sync, syntax checks, preflight, and static deployment repeatable.
- Record duplicate transaction cleanup findings before designing the user-facing cleanup feature.

Added local tools:
- `tools/preflight.ps1`: runs the project skill preflight, local static syntax checks, and backend pytest.
- `tools/check-static.ps1`: verifies `cl-round-001` through `cl-round-014` references and runs `node --check` on round scripts.
- `tools/sync-from-vps.ps1`: syncs backend source/tests and selected static assets from the VPS.
- `tools/deploy-static.ps1`: deploys selected static files with `index.html` backup and public health verification.

Duplicate cleanup discovery:
- Import duplicate skip already exists in `app/routers/import_export.py`.
- Current import duplicate key is date, type, rounded amount, and note prefix; category is not part of the existing duplicate key.
- Existing transaction delete endpoint reverses account balance deltas before deleting, so cleanup can safely use the standard delete route.
- There is no dedicated duplicate-candidate API or review UI yet.
- Best next product feature: a review-first duplicate cleanup panel that groups likely duplicates, lets the user keep one row per group, and deletes selected duplicates only after confirmation.

Suggested duplicate candidate shape:
- Group by `scope`, owner, `tx_date`, `type`, rounded `amount`, normalized `note`, and optionally `category`.
- Return groups with `group_id`, `reason`, `items`, `keep_id`, and `delete_candidates`.
- Never auto-delete. The frontend must require explicit confirmation.

Verification:
- Backend baseline before scripts: `18 passed`.
- All `cl-round-001.js` through `cl-round-014.js` passed `node --check`.
- Public health remained `{"status":"ok"}`.
