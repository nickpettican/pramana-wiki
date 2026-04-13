# Design: Vault Content Integration & GitHub Pages Deploy

**Date:** 2026-04-13  
**Status:** Approved

## Overview

Connect the private Obsidian vault repo (`nickpettican/madhyamaka-wiki-vault`) to the Quartz site repo (`nickpettican/madhyamaka-wiki`) so that vault changes automatically trigger a site rebuild and deploy to GitHub Pages.

## What We Are Not Doing

- `npx quartz create` — the repo is already a Quartz v4 project. This command bootstraps from scratch and would overwrite existing config.
- Git submodule — not needed. Content is always built from the latest vault `main` branch; pinning versions adds complexity with no benefit.
- Modifying `content/` locally — it stays as a `.gitkeep` placeholder in the repo. Content is injected at CI build time only.

## Architecture

Two repos, one PAT, one cross-repo trigger:

```
madhyamaka-wiki-vault (private)
  └── push to main
        └── trigger-wiki-build.yaml
              └── POST repository_dispatch → madhyamaka-wiki

madhyamaka-wiki (public, Quartz)
  └── deploy.yaml (triggered by: push to v4, repository_dispatch, workflow_dispatch)
        ├── clone vault with VAULT_PAT
        ├── cp vault/wiki/ → content/
        ├── npm ci + npx quartz build → public/
        └── deploy public/ → GitHub Pages
```

## Components

### 1. Quartz repo — `.github/workflows/deploy.yaml` (new file)

**Triggers:**
- `push` to branch `v4` — so theme/config changes publish immediately
- `repository_dispatch` with event type `vault-updated` — triggered by vault repo on content changes
- `workflow_dispatch` — manual trigger via GitHub UI

**Steps:**
1. `actions/checkout@v4` (quartz repo, `fetch-depth: 0`)
2. Clone vault: `git clone --depth 1 https://$VAULT_PAT@github.com/nickpettican/madhyamaka-wiki-vault.git _vault`
3. Copy content: `cp -r _vault/wiki/. content/`
4. `actions/setup-node@v4` with Node 22
5. npm dependency cache (`actions/cache@v4`)
6. `npm ci`
7. `npx quartz build` (outputs to `public/`)
8. `actions/configure-pages@v4`
9. `actions/upload-pages-artifact@v3` (path: `public/`)
10. `actions/deploy-pages@v4`

**Permissions required:** `contents: read`, `pages: write`, `id-token: write`

**Secret:** `VAULT_PAT` — used to clone the private vault repo.

### 2. Vault repo — `.github/workflows/trigger-wiki-build.yaml` (new file, lives in vault repo)

**Triggers:** `push` to `main`

**Steps:**
1. Call GitHub API via `curl` to POST a `repository_dispatch` event to `nickpettican/madhyamaka-wiki` with event type `vault-updated`

**Secret:** `QUARTZ_DISPATCH_PAT` — used to authenticate the API call.

### 3. GitHub Pages configuration (one-time, manual)

In `nickpettican/madhyamaka-wiki` → Settings → Pages → set source to **"GitHub Actions"** (not a branch). This enables the `deploy-pages` action to publish.

## PAT Setup

One PAT, stored as a secret in both repos:

| Repo | Secret name | Purpose |
|------|-------------|---------|
| `madhyamaka-wiki` | `VAULT_PAT` | Clone private vault during build |
| `madhyamaka-wiki-vault` | `QUARTZ_DISPATCH_PAT` | POST repository_dispatch to quartz repo |

**PAT type:** Classic PAT with `repo` scope (covers both private repo read and cross-repo dispatch). Since both repos share the same owner (`nickpettican`), a fine-grained PAT scoped to both repos also works.

## Data Flow

1. You push markdown to `madhyamaka-wiki-vault/wiki/`
2. Vault's `trigger-wiki-build.yaml` fires, calls GitHub API
3. Quartz repo receives `repository_dispatch`, runs `deploy.yaml`
4. CI clones vault, copies `wiki/` into `content/`, builds Quartz, deploys to GitHub Pages
5. Site is live within ~2 minutes of vault push

## Files Changed

- `nickpettican/madhyamaka-wiki`: add `.github/workflows/deploy.yaml`
- `nickpettican/madhyamaka-wiki-vault`: add `.github/workflows/trigger-wiki-build.yaml`
- Existing CI workflows (`ci.yaml`, `build-preview.yaml`, etc.) are left untouched — their `jackyzha0/quartz` repo guards mean they never run on the fork anyway

## Out of Scope

- Modifying `quartz.config.ts` or the Quartz theme
- Any changes to the vault content structure
- Handling multiple vault branches
