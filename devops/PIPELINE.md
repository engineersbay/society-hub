# Git pipeline — SocietyHub

One preview on Render. Two Azure environments later. Do not add a second Render stack.

```text
feature/<ticket>  →  PR  →  staging  →  Promote preview  →  main  →  Render
                                      (CI)                  (CI)     (auto-deploy)
```

| Branch | Role |
|--------|------|
| `feature/…` | Daily work. Open a PR into **`staging`**. |
| `staging` | Integration. CI must be green. Default PR target. |
| `main` | Render preview only. Update via **Promote preview**, not feature PRs. |

## Now (preview)

1. Branch from `staging`: `git checkout staging && git pull && git checkout -b feature/short-name`
2. PR into `staging`. CI (`.github/workflows/ci.yml`) must pass.
3. Merge the PR.
4. When you want it on https://societyhub-client.onrender.com : GitHub → **Actions** → **Promote preview** → Run workflow.
5. That merges `staging` → `main`. Render rebuilds API + both sites.

PRs into `main` from any branch other than `staging` fail **Promote guard**.

## Later (paid Azure)

| Env | Source | Workflow |
|-----|--------|----------|
| Azure staging | tested `main` image / SHA | `deploy-staging.yml` (manual) |
| Azure production | same image already on Azure staging | `deploy-production.yml` (manual + reviewers) |

Do not create `societyhub-api-staging` on Render.

## Workflows

| File | When |
|------|------|
| `ci.yml` | Push/PR to `staging` or `main` |
| `promote-guard.yml` | PR into `main` — head must be `staging` |
| `promote-preview.yml` | Manual — merge `staging` → `main` |
| `mobile.yml` | Mobile path changes |
| `deploy-staging.yml` / `deploy-production.yml` | Azure, idle until secrets exist |
