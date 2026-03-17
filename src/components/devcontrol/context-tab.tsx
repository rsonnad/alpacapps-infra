"use client";

import { useState, useEffect } from "react";

const CONTEXT_WINDOW = 200_000;

// ═══════════════════════════════════════════════════════════
// CONFIGURE THESE for your project
// ═══════════════════════════════════════════════════════════
const GH_OWNER = "YOUR_GITHUB_OWNER"; // e.g. "rsonnad"
const GH_REPO = "YOUR_GITHUB_REPO";   // e.g. "myproject"
// ═══════════════════════════════════════════════════════════

function charsToTokens(chars: number): number { return Math.round(chars / 4); }
function formatTokens(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString(); }

interface ContextItem {
  name: string;
  path: string;
  category: "instructions" | "memory" | "docs" | "system";
  description: string;
  tokens: number;
}

const CONTEXT_FILES: { name: string; path: string; category: ContextItem["category"]; description: string; githubPath?: string }[] = [
  { name: "Global CLAUDE.md", path: "~/.claude/CLAUDE.md", category: "instructions", description: "User's private global instructions" },
  { name: "Project CLAUDE.md", path: "./CLAUDE.md", category: "instructions", description: "Project-specific directives", githubPath: "CLAUDE.md" },
  { name: "MEMORY.md", path: "memory/MEMORY.md", category: "memory", description: "Memory index" },
  { name: "System prompt", path: "(built-in)", category: "system", description: "Claude base prompt, tool defs, environment" },
  { name: "SCHEMA.md", path: "docs/SCHEMA.md", category: "docs", description: "Database schema", githubPath: "docs/SCHEMA.md" },
  { name: "PATTERNS.md", path: "docs/PATTERNS.md", category: "docs", description: "UI code patterns", githubPath: "docs/PATTERNS.md" },
  { name: "KEY-FILES.md", path: "docs/KEY-FILES.md", category: "docs", description: "Project structure", githubPath: "docs/KEY-FILES.md" },
  { name: "DEPLOY.md", path: "docs/DEPLOY.md", category: "docs", description: "Deployment guide", githubPath: "docs/DEPLOY.md" },
  { name: "INTEGRATIONS.md", path: "docs/INTEGRATIONS.md", category: "docs", description: "External APIs", githubPath: "docs/INTEGRATIONS.md" },
  { name: "CHANGELOG.md", path: "docs/CHANGELOG.md", category: "docs", description: "Recent changes", githubPath: "docs/CHANGELOG.md" },
];

const SYSTEM_PROMPT_TOKENS = 8000;

const CATEGORY_LABELS: Record<string, { label: string; bar: string }> = {
  instructions: { label: "Instructions", bar: "bg-blue-400" },
  memory: { label: "Memory", bar: "bg-purple-400" },
  docs: { label: "On-Demand Docs", bar: "bg-amber-400" },
  system: { label: "System", bar: "bg-slate-400" },
};

