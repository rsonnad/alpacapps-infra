## Project Identity Check

This is **alpacapps-infra**, a generic project template. Do not inherit any
source-project identity, credentials, domains, people, or infrastructure.

# [Your Project Name] — Project Directives

> **On-demand docs — load when the task matches:**
> - `docs/CREDENTIALS.md` — **load for:** SQL queries, deploying functions, SSH, API calls
> - `docs/SCHEMA.md` — **load for:** writing queries, modifying tables, debugging data
> - `docs/PATTERNS.md` — **load for:** writing UI code, Tailwind styling, code review, testing
> - `docs/KEY-FILES.md` — **load for:** finding files, understanding project structure
> - `docs/DEPLOY.md` — **load for:** pushing, deploying, version questions
> - `docs/INTEGRATIONS.md` — **load for:** external APIs, vendor setup, pricing
> - `docs/CHANGELOG.md` — **load for:** understanding recent changes, migration context
> - `docs/SECRETS-BITWARDEN.md` — **load for:** Bitwarden CLI, secrets management, vault organization, sharing credentials
> - `docs/OPEN-BRAIN-SETUP.md` — **load for:** Open Brain session dashboard, AI memory, embeddings

> **IMPORTANT: First-time setup!**
> Run `/setup-alpacapps-infra` to set up the full infrastructure interactively.

> **Upgrading from the template?**
> Read `infra/infra-upgrade-guide.md` for step-by-step instructions to sync new features from
> the alpacapps-infra template repo. Machine-readable feature index: `infra/updates.json`

## Mandatory Behaviors

1. After code changes: end response with `vYYMMDD.NN H:MMa [model]` + affected URLs (read `version.json`)
2. Push immediately — Cloudflare Pages deploys on push to main. See `docs/DEPLOY.md`
3. CI bumps version — never bump locally
4. Run SQL migrations directly — never ask the user to run SQL manually

## Code Guards

- Filter archived items: `.filter(s => !s.is_archived)` client-side
- No personal info in consumer/public views
- `showToast()` not `alert()` in admin
- `openLightbox(url)` for images
- Tailwind: use design tokens from `@theme` block (see `docs/PATTERNS.md`). Run `npm run css:build` after new classes.

## Quick Refs

- **Tech:** Vanilla HTML/JS + Tailwind v4 | Supabase | Cloudflare Pages
- **Live:** https://YOUR_PROJECT.pages.dev/ (or custom domain)
- **Architecture:** Browser → Cloudflare Pages → Supabase (no server-side code)
- **Template repo:** the repository from which this project was generated
- **Upgrade guide:** `infra/infra-upgrade-guide.md`
