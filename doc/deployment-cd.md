# Continuous deployment (CD)

CI checks every pull request to `develop` or `main`. After a reviewed PR is merged into `develop`, the same workflow runs the backend and frontend checks again. When both pass and `CD_ENABLED` is `true`, it sends that commit to Render and builds/deploys the frontend to Vercel. A failed check prevents both deployments. Direct pushes to `main` run CI only.

The public architecture follows [ADR 0004](decisions/0004-spa-frontend-and-deployment-strategy.md): React/Vite on Vercel Hobby, Spring Boot on Render Free, PostgreSQL on Neon Free. `code/frontend/vercel.json` forwards `/api/*` to the existing Render backend and serves `index.html` for client-side routes. The proxy target is the backend URL currently recorded in `doc/requirements.md`; update it if the Render service URL changes.

## One-time setup

1. In Render, keep the existing Git-connected backend service and create a deploy hook for it. Turn off Render's native automatic deploys so the hook does not cause a duplicate deploy on each merge. The hook must be able to deploy a specified Git commit.
2. In Vercel, create or select the CourseHub frontend project with **Root Directory** `code/frontend`, **Framework Preset** Vite, **Build Command** `npm run build`, and **Output Directory** `dist`. Do not enable Vercel's automatic Git production deploy for this project; GitHub Actions owns the production deploy. Keep the project on a free Hobby plan while its usage fits that plan.
3. Add these repository **Actions secrets** in GitHub Settings → Secrets and variables → Actions:
   - `RENDER_DEPLOY_HOOK_URL`: the Render deploy hook URL. Do not put this URL in the repository.
   - `VERCEL_TOKEN`: a Vercel access token for the account that owns the frontend project.
   - `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`: the `orgId` and `projectId` from the team's project's local `.vercel/project.json` after running `vercel link` at the repository root. The `.vercel/` directory is ignored by Git. Use a token with access to that same Vercel account or team.
4. Check that both projects point to the intended Render/Neon database and Vercel account. Then add the repository **Actions variable** `CD_ENABLED=true`. Until this variable is set, the deploy jobs are intentionally skipped and CI continues to run normally.

## Verify and operate

- Merge a reviewed PR into `develop`. In GitHub Actions, confirm `Backend tests` and `Frontend tests and build` pass, followed by `Deploy backend to Render` and `Deploy frontend to Vercel`.
- The Render hook confirms that a deploy was accepted; it does not prove that the new version is serving yet. Confirm the deploy reaches Live in Render and check `/api/v1/system/liveness` on its public URL.
- Open the Vercel production URL. Refresh a nested route such as `/match` and call `/api/v1/system/liveness` on the **Vercel** domain to confirm the SPA fallback and API rewrite work. Render Free may take time to wake after inactivity.
- If a deploy fails, inspect that platform's deploy logs. Fix the issue in a new PR; do not push directly to `develop`. To pause further production deploys, set `CD_ENABLED=false` while CI remains available.
