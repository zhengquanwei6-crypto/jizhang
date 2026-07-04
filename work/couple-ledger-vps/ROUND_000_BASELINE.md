# Round 000 Baseline

Date: 2026-07-03 19:54 +08:00

Purpose:
- Prepare the local Codex environment for the Couple Ledger 100-round optimization plan.
- Install and validate high-quality skills for frontend, React, UI audit, browser QA, spreadsheet import/export, motion, composition, and writing.
- Rebuild the project-specific `couple-ledger-optimizer` skill so future "continue optimizing" requests can auto-trigger the right workflow.
- Verify SSH, public health, backend tests, and static overlay syntax before Round 015.

Installed and validated skills:
- `playwright-interactive`
- `frontend-design`
- `webapp-testing`
- `xlsx`
- `react-best-practices`
- `web-design-guidelines`
- `composition-patterns`
- `react-view-transitions`
- `writing-guidelines`

Project-specific skill:
- Path: `C:\Users\Administrator\.codex\skills\couple-ledger-optimizer`
- Validation: `Skill is valid!`
- Added preflight script: `scripts\ledger-preflight.ps1`
- Preferred SSH key: `C:\Users\Administrator\Desktop\id_ed25519`
- Fallback key currently rejected: `C:\Users\Administrator\.ssh\id_ed25519`

Local workspace:
- Backend snapshot: `work\couple-ledger-vps\backend`
- Static snapshot: `work\couple-ledger-vps\www`
- Synced backend source, tests, requirements, pytest config, optimization log, `index.html`, current Vite entry assets, and all `cl-round-001` through `cl-round-014` assets.

Verification:
- Public health: `{"status":"ok"}`
- Static overlays present: `cl-round-001` through `cl-round-014`
- SSH alias: `ssh couplespace-vps` connects and reports `couple-ledger.service` as `active`
- Backend full tests on VPS: `18 passed`
- Local JS syntax check: all `cl-round-001.js` through `cl-round-014.js` pass `node --check`

Next execution:
- Round 015: deployment/QA fast loop, local sync discipline, rollback notes, and duplicate cleanup discovery.
- Round 016: formal frontend source skeleton, unless Round 015 discovers an existing canonical source path.
