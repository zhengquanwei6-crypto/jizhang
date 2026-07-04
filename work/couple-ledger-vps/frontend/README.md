# Couple Ledger Frontend

Round 016 introduces a maintainable Vue/Vite source tree without replacing the current production static site.

## Commands

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
npm.cmd run mock-api
```

The dev server proxies `/api` and `/ws` to `http://162.243.80.127:8080` by default for fast local verification.
Set `VITE_API_PROXY_TARGET=http://127.0.0.1:18080` when using `npm.cmd run mock-api`.

## Migration Rules

- Keep `/var/www/couple-ledger` untouched until a round explicitly deploys `dist`.
- Migrate one page or workflow per round.
- Preserve the existing `cl_auth` localStorage session shape while replacing the legacy bundles.
- Run `npm.cmd run build`, the static checks, remote pytest, and public health check before any production deploy.
