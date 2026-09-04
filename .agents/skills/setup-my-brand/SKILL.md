---
name: setup-my-brand
description: Interactive infrastructure setup wizard for new projects. Walks through Cloudflare Pages, Supabase, auth, email, SMS, payments, e-signatures, AI, storage, and server setup — one service at a time. Use when user says "set up a new project", "start a project from scratch", "configure Supabase", "add a new service", "set up infrastructure", "help me deploy", or "setup wizard".
---

# Infrastructure Setup Wizard

You are an expert infrastructure setup assistant. You help users build full-stack systems using Supabase, Cloudflare Pages, and optional services (email, SMS, payments, AI, storage, servers).

## Critical Rules

1. **You handle ALL terminal work.** The user never runs commands.
2. **Silent prerequisite installs.** Check and install Supabase CLI if missing. Only pause if git or Node.js is missing (link user to https://git-scm.com and https://nodejs.org).
3. **Detect existing setup.** Users may arrive from the Claude Chat guided setup (/infra/) with GitHub repo and Supabase already configured. Check for existing git remote and `supabase status` before running Steps 2–3. If already set up, **verify** the key details you'll need (project ref, remote URL, etc.) via commands — don't just trust "already done." Then proceed to the next uncompleted step.
4. **Checkpoint rule.** Do not move to Step N+1 until every item in Step N is verified. Run validation commands (API calls, CLI checks, HTTP requests) to confirm each step completed successfully. If something fails, fix it before proceeding.
5. **One service at a time.** Complete each fully before moving on.
6. **Every URL must be clickable.** Always `https://...` — never path fragments or unsubstituted templates.
7. **Build context docs incrementally using the on-demand doc system.**
   - `CLAUDE.md` (checked in): slim directives file (~30 lines) with on-demand doc index. Replace placeholders (USERNAME, REPO, project name).
   - `CLAUDE.local.md` (gitignored): operator directives, live URLs, push workflow
   - `docs/CREDENTIALS.md` (gitignored): all API keys, tokens, connection strings, passwords
   - `docs/SCHEMA.md` (checked in): database table definitions — update after each migration
   - `docs/PATTERNS.md` (checked in): code patterns, Tailwind tokens, auth system, conventions
   - `docs/KEY-FILES.md` (checked in): project file structure reference
   - `docs/DEPLOY.md` (checked in): deployment workflow, live URLs, version format
   - `docs/INTEGRATIONS.md` (checked in): external service configs (non-secret), cost tiers
   - `docs/CHANGELOG.md` (checked in): recent changes log
   - After each service: append to the **appropriate doc file** (not CLAUDE.md), commit, push.
   - **Why this pattern:** CLAUDE.md is always loaded into context. By keeping it slim (~30 lines) and splitting heavy content into on-demand docs, Claude only loads what it needs per task — saving thousands of tokens per conversation.
   - **Feature-aware generation:** Use `docs/CLAUDE-TEMPLATE.md` as the base. Generate `CLAUDE.md` with on-demand doc references only for docs that are actually generated. Generate `docs/SCHEMA.md` with only tables from core + enabled features (read `dbTables` from `feature-manifest.json`). Generate `docs/KEY-FILES.md` with only files from enabled features. Generate `docs/INTEGRATIONS.md` with only configured services. Generate `docs/PATTERNS.md` with base patterns always, plus device-proxy and polling patterns only if any smart_home/vehicles features are enabled, plus pipeline patterns only if rentals or events are enabled. Do NOT copy over `PRODUCTDESIGN.md` or `docs/CHANGELOG.md` from the template — start fresh.
   - **Minimal projects:** If the user selected 3 or fewer features beyond core, skip generating `docs/KEY-FILES.md` and `docs/CHANGELOG.md` (they add overhead without value for small projects). Only reference existing docs in `CLAUDE.md`.
8. **Validate before proceeding.** Test every credential and connection before moving on.
9. **Construct webhook URLs yourself.** Once you have the Supabase project ref, build all webhook URLs as copy-paste-ready values.
10. **Derive everything you can.** Don't ask for things you can compute (project URL from ref, pooler string from ref + password, etc.).
11. **Use `gh` CLI when available.** Create repos automatically. Use `wrangler` CLI for Cloudflare Pages setup.

## Setup Flow

### Step 0: Detect Setup Mode

**This wizard runs in any AI coding tool** — opencode or Zed (the low-cost
track), or Claude Code / ChatGPT Codex (the subscription track). A few steps are
Claude Code-specific and are marked as such; skip those when the user is running
something else rather than asking them to run commands their tool does not have.

Instructions live in `AGENTS.md` (read natively by Codex, opencode and Zed);
`CLAUDE.md` imports it for Claude Code. Skills live in `.agents/skills/` (the
path Codex and opencode read); `.claude/skills/` holds pointer stubs for Claude
Code. Keep editing `AGENTS.md` and `.agents/skills/` only — if this wizard
generates or updates project directives, write them to `AGENTS.md`.

Before anything else, check if this is a **new setup** or an **add-service-later** invocation:

1. Check if `supabase/config.toml` exists (Supabase already set up)
2. Check if `.git/config` has a remote (GitHub already set up)
3. Check if `.setup-state.json` exists (previous wizard run)

**If all three exist → enter Add Mode** (see "Add Mode" section below).
**Otherwise → continue with Step 1 (new setup).**

### Step 1: Persona & Feature Selection

Ask in one message:

**"What are you building?"** — One-sentence description + main entities.

Then suggest the **best-fit persona** from the list below. Read `feature-manifest.json` → `personas` for the full definitions. Present the options:

| # | Persona | Best for | Key features |
|---|---------|----------|--------------|
| 1 | **Slim (core only)** — *default* | Anything not listed below | Website, admin dashboard, auth, database, storage |
| 2 | **Vacation Rental Manager** | Short-term rentals, Airbnb hosts | Airbnb sync, rentals, events, cameras, smart home |
| 3 | **Long-term Landlord** | Apartment/house leasing | Leases, rent collection, tenant portal |
| 4 | **Event Venue** | Event spaces, conference centers | Event pipeline, contracts, payments |
| 5 | **Hostel / Co-living** | Shared living, work-trade | Mixed rooms, associates, orientation, amenities |
| 6 | **Personal AI Hub** | Smart home, AI assistant | Site Q&A, lighting, music, cameras, climate, voice |
| 7 | **Small Business** | CRM, invoicing, campaigns | Email, SMS, payments, documents |
| 8 | **Developer Portfolio / SaaS** | Minimal web app | Auth, email, payments |
| 9 | **Custom** | Pick features individually | Full feature grid |

**Default to Slim.** The template carries a full property-management stack;
most projects want none of it. Only suggest a heavier persona when the user's
own description clearly calls for it (they said "rental", "guests", "tenants",
"venue", "smart home"). Property management is opt-in, never inherited — a
project can add it later in one step (see Step 1b).

After the user picks a persona (or Custom), show the **feature grid** grouped by category with the persona's features pre-checked. The user can add or remove features.

**Feature grid by category:**

**Always included (core):**
- Website + Admin Dashboard (Cloudflare Pages) — Free
- Database + Storage + Auth (Supabase) — Free
- Tailwind CSS v4 (utility-class styling) — Free
- An AI coding agent (opencode, Zed or Claude Code) — you're already here

**Communication:**
- [ ] Email notifications (Resend) — Free, 3,000/month
- [ ] SMS messaging (Telnyx) — ~$1/mo + $0.004/message
- [ ] WhatsApp (Meta Business) — requires verification

**Payments:**
- [ ] Stripe payments + ACH — ACH: 0.8% capped $5; Cards: 2.9% + 30¢
- [ ] Square payments — 2.6% + 10¢
- [ ] PayPal payments — 3.49% + 49¢

**Documents:**
- [ ] E-signatures (SignWell) — Free, 3–25 docs/month
- [ ] Document templates — Free (markdown with placeholders)

**Smart Home (requires hardware):**
- [ ] Smart lighting (Govee) — Free API
- [ ] Security cameras (UniFi/IP) — Free (needs go2rtc + home server)
- [ ] Music system (Sonos) — Free (needs Sonos HTTP API + home server)
- [ ] Climate control (Nest) — Free (needs Google Cloud project)
- [ ] Laundry monitoring (LG ThinQ) — Free
- [ ] Precision oven (Anova) — Free

**Maker Tools (requires hardware):**
- [ ] 3D printer (FlashForge) — Free (needs TCP proxy + home server)
- [ ] Laser cutter (Glowforge) — Free (read-only status)

**Vehicles:**
- [ ] Tesla Fleet API — Free (needs Tesla developer account)

**Property Operations:**
- [ ] Rental pipeline (inquiry → sign → move-in) — Free
- [ ] Event hosting (inquiry → contract → payment) — Free
- [ ] Associate/staff management (hours, payouts) — Free
- [ ] Resident portal (profiles, devices, orientation) — Free
- [ ] Airbnb calendar sync (iCal) — Free

**AI & Voice:**
- [ ] Voice calling (Vapi) — ~$0.10-0.30/min
- [ ] Alexa skill — Free

**Infrastructure:**
- [ ] User login / Google Sign-In — Free
- [ ] Object storage (Cloudflare R2) — Free, 10 GB
- [ ] DigitalOcean Droplet (workers) — ~$12/mo
- [ ] Oracle Cloud ARM (free tier) — Always Free

After the user confirms their feature set:
1. Show estimated monthly cost based on `setup_cost` and `setup_cost_note` from the manifest
2. Note any suggested companion features (from `suggested_with` in the manifest) — e.g., "Rental pipeline works best with E-signatures and Stripe. Want to add those?"
3. Note any dependencies (from `dependencies` in the manifest) — e.g., "Voice calling requires PAI. Adding it automatically."

### Step 1b: Project Pruning

Pruning is done by `scripts/apply-profile.mjs`, which reads
`feature-manifest.json` and resolves the paths itself. Do not work out the
file list by hand.

**First, show the user what would change:**

```bash
node scripts/apply-profile.mjs plan --persona=<persona>
```

(or `--features=email,rentals,...` for a Custom selection). This prints the
enabled features, anything pulled in by dependencies, and every path that
would be excluded, with the feature that owns it. Nothing is written.

**Then ask the user (AskUserQuestion):**

> Features you didn't select can be handled two ways:
> - **Soft hide (Recommended)** — Keep files on disk but list them in `.claudeignore` so your AI tool ignores them. Fully reversible.
> - **Full prune** — Also delete them from disk. Cleaner project, but restoring a feature later means fetching it from the template repo.

**Then apply it:**

```bash
node scripts/apply-profile.mjs apply --persona=<persona> --mode=soft   # or --mode=prune
```

This writes `.claudeignore`, writes `.setup-state.json`, and (in `prune`
mode) deletes the excluded paths. It refuses to run on a dirty working tree
so the change is reviewable — commit or stash first.

Core is never excluded: paths listed under `core`, and any path an enabled
feature also owns, are always kept.

**Adding a feature later** (this is how property management gets added — it is
never on by default):

```bash
node scripts/apply-profile.mjs add rentals residents
```

This updates `.claudeignore` and `.setup-state.json`. If the project was
fully pruned, the script prints the exact `git checkout infra-upstream/main --
<paths>` command to restore the files, and points at the feature's `dbTables`
for the migrations to apply.

Add `.setup-state.json` to `.gitignore`. Commit `.claudeignore` (and the
deletions, if pruned).

**Important:** Run this BEFORE the rest of the wizard, so your AI tool benefits
from the reduced search scope for every later step.

### Step 2: GitHub + Cloudflare Pages

See `references/core-services.md` → "GitHub + Cloudflare Pages" for detailed steps.

**Summary:**
1. Detect current state (git remote, `gh` CLI availability, `wrangler` CLI)
2. Determine case: template repo, clone, or no remote
3. Create or configure repo (prefer `gh api repos/.../generate` for template API)
4. Connect repo to Cloudflare Pages (via `wrangler` CLI + dashboard, or manual dashboard setup)
5. Add GitHub secrets for CI deployment (CLOUDFLARE_API_TOKEN = the minted `my-brand-pages-deploy` token from `references/provisioning.md`, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT)
6. Validate deployment (poll `{PROJECT}.pages.dev` for HTTP 200, up to 90s)
7. Fill in `CLAUDE.md` placeholders (USERNAME, REPO, PROJECT, project name), create `CLAUDE.local.md`, update `docs/DEPLOY.md` with live URLs, commit, push

### Step 2a: Developer Tooling

Set up project-level settings for LSP intelligence.

**Claude Code only.** If the user is running opencode or Zed, skip this step — both provide their own language-server integration — and tell them so rather than asking them to run a Claude Code command.

**Steps (all handled by you):**
1. Create `.claude/settings.json` with `{ "env": { "ENABLE_LSP_TOOL": "1" } }`
2. Install typescript-language-server globally if missing: `npm install -g typescript-language-server typescript`
3. Tell the user to run `/plugin install typescript-lsp@claude-plugins-official` once (this is a Claude Code slash command, not a shell command)
4. Add "First-Time Setup" section to `CLAUDE.md` with the plugin install instruction
5. Commit and push

### Step 2b: Tailwind CSS v4

Set up Tailwind CSS for utility-class styling alongside existing CSS.

**Steps (all handled by you):**
1. Initialize npm if needed: `npm init -y`
2. Install: `npm install -D tailwindcss @tailwindcss/cli`
3. Also install LSP tooling: `npm install -g typescript-language-server typescript`
4. Create `.claude/settings.json` with `{ "env": { "ENABLE_LSP_TOOL": "1" } }`
5. Create `styles/tailwind.css` (Tailwind v4 CSS-first config):
   - `@import "tailwindcss";`
   - `@source` directives pointing to HTML/JS files
   - `@theme` block mapping project design tokens (colors, fonts, shadows, radii)
6. Build: `npx @tailwindcss/cli -i styles/tailwind.css -o styles/tailwind.out.css --minify`
7. Add npm scripts to `package.json`: `css:build` and `css:watch`
8. Add `<link rel="stylesheet" href="styles/tailwind.out.css">` to all HTML pages
9. Add `node_modules/` to `.gitignore`
10. If CI exists, add `npm ci && npm run css:build` step before deploy
11. Commit `package.json`, `package-lock.json`, `styles/tailwind.css`, `styles/tailwind.out.css`, `.claude/settings.json`

**Key points:**
- Tailwind v4 uses CSS-first config (no `tailwind.config.js`)
- Coexists with existing CSS — no rewrite needed
- `tailwind.out.css` is committed to repo (Cloudflare Pages can run builds, but we commit output for simplicity — no build command needed)
- Map existing CSS custom properties to Tailwind theme in `@theme` block

**LSP plugin (one-time manual step):** After the npm installs finish, tell the user: "While I set up the Tailwind config, please run this in your Claude Code session: `/plugin install typescript-lsp@claude-plugins-official` — this gives me type-aware code intelligence for your project." This is a Claude Code slash command (not a shell command) that must be typed by the user.

### Step 3: Supabase

See `references/core-services.md` -> "Supabase" and `references/provisioning.md` -> "Supabase" for detailed steps.

**Summary:**
1. Ask for ONE credential: a Supabase Management API token (`sbp_...`). Everything else is automated.
2. Create org (if needed) + project via Management API; poll until `ACTIVE_HEALTHY`
3. Fetch API keys via `GET /v1/projects/{ref}/api-keys`
4. Run all migrations in order via `POST /v1/projects/{ref}/database/query`
5. Configure session pooling automatically via `PATCH /v1/projects/{ref}/database/pooling` (pool_mode, pool size) — the user does nothing
6. Configure auth (site URL, redirect URLs, Google provider in Step 4) via `PATCH /v1/projects/{ref}/auth/config` — no dashboard visits
7. Set edge-function secrets via `POST /v1/projects/{ref}/secrets`
8. Fall back to the Supabase CLI (same access token) for anything the REST API does not cover
9. Validate: `SELECT 1` via query endpoint, auth-config round-trip, one function deploy + invoke

### Step 3b: Feature Flags in Database

After Supabase is configured and migrations are run, write the user's feature selections
to `property_config.features`. **Only features the user explicitly selected should be `true`.**
All other optional features must be `false` or omitted (they default to `false`).

```sql
-- Set ONLY selected features to true. Unselected features default to false.
UPDATE property_config
SET config = jsonb_set(
  config,
  '{features}',
  '{"email": false, "sms": false, "whatsapp": false, "voice": false,
    "payments_stripe": false, "payments_square": false, "payments_paypal": false,
    "esignatures": false, "documents": false,
    "lighting": false, "cameras": false, "music": false, "climate": false,
    "laundry": false, "oven": false, "printer_3d": false, "glowforge": false,
    "vehicles": false,
    "rentals": false, "events": false, "associates": false, "residents": false, "airbnb": false,
    "alexa": false}'::jsonb
)
WHERE id = 1;
```

Then set selected features to `true`:
```sql
-- Example: if user selected email, stripe, and rentals
UPDATE property_config
SET config = jsonb_set(config, '{features,email}', 'true')
WHERE id = 1;
-- Repeat for each selected feature
```

**Important:** Never enable features the user didn't select. The feature-registry.js
defaults all optional features to `false` when not present in `property_config.features`.

### Step 4: Google Sign-In (OAuth) — if selected

See `references/provisioning.md` -> "Google Cloud" for detailed steps.

**Summary:**
1. User runs `gcloud auth login` once — the only manual Google step
2. Create/select project, enable APIs, create service account with `roles/oauthconfig.editor`, mint its key
3. Programmatically create the OAuth brand (consent screen) + web client with redirect URI `https://{REF}.supabase.co/auth/v1/callback`; fetch the client secret
4. Enable the Google provider in Supabase via `PATCH /v1/projects/{ref}/auth/config` — no dashboard
5. Set test users; submit verification when going live
6. You create `shared/auth.js` with Google OAuth, add login/logout UI, then test a real sign-in
7. Fallback: one pre-filled console URL + paste client JSON if a beta endpoint blocks a step

**Note:** If user also selected Gemini, use the same Google Cloud project.

### Steps 5–10: Optional Services

For each selected service, follow the detailed instructions in the appropriate reference file:

- **Resend (Email)** → `references/optional-services.md` → "Resend"
- **Telnyx (SMS)** → `references/optional-services.md` → "Telnyx"
- **Square (Payments)** → `references/optional-services.md` → "Square"
- **Square Webhook** → `references/optional-services.md` → "Square Webhook"
- **Stripe (Payments + ACH)** → `references/optional-services.md` → "Stripe"
- **SignWell (E-Signatures)** → `references/optional-services.md` → "SignWell"
- **Google Gemini (AI)** → `references/optional-services.md` → "Gemini"
- **Cloudflare R2 (Storage)** → `references/optional-services.md` → "Cloudflare R2"

**Pattern for each service:**
1. Ask user for credentials/config in a single message with all URLs
2. Validate credentials immediately via API call
3. Create DB tables, insert config, set Supabase secrets
4. Create and deploy edge functions (webhooks with `--no-verify-jwt`)
5. Create client service module
6. Append credentials to `docs/CREDENTIALS.md`, service config to `docs/INTEGRATIONS.md`, new tables to `docs/SCHEMA.md`, new files to `docs/KEY-FILES.md`

### Step 11: Server Setup — if selected

- **DigitalOcean** → `references/server-setup.md` → "DigitalOcean"
- **Oracle Cloud** → `references/server-setup.md` → "Oracle Cloud"

If any device features are enabled that need background workers (vehicles, laundry, cameras), also set up the workers:
- See `references/worker-setup.md` for the poller pattern and systemd service template

### Step 11b: Mobile App — if requested

Ask: "Do you want a native mobile app (iOS/Android)?"

If yes, follow `references/mobile-setup.md` for:
1. Capacitor 8 initialization
2. Feature-aware tab configuration
3. Platform setup (iOS/Android)
4. OTA updates via Capgo (optional)

### Step 12: Tool Permissions

**Claude Code only.** opencode and Zed manage permissions in their own settings; if the user is on one of those, skip this step and mention where their tool's permission settings live instead.

**Silently (no user action):**
1. Read `~/.claude/settings.json` (create with `{"permissions":{"allow":[]}}` if missing)
2. Always add: `"Edit"`, `"Write"`, `"Read"` to `permissions.allow`

**Then ask** with AskUserQuestion (multiSelect: true):
> I've enabled file access by default. Want to also allow any of these without prompting?

Options:
- **Web Search & Fetch** → `"WebSearch"`, `"WebFetch"`
- **Git commands** → `"Bash(git *)"`
- **All Bash commands** → `"Bash(*)"` (supersedes Git commands)

Write updated file and confirm what was added.

### Step 13: Final Validation & Summary

See `references/validation-checklist.md` for the full checklist and summary template.

**Summary:**
1. Validate Cloudflare Pages (HTTP 200)
2. Validate Supabase (psql, CLI link, tables, RLS, secrets)
3. Validate edge functions (expect auth error, NOT 404)
4. Validate each service API key
5. Validate storage buckets
6. Verify CLAUDE.md tracked, CLAUDE.local.md gitignored
7. Show final summary with all services, URLs, and pending actions

## Add Mode (Incremental Feature Addition)

When Step 0 detects an existing setup, enter Add Mode instead of starting fresh.

**Flow:**

1. **Read `.setup-state.json`** to get current persona, enabled features, and configured services.
2. **Show current state:**
   > Your project was set up as a **[persona]** with these features: [list].
   > Services configured: [list].
3. **Ask: "What would you like to add?"** — Present only features NOT already enabled, grouped by category.
4. **For each newly selected feature:**
   - Deploy its DB tables (from `dbTables` in manifest)
   - Deploy its edge functions (from `edgeFunctions` in manifest)
   - Create its client-side service modules (from `shared` in manifest)
   - If the feature requires a third-party service (e.g., Telnyx for SMS), run that service's setup from `references/optional-services.md`
5. **Run the profile script** — it updates `.claudeignore` and
   `.setup-state.json`, and works out what (if anything) needs restoring:
   ```bash
   node scripts/apply-profile.mjs add <feature> [<feature>...]
   ```
   If the project was fully pruned, the script prints the exact
   `git checkout infra-upstream/main -- <paths>` command for the files it
   needs back. Run that, having added the remote once:
   ```bash
   git remote add infra-upstream https://github.com/YOUR_ORG/alpacapps-infra.git
   git fetch infra-upstream main
   ```
6. **Add any services** to `services_configured` in `.setup-state.json`
   (the script maintains `enabled_features`; services are tracked separately).
7. **Update docs:** Append new tables to `docs/SCHEMA.md`, new files to `docs/KEY-FILES.md`, new services to `docs/INTEGRATIONS.md`.
8. **Commit and push.**

## Examples

### Example 1: Small Business with Payments
User says: "I'm building a salon booking system with services, stylists, and appointments. I need email, payments, and Google Sign-In."

Actions:
1. Persona suggestion → **Small Business** (closest fit). User customizes: adds Google Sign-In.
2. Feature set: email, payments_stripe, esignatures, documents + Google OAuth
3. Prune: `apply-profile.mjs apply --features=email,payments_stripe,esignatures,documents --mode=prune`
4. GitHub repo + Cloudflare Pages
5. Supabase with tables: `services`, `stylists`, `appointments`, `clients`
6. Google OAuth, Resend, Stripe setup
7. Claude Code permissions
8. Final validation + summary

### Example 2: Vacation Rental
User says: "I manage 3 vacation rental properties on Airbnb and want to automate guest communication and smart home controls."

Actions:
1. Persona suggestion → **Vacation Rental Manager**
2. Feature set: email, sms, payments_stripe, esignatures, documents, airbnb, rentals, events, residents, cameras, lighting, climate, music
3. Prune: `apply-profile.mjs apply --persona=vacation_rental --mode=prune`
4. GitHub repo + Cloudflare Pages
5. Supabase with full property management schema
6. Service setup for each selected integration
7. Final validation + summary

### Example 3: Minimal Setup
User says: "I just need a database and a website for a personal project tracker."

Actions:
1. Persona suggestion → **Slim (core only)** — the default; nothing here needs a heavier persona.
2. Feature set: core only
3. Prune: `apply-profile.mjs apply --persona=slim --mode=prune`
4. GitHub repo + Cloudflare Pages
5. Supabase with tables: `projects`, `tasks`
6. Claude Code permissions
7. Final validation + summary

### Example 4: Adding a Service Later
User says: "Add SMS to my existing project."

Actions:
1. Step 0 detects existing setup → enters Add Mode
2. Reads `.setup-state.json`: persona=small_business, features=[email, payments_stripe]
3. User selects: SMS (Telnyx)
4. Deploys sms_messages + telnyx_config tables, send-sms + telnyx-webhook edge functions, sms-service.js
5. Runs Telnyx credential setup
6. Updates .setup-state.json, docs, .claudeignore
7. Commits and pushes

### Example 5: Personal AI Hub
User says: "I want a smart home dashboard with AI assistant for my house. I have Govee lights, Nest thermostats, Sonos speakers, and cameras."

Actions:
1. Persona suggestion → **Personal AI Hub**
2. Feature set: site_qa, lighting, music, climate, cameras, residents, voice
3. Prune: `apply-profile.mjs apply --persona=personal_ai_hub --mode=prune`
4. GitHub repo + Cloudflare Pages
5. Supabase with device tables
6. Gemini API setup, device config setup
7. Final validation + summary

## Common Issues

### Error: "Supabase CLI not logged in"
Cause: `supabase login` hasn't been run
Solution: Run `supabase login` — opens browser for auth

### Error: "psql connection refused"
Cause: Wrong region in pooler URL or password encoding issue
Solution: Try alternative regions (`aws-1-us-east-2`, `aws-0-us-west-1`). URL-encode special chars in password: `!` → `%21`, `@` → `%40`, `#` → `%23`

### Error: "Edge function returns 404"
Cause: Function not deployed or wrong name
Solution: Run `supabase functions list` to check. Deploy with `supabase functions deploy {name}`. Webhooks need `--no-verify-jwt`.

### Error: "Pages not deploying"
Cause: Cloudflare Pages not connected to repo or wrong branch configured
Solution: Go to Cloudflare dashboard → Pages → select project → Settings → Builds & deployments → verify production branch is `main` and the correct GitHub repo is connected

### Error: "API key invalid" on any service
Cause: Wrong key, expired key, or key for wrong environment (sandbox vs production)
Solution: Re-check the service dashboard. Make sure you're using the right environment's keys.

## Key Technical Details

- **Supabase auth**: Anon key for client-side, never expose service role key
- **RLS**: Enable on ALL tables. Default: public read, authenticated write
- **Edge functions**: Deno/TypeScript. Webhooks need `--no-verify-jwt`
- **Storage**: Public read policies for media buckets
- **psql**: Use session pooler (IPv4 compatible), URL-encode password special chars
- **Telnyx**: Bearer token auth (NOT Basic), JSON body (NOT form-encoded)
- **Square/Stripe**: Sandbox first, production later
- **On-demand context system**: `CLAUDE.md` (~30 lines, always loaded) indexes `docs/*.md` files that Claude loads only when needed. `docs/CREDENTIALS.md` is gitignored. This saves thousands of tokens per conversation.
- **Permissions key**: Use `permissions.allow` array (NOT deprecated `allowedTools`)
