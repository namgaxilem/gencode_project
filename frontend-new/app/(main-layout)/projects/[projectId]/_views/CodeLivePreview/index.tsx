"use client";

import React, { useMemo, useRef, useState } from "react";
import { Button, Tooltip, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  ReloadIcon,
  ExternalLinkIcon,
  DesktopIcon,
  MobileIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons";

type DevicePreset = "desktop" | "tablet" | "mobile";

type CodeLivePreviewProps = {
  /** URL to preview; if you want to pass raw HTML, use srcDoc */
  url?: string;
  /** Raw HTML to preview instead of url */
  srcDoc?: string;
  /** Initial device width preset */
  initialPreset?: DevicePreset;
  /** Height of the top toolbar in px */
  toolbarHeight?: number;
  /** Optional className for the outer wrapper */
  className?: string;
};

/**
 * Right-side live preview panel with a browser-like toolbar.
 * Defaults to previewing http://localhost:3000.
 */
export default function CodeLivePreview({
  url = "http://localhost:3000",
  srcDoc,
  initialPreset = "desktop",
  toolbarHeight = 44,
  className = "",
}: CodeLivePreviewProps) {
  // force re-render iframe to reload
  const [frameKey, setFrameKey] = useState<number>(Date.now());
  const [preset, setPreset] = useState<DevicePreset>(initialPreset);

  const widthPx = useMemo(() => {
    switch (preset) {
      case "mobile":
        return 390; // iPhone-ish
      case "tablet":
        return 768;
      default:
        return undefined; // fill available width
    }
  }, [preset]);

  const items: MenuProps["items"] = [
    { key: "mobile", label: "Mobile (390px)", icon: <MobileIcon /> },
    { key: "tablet", label: "Tablet (768px)", icon: <DesktopIcon /> },
    { key: "desktop", label: "Desktop (Fill)", icon: <DesktopIcon /> },
  ];

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    setPreset(key as DevicePreset);
  };

  return (
    <div
      className={[
        "relative h-screen bg-white dark:bg-neutral-900",
        "border-l border-neutral-200 dark:border-neutral-800",
        "flex flex-col",
        className,
      ].join(" ")}
      style={{ minWidth: 360 }}
    >
      {/* Top toolbar */}
      <div
        className="flex items-center gap-2 px-3"
        style={{
          height: toolbarHeight,
          borderBottom: "1px solid",
          borderColor: "var(--tw-prose-body, rgb(229 231 235 / 1))",
        }}
      >
        {/* fake traffic lights (optional) */}
        <div className="hidden md:flex items-center gap-1 mr-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
        </div>

        {/* address bar */}
        <div className="flex-1">
          <div
            className="h-8 flex items-center px-3 rounded-lg border bg-neutral-50/60 dark:bg-neutral-800/50
                       border-neutral-200 dark:border-neutral-700 text-[12px] font-mono text-neutral-600 dark:text-neutral-300"
          >
            {srcDoc ? "(preview.html)" : url}
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center gap-1">
          <Tooltip title="Reload">
            <Button
              size="small"
              type="text"
              icon={<ReloadIcon />}
              onClick={() => setFrameKey(Date.now())}
            />
          </Tooltip>

          <Dropdown menu={{ items, onClick: onMenuClick }} trigger={["click"]}>
            <Tooltip title={`Device: ${preset}`}>
              <Button
                size="small"
                type="text"
                icon={preset === "mobile" ? <MobileIcon /> : <DesktopIcon />}
              />
            </Tooltip>
          </Dropdown>

          {!srcDoc && (
            <Tooltip title="Open in new tab">
              <Button
                size="small"
                type="text"
                icon={<ExternalLinkIcon />}
                onClick={() =>
                  window.open(url, "_blank", "noopener,noreferrer")
                }
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden p-2">
        <div
          className="h-full w-full bg-neutral-100 dark:bg-neutral-950 rounded-xl shadow-inner border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          style={{ width: widthPx }}
        >
          <iframe
            key={frameKey}
            title="code-live-preview"
            className="w-full h-full"
            src={srcDoc ? undefined : url}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
