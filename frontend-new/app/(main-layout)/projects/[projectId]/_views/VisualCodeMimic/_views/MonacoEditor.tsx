"use client";

import { ReactNode, useEffect, useState } from "react";

import {
  FileOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  CodeOutlined,
  Html5Outlined,
  GithubOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { SiCss3 } from "react-icons/si";

const COLORS = {
  html: "#e34f26",
  css: "#1572B6",
  js: "#f7df1e",
  ts: "#3178C6",
  json: "#8e8e8e",
  yaml: "#cb171e",
  md: "#0f6cbd",
  img: "#8e44ad",
  zip: "#d35400",
  pdf: "#ff0000",
  excel: "#217346",
  word: "#2B579A",
  ppt: "#D24726",
  shell: "#4EAA25",
  py: "#3776AB",
  java: "#007396",
  go: "#00ADD8",
  rs: "#DEA584",
  rb: "#CC342D",
  php: "#777BB4",
  kt: "#7F52FF",
  swift: "#FA7343",
  c: "#A8B9CC",
  cpp: "#00599C",
  github: "#181717",
  settings: "#8e44ad",
  npm: "#CB3837",
  text: "#6b7280",
} as const;

const tint = (node: ReactNode, color?: string) =>
  color ? <span style={{ color }}>{node}</span> : node;

export function getFileIcon(pathOrName: string): ReactNode {
  const name = pathOrName.split("/").pop()?.toLowerCase() ?? "";
  const ext = name.includes(".") ? name.split(".").pop()! : "";

  // ── Special filenames
  if (name === "readme" || name === "readme.md")
    return tint(<FileMarkdownOutlined />, COLORS.md);
  if (name === ".gitignore" || name === ".gitattributes")
    return tint(<GithubOutlined />, COLORS.github);
  if (name === ".env" || name.startsWith(".env"))
    return tint(<SettingOutlined />, COLORS.settings);
  if (
    name === "package.json" ||
    name === "pnpm-lock.yaml" ||
    name === "yarn.lock"
  )
    return tint(<CodeOutlined />, COLORS.npm);
  if (name.endsWith("config.js") || name.endsWith("config.ts"))
    return tint(<SettingOutlined />, COLORS.settings);

  // ── By extension
  if (ext === "md" || ext === "markdown")
    return tint(<FileMarkdownOutlined />, COLORS.md);
  if (ext === "pdf") return tint(<FilePdfOutlined />, COLORS.pdf);

  const img = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);
  if (img.has(ext)) return tint(<FileImageOutlined />, COLORS.img);

  const zip = new Set(["zip", "rar", "7z", "gz", "tgz", "bz2", "xz"]);
  if (zip.has(ext)) return tint(<FileZipOutlined />, COLORS.zip);

  if (ext === "csv" || ext === "xlsx" || ext === "xls")
    return tint(<FileExcelOutlined />, COLORS.excel);
  if (ext === "doc" || ext === "docx")
    return tint(<FileWordOutlined />, COLORS.word);
  if (ext === "ppt" || ext === "pptx")
    return tint(<FilePptOutlined />, COLORS.ppt);

  if (ext === "html" || ext === "htm")
    return tint(<Html5Outlined />, COLORS.html);
  if (ext === "css") return tint(<SiCss3 />, COLORS.css);

  // Languages / code-ish
  // (Use CodeOutlined with language-colored tint)
  if (ext === "ts" || ext === "tsx") return tint(<CodeOutlined />, COLORS.ts);
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs")
    return tint(<CodeOutlined />, COLORS.js);
  if (ext === "json") return tint(<CodeOutlined />, COLORS.json);
  if (ext === "yml" || ext === "yaml")
    return tint(<CodeOutlined />, COLORS.yaml);
  if (ext === "py") return tint(<CodeOutlined />, COLORS.py);
  if (ext === "java") return tint(<CodeOutlined />, COLORS.java);
  if (ext === "go") return tint(<CodeOutlined />, COLORS.go);
  if (ext === "rs") return tint(<CodeOutlined />, COLORS.rs);
  if (ext === "rb") return tint(<CodeOutlined />, COLORS.rb);
  if (ext === "php") return tint(<CodeOutlined />, COLORS.php);
  if (ext === "kt") return tint(<CodeOutlined />, COLORS.kt);
  if (ext === "swift") return tint(<CodeOutlined />, COLORS.swift);
  if (ext === "c" || ext === "h") return tint(<CodeOutlined />, COLORS.c);
  if (ext === "cpp" || ext === "hpp" || ext === "cc" || ext === "hh")
    return tint(<CodeOutlined />, COLORS.cpp);
  if (ext === "sh" || ext === "bash")
    return tint(<CodeOutlined />, COLORS.shell);
  if (ext === "xml") return tint(<CodeOutlined />, "#006699");

  // Plain text-ish
  if (ext === "txt" || ext === "log")
    return tint(<FileTextOutlined />, COLORS.text);

  // Fallback
  return <FileOutlined />;
}

export function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}
export function guessLang(p: string) {
  const s = (p || "").toLowerCase();
  if (s.endsWith(".tsx") || s.endsWith(".ts")) return "typescript";
  if (s.endsWith(".jsx") || s.endsWith(".js")) return "javascript";
  if (s.endsWith(".json")) return "json";
  if (s.endsWith(".css")) return "css";
  if (s.endsWith(".md")) return "markdown";
  if (s.endsWith(".html") || s.endsWith(".htm")) return "html";
  if (s.endsWith(".yml") || s.endsWith(".yaml")) return "yaml";
  return "plaintext";
}
