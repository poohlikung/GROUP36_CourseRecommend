# Continuous deployment (CD)

CI checks every pull request to `develop` or `main`. After a reviewed PR is merged into `develop`, the same workflow runs the backend, frontend and Playwright E2E checks again. When all three pass and `CD_ENABLED` is `true`, it sends that commit to Render and builds/deploys the frontend to Vercel. A failed check prevents both deployments. Direct pushes to `main` run CI only.

The public architecture follows [ADR 0004](decisions/0004-spa-frontend-and-deployment-strategy.md): React/Vite on Vercel Hobby, Spring Boot on Render Free, PostgreSQL on Neon Free. `code/frontend/vercel.json` forwards `/api/*` to the existing Render backend and serves `index.html` for client-side routes. The proxy target is the backend URL currently recorded in `doc/requirements.md`; update it if the Render service URL changes.

## Current deployment (9 October 2026)

- Frontend: [group36-coursehub.vercel.app](https://group36-coursehub.vercel.app/) in the `bosszy27s-projects/group36-coursehub` project. [CI run #94 for `f4dd613`](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37946736709) deployed the frontend to Vercel after a re-run; the deployment was aliased to this domain at 22:41 (UTC+07:00). The earlier manual deployment from `d1e8512` is recorded in the [Task 25 production smoke report](test-reports/task25-deployment.md).
- Backend: [coursehub-backend-ahz2.onrender.com](https://coursehub-backend-ahz2.onrender.com/api/v1/system/liveness) reached Live on `f4dd613` at 21:53 (UTC+07:00) after the Render deploy hook in run #94. Render Events showed only the hook deployment, confirming native On Commit auto-deploy was off for this release.
- `group36courserecommend.vercel.app` belongs to a different Vercel project and still serves the older frontend. Updating that exact domain requires access to its project. Do not treat the two domains as the same deployment.
- The repository Actions secrets `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are present, and `CD_ENABLED=true` was set on 9 October 2026. [CI run #94 for `f4dd613`](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37946736709), the merge of PR #38 into `develop`, completed both deploy jobs successfully. The first Vercel attempt failed at "Pull production settings"; the re-run succeeded and the frontend alias was confirmed. Render reached Live from the deploy hook, and Render Events confirmed that native On Commit auto-deploy was off. This verifies CD for `f4dd613`; check each future run and its deployed commit separately.

If a manual frontend release is needed, first confirm that the local frontend files match the reviewed `develop` commit. The Vercel CLI uploads files from this checkout, so uncommitted or different frontend files must not be included. From the repository root, run:

```sh
git fetch origin develop
git status --porcelain
git diff --exit-code origin/develop -- code/frontend
```

The status and diff commands must produce no output; stop if either reports changes. Record `git rev-parse origin/develop` as the source commit, then run `vercel link --yes --project group36-coursehub --scope bosszy27s-projects` and `vercel deploy --prod --yes --scope bosszy27s-projects` from that same checkout. Confirm the alias points to a Ready deployment, then repeat the production smoke checks below. The local `.vercel/` link is ignored by Git.

## One-time setup

1. In Render, keep the existing Git-connected backend service and deploy hook. Native On Commit auto-deploy was confirmed off in Render Events for `f4dd613`; keep it off so the hook does not cause a duplicate deploy on each merge. The hook must be able to deploy a specified Git commit.
2. In Vercel, create or select the CourseHub frontend project with **Root Directory** `code/frontend`, **Framework Preset** Vite, **Build Command** `npm run build`, and **Output Directory** `dist`. Do not enable Vercel's automatic Git production deploy for this project; GitHub Actions owns the production deploy. Keep the project on a free Hobby plan while its usage fits that plan.
3. Add these repository **Actions secrets** in GitHub Settings → Secrets and variables → Actions:
   - `RENDER_DEPLOY_HOOK_URL`: the Render deploy hook URL. Do not put this URL in the repository.
   - `VERCEL_TOKEN`: a Vercel access token for the account that owns the frontend project.
   - `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`: the `orgId` and `projectId` from the team's project's local `.vercel/project.json` after running `vercel link` at the repository root. The `.vercel/` directory is ignored by Git. Use a token with access to that same Vercel account or team.
4. Check that both projects point to the intended Render/Neon database and Vercel account. The repository **Actions variable** `CD_ENABLED=true` was enabled on 9 October 2026. Check its value before each release; qualifying pushes to `develop` attempt both deploy jobs after tests pass.

## Verify and operate

- For each reviewed PR merged into `develop`, confirm its GitHub Actions run passes `Backend tests`, `Frontend tests and build`, and `Learner provider admin E2E`, followed by `Deploy backend to Render` and `Deploy frontend to Vercel`. [Run #94 for `f4dd613`](https://github.com/poohlikung/GROUP36_CourseRecommend/actions/runs/37946736709) completed both deploy jobs after the Vercel job was re-run; verify the deployed commit on both platforms as well as the job status.
- The Render hook confirms that a deploy was accepted; it does not prove that the new version is serving yet. Confirm the deploy reaches Live in Render and check `/api/v1/system/liveness` on its public URL.
- Open the Vercel production URL. Refresh a nested route such as `/match` and call `/api/v1/system/liveness` on the **Vercel** domain to confirm the SPA fallback and API rewrite work. Render Free may take time to wake after inactivity.
- If a deploy fails, inspect that platform's deploy logs. Fix the issue in a new PR; do not push directly to `develop`. To pause further production deploys, set `CD_ENABLED=false` while CI remains available.
