# Task 25 — Production deployment check (8–9 October 2026)

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
| Public Swagger UI on Render | `/swagger-ui.html` redirected (HTTP 302) to `/swagger-ui/index.html`, which returned HTTP 200 |

Render's free instance took time to wake. Initial API requests through Vercel timed out or returned `ROUTER_EXTERNAL_TARGET_ERROR`; repeating after direct backend liveness returned 200 succeeded. The frontend displayed its loading state during this period.

## Task 25 acceptance and follow-up

The public API/Swagger, liveness, frontend URL, environment and runbook checks above satisfy the Task 25 acceptance criteria recorded in [Notion](https://app.notion.com/p/3e2b9c0da963800ab46fd120891be53f). Task 25 was marked complete on 9 October 2026. This does not mean the full production release has been verified.

- Registration/login, CSRF and the Secure session cookie have **not** been tested end to end on Vercel HTTPS with a disposable account. The checks above cover only a guest session; include the authenticated flow in smoke/UAT testing.
- The team has not confirmed whether `group36-coursehub.vercel.app` will be the canonical URL or whether it will update the separate `group36courserecommend.vercel.app` project. The latter still serves an older build and is inaccessible from the BossZY27 Vercel scope.
- On 9 October, GitHub Actions repository secrets `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` were present, and the repository variable `CD_ENABLED` was set to `true`. The Render owner reported that native On Commit auto-deploy was turned off; this was not independently checked in Render. No push to `develop` has run after CD was enabled, so the deploy jobs and resulting production versions are **not yet verified**. See the [CD runbook](../deployment-cd.md) for the first-run checks.
- Backup/restore rehearsal is documented in [Task 24's report](task24-backup-restore.md). The team's remaining production smoke/UAT work still needs to be completed before release to `main`.
