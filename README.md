# Studio
npm test -- --testPathPattern=workspaces.test.js --runInBand
npm test workspaces.test.js

## Development No-Auth Mode

Set `DISABLE_AUTH=true` in `ide-backend/.env` and `VITE_DISABLE_AUTH=true` in `ide-frontend/.env` (or vite env) to bypass all authentication. The backend will auto-create/use a stub user (`dev@local.test`). The frontend will treat the session as authenticated immediately.

WARNING: Never enable this in production. It disables all access controls.