"use client";

import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// CONFIGURE THESE — same values as sessions-tab.tsx
// ═══════════════════════════════════════════════════════════
const API_BASE = "YOUR_SESSIONS_WORKER_URL";
const API_TOKEN = "YOUR_SESSIONS_AUTH_TOKEN";
const PROJECT_FILTER = "YOUR_PROJECT_NAME";
// ═══════════════════════════════════════════════════════════

interface Stats { total_sessions: number; total_tokens: number; total_cost: number; avg_tokens: number; }
interface Session { id: string; project: string; model: string; started_at: string; token_count: number; cost_usd: number; }

function fmt(n: number) { return n ? n.toLocaleString() : "0"; }
function fmtCost(n: number) { return n ? `$${n.toFixed(2)}` : "$0.00"; }

function groupByDay(sessions: Session[]) {
  const map: Record<string, { tokens: number; sessions: number }> = {};
  for (const s of sessions) {
    const d = s.started_at ? new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "unknown";
    if (!map[d]) map[d] = { tokens: 0, sessions: 0 };
    map[d].tokens += s.token_count || 0;
    map[d].sessions += 1;
  }
  return Object.entries(map).map(([date, data]) => ({ date, ...data })).reverse();
}

function isConfigured() {
  return API_BASE && !API_BASE.includes("YOUR_");
}

export function TokensTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured()) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${API_TOKEN}` };
    Promise.all([
      fetch(`${API_BASE}/stats?project=${PROJECT_FILTER}`, { headers }).then((r) => r.ok ? r.json() : null),
      fetch(`${API_BASE}/sessions?limit=200&project=${PROJECT_FILTER}`, { headers }).then((r) => r.ok ? r.json() : null),
    ]).then(([s, d]) => {
      if (s) setStats(s);
      if (d) setSessions(d.sessions || d || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!isConfigured()) {
    return (
      <div className="rounded-xl border border-slate-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Not Configured</h2>
        <p className="text-sm text-slate-500">Deploy your session worker first.</p>
      </div>
    );
  }

  const byDay = groupByDay(sessions);
  const maxDayTokens = Math.max(...byDay.map((d) => d.tokens), 1);

  const byModel: Record<string, { tokens: number; sessions: number }> = {};
  for (const s of sessions) {
    const k = s.model ? s.model.replace("claude-", "").split("-202")[0] : "unknown";
    if (!byModel[k]) byModel[k] = { tokens: 0, sessions: 0 };
    byModel[k].tokens += s.token_count || 0;
    byModel[k].sessions += 1;
  }
  const modelEntries = Object.entries(byModel).map(([key, data]) => ({ key, ...data })).sort((a, b) => b.tokens - a.tokens);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Tokens & Cost</h1>
        <p className="text-sm text-slate-500">Token usage and session analytics for this project</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Tokens", value: fmt(stats?.total_tokens || 0), color: "text-emerald-700" },
          { label: "Total Cost", value: fmtCost(stats?.total_cost || 0), color: "text-amber-700" },
          { label: "Avg / Session", value: fmt(Math.round(stats?.avg_tokens || 0)), color: "text-blue-700" },
          { label: "Sessions", value: fmt(stats?.total_sessions || 0), color: "text-purple-700" },
        ].map((s) => (
          <div key={s.label} className="border border-slate-200 rounded-xl px-4 py-4 text-center bg-white">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {byDay.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Daily Token Usage</h2>
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="space-y-2">
              {byDay.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16 shrink-0">{day.date}</span>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg" style={{ width: `${(day.tokens / maxDayTokens) * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-600 tabular-nums w-20 text-right font-medium">{fmt(day.tokens)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modelEntries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">By Model</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Model</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Sessions</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {modelEntries.map((row) => (
                  <tr key={row.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800 font-mono text-xs">{row.key}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-right tabular-nums">{row.sessions}</td>
                    <td className="px-4 py-2.5 text-slate-700 text-right tabular-nums">{fmt(row.tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
