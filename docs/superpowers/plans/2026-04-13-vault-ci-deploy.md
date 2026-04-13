# Vault CI Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the private vault repo to the Quartz site so that pushing to the vault automatically rebuilds and deploys the GitHub Pages site.

**Architecture:** A `repository_dispatch` cross-trigger — the vault repo posts an event to the quartz repo on push; the quartz repo's deploy workflow clones the vault, copies `wiki/` into `content/`, builds with Quartz, and deploys to GitHub Pages. A single PAT stored in both repos handles all authentication.

**Tech Stack:** GitHub Actions, `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`, `npx quartz build`, `curl` (for dispatch)

---

## File Map

| File | Repo | Action |
|------|------|--------|
| `.github/workflows/deploy.yaml` | `madhyamaka-wiki` | Create |
| `.github/workflows/trigger-wiki-build.yaml` | `madhyamaka-wiki-vault` | Create (deliver separately) |

---

## Pre-requisites (manual, one-time)

These must be done before any workflow will succeed. Complete them before running Task 1.

- [ ] **Create a GitHub PAT**
  - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  - Generate new token, name it `madhyamaka-wiki-deploy`
  - Scopes: check `repo` (full repo access — needed to clone private vault and to trigger dispatch across repos)
  - Copy the token value immediately (shown only once)

- [ ] **Add `VAULT_PAT` secret to the quartz repo**
  - Go to `github.com/nickpettican/madhyamaka-wiki` → Settings → Secrets and variables → Actions
  - New repository secret: name `VAULT_PAT`, value = the PAT you just created

- [ ] **Add `QUARTZ_DISPATCH_PAT` secret to the vault repo**
  - Go to `github.com/nickpettican/madhyamaka-wiki-vault` → Settings → Secrets and variables → Actions
  - New repository secret: name `QUARTZ_DISPATCH_PAT`, value = the same PAT

- [ ] **Enable GitHub Pages on the quartz repo**
  - Go to `github.com/nickpettican/madhyamaka-wiki` → Settings → Pages
  - Under "Build and deployment" → Source: select **"GitHub Actions"** (not a branch)
  - Save

---

## Task 1: Create the Quartz deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yaml` (in `madhyamaka-wiki`)

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/deploy.yaml` with this exact content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - v4
  repository_dispatch:
    types:
      - vault-updated
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout quartz repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Clone vault
        env:
          VAULT_PAT: ${{ secrets.VAULT_PAT }}
        run: git clone --depth 1 "https://$VAULT_PAT@github.com/nickpettican/madhyamaka-wiki-vault.git" _vault

      - name: Copy wiki content
        run: cp -r _vault/wiki/. content/

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install dependencies
        run: npm ci

      - name: Build Quartz
        run: npx quartz build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yaml
git commit -m "ci: add GitHub Pages deploy workflow with vault content fetch"
```

- [ ] **Step 3: Push to origin**

```bash
git push origin v4
```

- [ ] **Step 4: Verify the workflow appears in GitHub**
  - Go to `github.com/nickpettican/madhyamaka-wiki` → Actions tab
  - You should see "Deploy to GitHub Pages" listed under workflows
  - The push in Step 3 will have already triggered a run — click it and watch it complete
  - Expected: green checkmark, site URL shown in the deploy step output

- [ ] **Step 5: Verify the site is live**
  - Go to `github.com/nickpettican/madhyamaka-wiki` → Settings → Pages
  - The published URL (e.g. `https://nickpettican.github.io/madhyamaka-wiki/`) should be shown
  - Visit it — you should see the Quartz site with your wiki content

---

## Task 2: Create the vault cross-trigger workflow

This workflow lives in the **vault repo** (`madhyamaka-wiki-vault`). You will need to add this file there directly (clone the vault repo locally and commit it, or create it via the GitHub UI).

**Files:**
- Create: `.github/workflows/trigger-wiki-build.yaml` (in `madhyamaka-wiki-vault`)

- [ ] **Step 1: Create the workflow file in the vault repo**

Create `.github/workflows/trigger-wiki-build.yaml` in `madhyamaka-wiki-vault`:

```yaml
name: Trigger Wiki Build

on:
  push:
    branches:
      - main

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch build to madhyamaka-wiki
        run: |
          curl -L \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.QUARTZ_DISPATCH_PAT }}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            https://api.github.com/repos/nickpettican/madhyamaka-wiki/dispatches \
            -d '{"event_type":"vault-updated"}'
```

- [ ] **Step 2: Commit and push (in vault repo)**

```bash
git add .github/workflows/trigger-wiki-build.yaml
git commit -m "ci: trigger madhyamaka-wiki build on vault push"
git push origin main
```

- [ ] **Step 3: Verify the trigger fires**
  - Go to `github.com/nickpettican/madhyamaka-wiki-vault` → Actions tab
  - You should see "Trigger Wiki Build" ran on your push — check it completed with a green checkmark
  - Then go to `github.com/nickpettican/madhyamaka-wiki` → Actions tab
  - A new "Deploy to GitHub Pages" run should have been triggered by `repository_dispatch`
  - Expected: it completes successfully and the site reflects your latest vault content

---

## End-to-End Test

After both tasks are complete, do a full smoke test:

- [ ] Make a small change to any markdown file in `madhyamaka-wiki-vault/wiki/` and push to `main`
- [ ] Watch `madhyamaka-wiki-vault` → Actions: "Trigger Wiki Build" runs and passes
- [ ] Watch `madhyamaka-wiki` → Actions: "Deploy to GitHub Pages" triggers and passes
- [ ] Visit the GitHub Pages URL and confirm the change is reflected
