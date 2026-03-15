# Open Brain — Setup Guide

> **Reference:** [Every AI You Use Forgets You — Here's How to Fix That](https://natesnewsletter.substack.com/p/every-ai-you-use-forgets-you-heres)

> **What this is:** A shared AI memory system. Captures thoughts from Slack (and any MCP client), stores them as vector embeddings in Supabase pgvector, and exposes semantic search via an MCP server that any AI tool can connect to.
>
> **Cost:** $0/month for embeddings (Google Gemini). ~$0.05/month for metadata extraction (OpenRouter).
>
> **Stack:** Supabase (pgvector + edge functions) · Google gemini-embedding-001 (free, 768 dims) · OpenRouter gpt-4o-mini (metadata) · Slack (optional capture)

---

## Prerequisites

- Supabase project (free tier works)
- Google AI Studio API key (free) — https://aistudio.google.com/apikey
- OpenRouter API key — https://openrouter.ai/settings/keys
- Slack workspace (optional, for capture channel)

---

## Phase 1: Database Setup

Run the migration SQL against your Supabase project. You can either:

**Option A — Via Supabase Management API:**
```bash
curl -s -X POST \
  -H "Authorization: Bearer YOUR_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- \
  "https://api.supabase.com/v1/projects/YOUR_PROJECT_REF/database/query" \
  < supabase/migrations/20260314_open_brain.sql
```

**Option B — Via Supabase CLI:**
```bash
supabase db push
```

This creates:
- `vector` extension (pgvector)
- `thoughts` table with 768-dim vector column
- `match_thoughts()` semantic search function
- HNSW index for fast cosine similarity
- RLS policy (service role only)

---

## Phase 2: Set Secrets

```bash
# Required
supabase secrets set GEMINI_API_KEY=your-google-ai-key
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key

# Generate MCP access key
MCP_ACCESS_KEY=$(openssl rand -hex 32)
echo "Save this key: $MCP_ACCESS_KEY"
supabase secrets set MCP_ACCESS_KEY=$MCP_ACCESS_KEY

# Optional — Slack capture
supabase secrets set SLACK_BOT_TOKEN=xoxb-your-bot-token
supabase secrets set SLACK_CAPTURE_CHANNEL=C0123456789
```

---

## Phase 3: Deploy Edge Functions

```bash
supabase functions deploy ingest-thought --no-verify-jwt
supabase functions deploy open-brain-mcp --no-verify-jwt
```

---

## Phase 4: Connect AI Clients

### Claude Code
```bash
claude mcp add --transport http open-brain \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/open-brain-mcp" \
  --header "x-brain-key: YOUR_MCP_ACCESS_KEY"
```

### Claude Desktop
Settings → Connectors → Add custom connector → paste URL with `?key=YOUR_MCP_ACCESS_KEY`

### Cursor / VS Code
Use native remote MCP support or `mcp-remote` bridge with the URL above.

### ChatGPT
Settings → Apps & Connectors → Create connector (requires Developer Mode)
URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/open-brain-mcp?key=YOUR_MCP_ACCESS_KEY`

---

## Phase 5: Slack Capture (Optional)

1. Create a Slack app at https://api.slack.com/apps
2. **OAuth Scopes:** `channels:history`, `groups:history`, `chat:write`
3. **Event Subscriptions → Request URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/ingest-thought`
4. **Subscribe to events:** `message.channels` + `message.groups`
5. Install to workspace and invite bot to your capture channel
6. Set the Slack secrets (Phase 2)

---

## MCP Tools Available

| Tool | Purpose |
|------|---------|
| `search_thoughts` | Semantic vector search — finds thoughts by meaning |
| `browse_recent` | Time-filtered retrieval (e.g., "last 7 days") |
| `stats` | Total count, date range |
| `capture_thought` | Direct write from any MCP client |

---

## Embedding Model

Uses **Google `gemini-embedding-001`** at 768 dimensions:

| | Google (current) | OpenAI 3-small | OpenAI 3-large |
|---|---|---|---|
| MTEB Average | **66.3%** | 62.3% | 64.6% |
| Cost | **$0.00** | $0.02/M tokens | $0.08/M tokens |
| Dimensions | 768 | 1536 | 3072 |
| Storage/thought | ~3 KB | ~6 KB | ~12 KB |

---

## Storage Estimates

| Metric | Value |
|--------|-------|
| Per thought | ~3 KB (vector) + text + metadata |
| 20 thoughts/day | ~60 KB/day |
| Per year | ~22 MB |
| Supabase free tier (500 MB) | ~22 years |

---

## Verification

Test capture:
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-brain-key: YOUR_MCP_ACCESS_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"capture_thought","arguments":{"content":"Hello from Open Brain!","source":"test"}}}' \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/open-brain-mcp"
```

Test search:
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-brain-key: YOUR_MCP_ACCESS_KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_thoughts","arguments":{"query":"greeting","threshold":0.3}}}' \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/open-brain-mcp"
```
