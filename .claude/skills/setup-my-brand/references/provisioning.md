# Credential Provisioning — One Key Per Provider

> Design rule: the user provides exactly ONE credential per provider.
> The wizard mints, configures, and verifies everything else programmatically.
> Never ask the user to click through a provider dashboard when an API exists.

## Principles

1. **One credential per provider.** Cloudflare: a token-minting token. Supabase: a Management API token. Google: a single `gcloud auth login` browser flow.
2. **Mint, don't share.** Scoped credentials are created by the wizard via API, named `my-brand-*`, and saved the moment they are returned (minted token values are shown exactly once).
3. **Secrets flow down only.** Every minted value goes to the credential manager (Bitwarden via `bw-read` pattern) and the gitignored `.env`. Never to git, chat, or screenshots.
4. **Idempotency.** Check-by-name before every create (tokens, buckets, D1 databases, OAuth brands/clients). Re-runs must not duplicate resources.
5. **Verify after every mint.** Cloudflare: `POST /user/tokens/verify`. Supabase: `SELECT 1` via the query endpoint. Google: a test OAuth round-trip at the end.
6. **Revocation path.** `scripts/revoke-setup.sh` lists and deletes everything minted by name prefix `my-brand-`.

---

## Cloudflare — Minting Token

The user creates ONE token; the wizard mints all scoped tokens from it.

### User step (the only manual Cloudflare step)

> 1. Open https://dash.cloudflare.com/profile/api-tokens → Create Token → Custom token
> 2. Add permissions: **Account → API Tokens → Write** and **Account → Account Settings → Read**
> 3. Account Resources: All accounts. Click Continue → Create Token → copy it

### Wizard steps

1. **Verify** the minting token:
   ```bash
   curl -s -H "Authorization: Bearer $CF_MINT_TOKEN" \
     "https://api.cloudflare.com/client/v4/user/tokens/verify"
   ```
2. **List accounts** to get `account_id`:
   ```bash
   curl -s -H "Authorization: Bearer $CF_MINT_TOKEN" \
     "https://api.cloudflare.com/client/v4/accounts"
   ```
3. **Fetch permission groups** (IDs are per-account — never hardcode):
   ```bash
   curl -s -H "Authorization: Bearer $CF_MINT_TOKEN" \
     "https://api.cloudflare.com/client/v4/user/tokens/permission_groups"
   ```
   Note the IDs for: DNS Write (zone), Pages Write, Workers Scripts Write, R2 Write, D1 Write, Zone Read.
4. **Mint scoped tokens** via `POST /client/v4/user/tokens` (requires only API Tokens Write on the minting token; the response `result.value` is the minted secret — shown once, save immediately):
   | Token name | Permissions | Resource scope |
   |---|---|---|
   | `my-brand-dns` | DNS Write + Zone Read | the project zone only |
   | `my-brand-pages-deploy` | Pages Write | account |
   | `my-brand-workers` | Workers Scripts Write | account |
   | `my-brand-r2` | R2 Write | account |
   | `my-brand-d1` | D1 Write | account |
5. **Save each value immediately** to the credential manager and gitignored `.env`.
6. **Verify each minted token** with `POST /user/tokens/verify` using that token.
7. Continue all Cloudflare configuration (zones, DNS, D1, R2, Pages) using the scoped tokens — never the minting token.
8. **Renewal:** keep the minting token in the credential manager as the path to mint tokens for future feature packs. The user may delete it instead; record their choice in `docs/CREDENTIALS.md`.

### Notes

- Permission-group IDs are per-account — always fetch them dynamically, never hardcode.
- Minted tokens cannot grant permissions the underlying account lacks.
- Account-scoped creation (`POST /accounts/{id}/tokens`) also works; user-level is fine for setup.

---

## Supabase — One Management Token, Zero Dashboard Visits

### User step (the only manual Supabase step)

> 1. Open https://supabase.com/dashboard/account/tokens
> 2. Click **Generate new token**, name it `my-brand-setup`
> 3. Copy the `sbp_...` token and paste it here

### Wizard steps (all with the same `sbp_` token)

