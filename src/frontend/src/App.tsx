import { Toaster } from "@/components/ui/sonner";
import { PanelLeft } from "lucide-react";
import { useState } from "react";
import { CartesianGraph } from "./components/CartesianGraph";
import { Sidebar } from "./components/Sidebar";
import { usePoints, useRegions } from "./hooks/useQueries";

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pointColours, setPointColours] = useState<Record<string, string>>({});
  const [regionColours, setRegionColours] = useState<Record<string, string>>(
    {},
  );

  const {
    data: points = [],
    isLoading: isLoadingPoints,
    error: pointsError,
  } = usePoints();

  const {
    data: regions = [],
    isLoading: isLoadingRegions,
    error: regionsError,
  } = useRegions();

  const handleSetPointColour = (id: string, colour: string) => {
    setPointColours((prev) => ({ ...prev, [id]: colour }));
  };

  const handleSetRegionColour = (id: string, colour: string) => {
    setRegionColours((prev) => ({ ...prev, [id]: colour }));
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <Sidebar
        points={points}
        regions={regions}
        isLoadingPoints={isLoadingPoints}
        isLoadingRegions={isLoadingRegions}
        pointsError={pointsError as Error | null}
        regionsError={regionsError as Error | null}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((v) => !v)}
        pointColours={pointColours}
        regionColours={regionColours}
        onSetPointColour={handleSetPointColour}
        onSetRegionColour={handleSetRegionColour}
      />

      {/* Graph Area */}
      <main className="flex-1 h-full overflow-hidden relative">
        {/* Loading overlay */}
        {(isLoadingPoints || isLoadingRegions) && (
          <div className="absolute top-3 right-4 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card/80 border border-border/60 backdrop-blur-sm shadow-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Syncing…</span>
            </div>
          </div>
        )}

        {/* Mobile floating open button — visible only when sidebar is collapsed on mobile */}
        {isCollapsed && (
          <button
            type="button"
            data-ocid="sidebar.open_modal_button"
            onClick={() => setIsCollapsed(false)}
            className="md:hidden absolute top-3 left-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-card/90 border border-border/60 backdrop-blur-sm shadow-md text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <CartesianGraph
          points={points}
          regions={regions}
          pointColours={pointColours}
          regionColours={regionColours}
        />
      </main>

      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}
