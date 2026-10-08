# Task 25 — Production deployment check (8 October 2026)

## Release

- Source: reviewed `develop` merge commit `d1e8512` (PR #30, Learning Orbit redesign). The deployed frontend tree was compared with this commit before release.
- Vercel project: `bosszy27s-projects/group36-coursehub`, Root Directory `code/frontend`, framework Vite, output `dist`.
- Production deployment: `dpl_46jhB88CTswScLzP3nDqNzHYCbc3`, Ready, aliased to <https://group36-coursehub.vercel.app/>.
- Existing backend: <https://coursehub-backend-ahz2.onrender.com/> on Render, with PostgreSQL on Neon.

## Checks on the public site

| Check | Result |
| --- | --- |
| Home `/` | HTTP 200; browser rendered the new Thai hero after session restoration |
| 3D hero image | HTTP 200, `image/webp`; browser loaded the image |
| Direct visit to `/match` | HTTP 200; browser rendered “หาคอร์สที่เข้ากับคุณ” |
| `/api/v1/system/liveness` on Vercel domain | HTTP 200 JSON, `status: UP`, after Render woke |
| `/api/v1/me` without login | HTTP 401 as expected; browser then showed guest navigation |
| `/api/v1/auth/csrf` on Vercel domain | HTTP 200 JSON; `XSRF-TOKEN` cookie carried the `Secure` flag |
| Public Swagger UI on Render | `/swagger-ui.html` returned HTTP 200 |

Render's free instance took time to wake. Initial API requests through Vercel timed out or returned `ROUTER_EXTERNAL_TARGET_ERROR`; repeating after direct backend liveness returned 200 succeeded. The frontend displayed its loading state during this period.

## Remaining before Task 25 is complete

- Test registration/login, CSRF and Secure session cookie on Vercel HTTPS with a disposable account. Do not report authenticated production flow as verified from these guest-only checks.
- Confirm whether the team will use this BossZY27 URL or transfer/update the separate `group36courserecommend.vercel.app` project. The latter still serves an older build and is inaccessible from the BossZY27 Vercel scope.
- Configure the Render deploy hook and Vercel project token/IDs as GitHub Actions secrets, then set `CD_ENABLED=true` only after both targets are ready. The current workflow skips deployment jobs.
- Finish the team's backup/restore rehearsal and production smoke/UAT tasks before release to `main`.
