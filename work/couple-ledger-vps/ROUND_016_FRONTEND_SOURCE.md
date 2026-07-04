# Round 016 - Vue/Vite Frontend Source Skeleton

Date: 2026-07-03

## Scope

- Created a maintainable Vue 3 + Vite + TypeScript frontend at `work/couple-ledger-vps/frontend`.
- Preserved the current live API contract: `/api`, `/ws`, and `cl_auth`.
- Covered all known live routes with source-owned Vue Router entries.
- Added Pinia stores for auth and UI state.
- Added shared components for the app shell, bottom navigation, scope switch, page scaffold, and metric cards.
- Added base styles and design tokens with restrained neutral, gold, blue, sage, and rose accents.
- Added a dev proxy to the VPS backend.
- Did not deploy or modify `/var/www/couple-ledger`.

## Verification

- `npm.cmd install`: passed, `0 vulnerabilities`.
- `npm.cmd run build`: passed.
- Local dev server: `http://127.0.0.1:5173/home` returned `200`.
- Playwright `/login` snapshot: rendered.
- Playwright `/home`: redirected to `/login?next=/home` while unauthenticated.
- Playwright console: `0` errors, `0` warnings after adding `public/favicon.svg`.

## Notes

- VPS currently does not provide `node` or `npm`; source is still synchronized to `/opt/couple-ledger/frontend` for continuity.
- Future production deployment can build locally and sync `dist`, so server-side Node is not required before the first source-owned release.
- Next product round should migrate one low-risk page or workflow from static overlays into this source tree.