export function ContextTab() {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSizes() {
      const fetchPromises = CONTEXT_FILES.map(async (file) => {
        if (file.category === "system") return { ...file, tokens: SYSTEM_PROMPT_TOKENS };
        if (file.githubPath && !GH_OWNER.includes("YOUR_")) {
          try {
            const res = await fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/${file.githubPath}`);
            if (res.ok) { const text = await res.text(); return { ...file, tokens: charsToTokens(text.length) }; }
          } catch {}
        }
        const estimates: Record<string, number> = { "Global CLAUDE.md": 1048, "MEMORY.md": 600 };
        return { ...file, tokens: charsToTokens(estimates[file.name] || 200) };
      });
      setItems(await Promise.all(fetchPromises));
      setLoading(false);
    }
    loadSizes();
  }, []);

  const alwaysLoaded = items.filter((i) => i.category !== "docs");
  const onDemand = items.filter((i) => i.category === "docs");
  const alwaysTokens = alwaysLoaded.reduce((sum, i) => sum + i.tokens, 0);
  const onDemandTokens = onDemand.reduce((sum, i) => sum + i.tokens, 0);
  const totalTokens = alwaysTokens + onDemandTokens;
  const alwaysPct = ((alwaysTokens / CONTEXT_WINDOW) * 100).toFixed(1);
  const totalPct = ((totalTokens / CONTEXT_WINDOW) * 100).toFixed(1);

  const categoryTotals = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + i.tokens;
    return acc;
  }, {});

  if (loading) return <div className="text-center py-12 text-slate-400">Loading file sizes...</div>;

  function renderTable(files: ContextItem[], title: string, subtitle?: string) {
    const total = files.reduce((s, f) => s + f.tokens, 0);
    return (
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mb-3">{subtitle}</p>}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-slate-500 font-medium">File</th>
              <th className="text-left px-4 py-2.5 text-slate-500 font-medium hidden sm:table-cell">Description</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Tokens</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-medium">% of Window</th>
            </tr></thead>
            <tbody>
              {files.sort((a, b) => b.tokens - a.tokens).map((item) => (
                <tr key={item.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${CATEGORY_LABELS[item.category]?.bar}`} />
                      <span className="text-slate-800 font-mono text-xs">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs hidden sm:table-cell">{item.description}</td>
                  <td className="px-4 py-2.5 text-slate-700 text-right tabular-nums font-medium">{formatTokens(item.tokens)}</td>
                  <td className="px-4 py-2.5 text-right"><span className="text-slate-500 tabular-nums text-xs">{((item.tokens / CONTEXT_WINDOW) * 100).toFixed(2)}%</span></td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 text-slate-800 font-semibold">Total</td>
                <td className="px-4 py-2.5 hidden sm:table-cell" />
                <td className="px-4 py-2.5 text-slate-900 text-right tabular-nums font-bold">{formatTokens(total)}</td>
                <td className="px-4 py-2.5 text-right"><span className="text-slate-700 tabular-nums text-xs font-semibold">{((total / CONTEXT_WINDOW) * 100).toFixed(1)}%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Context Window</h1>
        <p className="text-sm text-slate-500">{formatTokens(alwaysTokens)} tokens loaded on startup ({alwaysPct}% of {formatTokens(CONTEXT_WINDOW)} window)</p>
      </div>

      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Context Window Usage</span>
          <span>{formatTokens(CONTEXT_WINDOW)} total capacity</span>
        </div>
        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
          {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, tokens]) => (
            <div key={cat} className={`${CATEGORY_LABELS[cat]?.bar || "bg-slate-300"} h-full`} style={{ width: `${(tokens / CONTEXT_WINDOW) * 100}%` }} title={`${CATEGORY_LABELS[cat]?.label}: ${formatTokens(tokens)}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, tokens]) => (
            <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className={`w-2.5 h-2.5 rounded-sm ${CATEGORY_LABELS[cat]?.bar}`} />
              <span className="font-medium">{CATEGORY_LABELS[cat]?.label}</span>
              <span className="text-slate-400">{formatTokens(tokens)} ({((tokens / CONTEXT_WINDOW) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Always Loaded", value: formatTokens(alwaysTokens), sub: `${alwaysPct}%`, color: "text-emerald-700" },
          { label: "On-Demand Docs", value: formatTokens(onDemandTokens), sub: "loaded as needed", color: "text-amber-700" },
          { label: "Total if All Loaded", value: formatTokens(totalTokens), sub: `${totalPct}%`, color: "text-blue-700" },
          { label: "Remaining for Chat", value: formatTokens(CONTEXT_WINDOW - alwaysTokens), sub: `${(100 - parseFloat(alwaysPct)).toFixed(1)}%`, color: "text-purple-700" },
        ].map((s) => (
          <div key={s.label} className="border border-slate-200 rounded-xl px-4 py-4 text-center bg-white">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {renderTable(alwaysLoaded, "Always Loaded at Startup")}
      {renderTable(onDemand, "On-Demand Docs", "Loaded when the task matches \u2014 not always in context")}
    </div>
  );
}