1. **Org:** `GET /v1/organizations`; if empty, `POST /v1/organizations` `{"name": "Personal"}`
2. **Project:** `POST /v1/projects` with name, org id, region, plan `free`, generated `db_pass` (save it). Poll `GET /v1/projects/{ref}` until `status: ACTIVE_HEALTHY`.
3. **Keys:** `GET /v1/projects/{ref}/api-keys`
4. **Migrations:** run every SQL file in order via `POST /v1/projects/{ref}/database/query` (one call per migration, in filename order)
5. **Session pooling (automatic):** `PATCH /v1/projects/{ref}/database/pooling` with `{"pool_mode": "session", "default_pool_size": 10, "max_client_conn": 100}` — the user never touches pooling settings. Read back with `GET` to confirm.
6. **Auth config (automatic):** `PATCH /v1/projects/{ref}/auth/config`:
   - `site_url` → `https://YOUR_DOMAIN`
   - `redirect_urls` → `["https://YOUR_DOMAIN/**", "https://in.YOUR_DOMAIN/**"]`
   - Google provider (from the Google step): `external_google_enabled: true`, `external_google_client_id`, `external_google_secret`, `external_google_redirect_uri: https://{REF}.supabase.co/auth/v1/callback`
   - Custom SMTP when the comms pack is installed
7. **Edge function secrets:** `POST /v1/projects/{ref}/secrets` (array of `{name, value}`)
8. **CLI fallback:** for anything the REST API does not expose, use the Supabase CLI with the same access token (`SUPABASE_ACCESS_TOKEN=$SBP_TOKEN supabase ...`). Never ask the user to open the dashboard.
9. **Validate:** `SELECT 1` via query endpoint; GET auth config round-trip; deploy one function and invoke it.

### Runtime validation note

The Management API evolves. At setup time, confirm endpoint shapes against the live OpenAPI spec (`https://api.supabase.com/api/v1`) before first use, and record any drift in `docs/INTEGRATIONS.md`.

---

## Google Cloud — Programmatic OAuth Setup

Confirmed capability: the **OAuth Config Editor** role (`roles/oauthconfig.editor`, Beta) grants `clientauthconfig.brands.create`, `clientauthconfig.clients.create`, `clientauthconfig.clients.createSecret`, `clientauthconfig.clients.getWithSecret`, `oauthconfig.testusers.update`, and `oauthconfig.verification.submit/update`. The entire OAuth setup is scriptable.

### User step (the only manual Google step)

> Run `gcloud auth login` in your terminal and complete the browser flow.

### Wizard steps

1. **Project:** create (`POST cloudresourcemanager projects`) or select existing; note `PROJECT_ID`
2. **Enable APIs** via Service Usage: `clientauthconfig.googleapis.com`, `iam.googleapis.com`, `serviceusage.googleapis.com` (+ `generativelanguage.googleapis.com` if Gemini selected)
3. **Provisioner principal:** create service account `my-brand-oauth-setup`, grant `roles/oauthconfig.editor`, mint a key JSON, store it
4. **OAuth brand (consent screen):** `POST https://clientauthconfig.googleapis.com/v1/projects/{PROJECT_ID}/brands` with app name + support email
5. **OAuth client:** `POST .../brands/{BRAND_ID}/clients` (type web) with redirect URI `https://{REF}.supabase.co/auth/v1/callback`; fetch the secret via `clients.getWithSecret`
6. **Test users:** `oauthconfig.testusers.update` with the user's email (app stays in Testing mode until publish)
7. **Wire into Supabase:** feed client ID/secret into `PATCH /v1/projects/{ref}/auth/config` (see above) — no dashboard step
8. **Go-live:** when the user is ready to publish, submit via `oauthconfig.verification.submit` (or fall back to one pre-filled console URL)
9. **Validate:** perform a real sign-in on the deployed site and confirm the Supabase callback completes

### Fallback

If a beta endpoint rejects a step, open ONE pre-filled console URL for that specific step and have the user paste the resulting client JSON. Everything else stays automated.

---

## What the user actually does (target UX)

| Provider | User does | Everything else |
|---|---|---|
| Cloudflare | Create 1 minting token (2 permissions) | Wizard mints 5 scoped tokens, configures DNS/D1/R2/Pages |
| Supabase | Paste 1 `sbp_` token | Wizard creates project, runs migrations, configures pooling + auth + secrets |
| Google | `gcloud auth login` once | Wizard creates project, consent screen, OAuth client, wires Supabase |
