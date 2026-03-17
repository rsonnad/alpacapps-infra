"use client";

import { useEffect, useState } from "react";

// ═══════════════════════════════════════════════════════════
// CONFIGURE THESE for your project
// ═══════════════════════════════════════════════════════════
const GH_OWNER = "YOUR_GITHUB_OWNER"; // e.g. "rsonnad"
const GH_REPO = "YOUR_GITHUB_REPO";   // e.g. "myproject"
// ═══════════════════════════════════════════════════════════

const GH_API = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}`;

interface PRDetail {
  number: number;
  title: string;
  merged_at: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  version?: string;
}

function categorize(title: string): { label: string; color: string } {
  const t = title.toLowerCase();
  if (t.startsWith("fix") || t.includes("bug")) return { label: "Fix", color: "rose" };
  if (t.includes("add") || t.includes("new")) return { label: "New", color: "emerald" };
  if (t.includes("rewrite") || t.includes("refactor") || t.includes("redesign")) return { label: "Rewrite", color: "violet" };
  return { label: "Update", color: "sky" };
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function groupByDate(prs: PRDetail[]): { label: string; prs: PRDetail[] }[] {
  const groups: Map<string, PRDetail[]> = new Map();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const pr of prs) {
    const d = new Date(pr.merged_at).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(pr.merged_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(pr);
  }
  return Array.from(groups.entries()).map(([label, prs]) => ({ label, prs }));
}

const TAG_COLORS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

function isConfigured() { return !GH_OWNER.includes("YOUR_"); }

export function ReleasesTab() {
  const [prs, setPrs] = useState<PRDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLines, setTotalLines] = useState(0);

  useEffect(() => {
    if (!isConfigured()) { setLoading(false); return; }
    async function loadData() {
      try {
        const [prListRes, commitsRes] = await Promise.all([
          fetch(`${GH_API}/pulls?state=closed&sort=updated&direction=desc&per_page=50`),
          fetch(`${GH_API}/commits?per_page=100`),
        ]);
        if (!prListRes.ok) throw new Error(`GitHub API ${prListRes.status}`);
        const prList = (await prListRes.json()).filter((pr: { merged_at: string }) => pr.merged_at);
        const commits = commitsRes.ok ? await commitsRes.json() : [];

        const prToVersionSha: Record<number, string> = {};
        for (let i = 0; i < commits.length; i++) {
          if (commits[i].commit.message.startsWith("chore: bump version")) {
            const next = commits[i + 1];
            if (next) { const m = next.commit.message.match(/Merge pull request #(\d+)/); if (m) prToVersionSha[parseInt(m[1])] = commits[i].sha; }
          }
        }

        const detailPromises = prList.map((pr: { number: number }) =>
          fetch(`${GH_API}/pulls/${pr.number}`).then((r) => r.ok ? r.json() : null).catch(() => null)
        );
        const versionShas = [...new Set(Object.values(prToVersionSha))];
        const versionPromises = versionShas.map((sha) =>
          fetch(`${RAW_BASE}/${sha}/version.json`).then((r) => r.ok ? r.json() : null).catch(() => null)
        );

        const [prDetails, ...versionResults] = await Promise.all([Promise.all(detailPromises), ...versionPromises]);
        const shaToVersion: Record<string, string> = {};
        versionShas.forEach((sha, i) => { const v = versionResults[i] as { version?: string } | null; if (v?.version) shaToVersion[sha] = v.version; });

        const enriched: PRDetail[] = prList.map((pr: { number: number }, idx: number) => {
          const d = prDetails[idx] as PRDetail | null;
          const vSha = prToVersionSha[pr.number];
          return { ...pr, additions: d?.additions ?? 0, deletions: d?.deletions ?? 0, changed_files: d?.changed_files ?? 0, version: vSha ? shaToVersion[vSha] : undefined };
        });

        setPrs(enriched);
        setTotalLines(enriched.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0));
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to fetch"); }
      setLoading(false);
    }
    loadData();
  }, []);

  if (!isConfigured()) {
    return (
      <div className="rounded-xl border border-slate-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Not Configured</h2>
        <p className="text-sm text-slate-500">Set <code>GH_OWNER</code> and <code>GH_REPO</code> in <code>releases-tab.tsx</code>.</p>
      </div>
    );
  }

  const groups = groupByDate(prs);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Changelog</h1>
          <p className="text-sm text-slate-500 mt-1">{loading ? "Loading..." : `${prs.length} changes shipped \u00b7 ${totalLines.toLocaleString()} lines changed`}</p>
        </div>
        <a href={`https://github.com/${GH_OWNER}/${GH_REPO}/pulls?q=is%3Apr+is%3Amerged`} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-slate-700 flex items-center gap-1.5">
          View on GitHub &rarr;
        </a>
      </div>

      {error && <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-red-50 border border-red-200 text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-400">Loading changelog...</div>
      ) : prs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-400">No changes recorded yet.</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{group.label}</h2>
              <div className="space-y-2">
                {group.prs.map((pr) => {
                  const cat = categorize(pr.title);
                  const lines = pr.additions + pr.deletions;
                  return (
                    <a key={pr.number} href={pr.html_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3.5 hover:border-slate-400 transition-colors group">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border shrink-0 ${TAG_COLORS[cat.color]}`}>{cat.label}</span>
                      <span className="text-sm text-slate-800 group-hover:text-slate-900 truncate">{pr.title}</span>
                      <div className="ml-auto flex items-center gap-3 shrink-0">
                        {pr.version && <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{pr.version}</span>}
                        {lines > 0 && <span className="text-xs text-slate-400 tabular-nums"><span className="text-emerald-600">+{pr.additions}</span> <span className="text-rose-600">-{pr.deletions}</span></span>}
                        <span className="text-xs text-slate-400">#{pr.number}</span>
                        <span className="text-xs text-slate-400 hidden sm:inline">{fmtDate(pr.merged_at)}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
