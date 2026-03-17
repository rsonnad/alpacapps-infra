"use client";

import { useParams } from "next/navigation";
import { OverviewTab } from "./overview-tab";
import { ReleasesTab } from "./releases-tab";
import { SessionsTab } from "./sessions-tab";
import { TokensTab } from "./tokens-tab";
import { ContextTab } from "./context-tab";
import { BackupsTab } from "./backups-tab";
import { PlanlistTab } from "./planlist-tab";

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  overview: OverviewTab,
  releases: ReleasesTab,
  sessions: SessionsTab,
  tokens: TokensTab,
  context: ContextTab,
  backups: BackupsTab,
  planlist: PlanlistTab,
};

export function DevControlTabContent() {
  const params = useParams();
  const tab = params.tab as string;

  const Component = TAB_COMPONENTS[tab];
  if (!Component) {
    return (
      <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <p>Unknown DevControl tab: {tab}</p>
      </div>
    );
  }

  return <Component />;
}
