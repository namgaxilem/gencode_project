"use client";

import { useEffect, useRef, useState } from "react";
import WorkspaceProvider from "../WorkspaceProvider";
import VisualCodeMimic from "../VisualCodeMimic";
import CodeLivePreview from "../CodeLivePreview";
import { Segmented } from "antd";
import { CodeIcon, DesktopIcon } from "@radix-ui/react-icons";

/** Tunables */
const LEFT_COL_PX = 840;   // fixed width for VisualCodeMimic
const MIN_RIGHT_PX = 360;  // minimum needed for preview before switching to toggle
const GAP_PX = 8;          // matches gap-2 (8px)
const SPLIT_MIN_WIDTH = LEFT_COL_PX + MIN_RIGHT_PX + GAP_PX;

export default function ProjectWorkspaceWrapper() {
  return (
    <WorkspaceProvider>
      <ResponsiveSplit />
    </WorkspaceProvider>
  );
}

function ResponsiveSplit() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  const [tab, setTab] = useState<"editor" | "preview">("editor");

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const isSplit = w >= SPLIT_MIN_WIDTH;

  return (
    <div ref={ref} className="w-full h-full">
      {/* Narrow container: toggle */}
      {!isSplit && (
        <div className="flex flex-col h-full">
          <div className="sticky top-0 z-10 bg-white/70 dark:bg-neutral-900/70 backdrop-blur px-2 py-2">
            <Segmented
              size="small"
              value={tab}
              onChange={(v) => setTab(v as any)}
              options={[
                { value: "editor", label: <span className="inline-flex items-center gap-2"><CodeIcon /> Editor</span> },
                { value: "preview", label: <span className="inline-flex items-center gap-2"><DesktopIcon /> Preview</span> },
              ]}
            />
          </div>
          <div className="h-full">
            {tab === "editor" ? (
              <div className="min-w-0 overflow-hidden h-full">
                <VisualCodeMimic />
              </div>
            ) : (
              <div className="min-w-0 overflow-hidden">
                <CodeLivePreview />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wide container: left fixed, right fills remaining */}
      {isSplit && (
        <div className="flex w-full" style={{ gap: GAP_PX }}>
          <div className="shrink-0" style={{ width: LEFT_COL_PX }}>
            <div className="h-full min-w-0 overflow-hidden">
              <VisualCodeMimic />
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <CodeLivePreview />
          </div>
        </div>
      )}
    </div>
  );
}
