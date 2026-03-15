/**
 * Open Brain — Ingest Thought Edge Function
 * Reference: https://natesnewsletter.substack.com/p/every-ai-you-use-forgets-you-heres
 *
 * Captures thoughts from two sources:
 * 1. Slack webhooks (message events from a capture channel)
 * 2. Direct POST with { content, source? }
 *
 * For each thought:
 * - Generates a 768-dim embedding via Google gemini-embedding-001 (free)
 * - Extracts structured metadata via OpenRouter (gpt-4o-mini)
 * - Inserts into the `thoughts` table with vector + metadata
 *
 * Required Supabase secrets:
 *   GEMINI_API_KEY      — Google AI Studio key (free)
 *   OPENROUTER_API_KEY  — OpenRouter key (for metadata extraction)
 *   SLACK_BOT_TOKEN     — (optional) Slack bot token for capture channel
 *   SLACK_CAPTURE_CHANNEL — (optional) Channel ID to filter events
 *
 * Deploy: supabase functions deploy ingest-thought --no-verify-jwt
 */

import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Open Brain ingest endpoint. POST to capture.", {
      status: 200,
    });
  }

  const body = await req.json();

  // --- Slack URL verification ---
  if (body.type === "url_verification") {
    return new Response(JSON.stringify({ challenge: body.challenge }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Slack event callback ---
  if (body.type === "event_callback") {
    const event = body.event;

    // Only process new human messages
    if (event.type !== "message" || event.subtype || event.bot_id) {
      return new Response("ignored", { status: 200 });
    }

    const content = event.text;
    const [embedding, metadata] = await Promise.all([
      generateEmbedding(content),
      extractMetadata(content),
    ]);

    const { error } = await supabase.from("thoughts").insert({
      content,
      embedding,
      metadata: {
        ...metadata,
        source: "slack",
        slack_user: event.user,
        slack_channel: event.channel,
        slack_ts: event.ts,
      },
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response("insert error", { status: 500 });
    }
    return new Response("ok", { status: 200 });
  }

  // --- Direct capture ---
  if (body.content) {
    const [embedding, metadata] = await Promise.all([
      generateEmbedding(body.content),
      extractMetadata(body.content),
    ]);

    const { error } = await supabase.from("thoughts").insert({
      content: body.content,
      embedding,
      metadata: {
        ...metadata,
        source: body.source || "direct",
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("No content to ingest", { status: 400 });
});

// --- Embedding via Google Gemini (free, 768 dims) ---
async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    },
  );
  const data = await res.json();
  return data.embedding.values;
}

// --- Metadata extraction via OpenRouter (gpt-4o-mini) ---
async function extractMetadata(
  text: string,
): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                'Extract structured metadata from this thought. Return ONLY valid JSON, no markdown:\n{\n  "type": "person_note|action_item|insight|observation|decision|question",\n  "tags": ["category1", "category2"],\n  "people": ["name1"],\n  "action_items": ["task"],\n  "priority": "high|medium|low"\n}',
            },
            { role: "user", content: text },
          ],
          temperature: 0,
        }),
      },
    );
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content.trim());
  } catch (e) {
    console.error("Metadata extraction failed:", e);
    return {
      type: "observation",
      tags: [],
      people: [],
      action_items: [],
      priority: "low",
    };
  }
}
