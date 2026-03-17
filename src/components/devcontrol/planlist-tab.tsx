"use client";

export function PlanlistTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">PlanList</h1>
        <p className="text-sm text-slate-500">
          Implementation plans, remediation checklists, and project roadmaps
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <p>No plans recorded yet.</p>
        <p className="text-sm mt-2">
          Plans created during Claude Code sessions will appear here.
        </p>
      </div>
    </div>
  );
}
