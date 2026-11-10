"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileJson,
  FileText,
  Image,
  Moon,
  PanelRight,
  Redo2,
  Save,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Workflow,
} from "lucide-react";

export interface TopBarProps {
  title: string;
  onTitleChange: (value: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onClear: () => void;
  onImportFile: (file: File) => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onCopyMermaid: () => void;
  onDownloadMermaid: () => void;
  aiOpen: boolean;
  onToggleAi: () => void;
  saveState: "saved" | "dirty";
  savedAt: number | null;
}

export default function TopBar(props: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedText =
    props.saveState === "dirty"
      ? "未保存"
      : props.savedAt
        ? `已保存 ${new Date(props.savedAt).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "已保存";

  return (
    <header className="topbar">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
        <Workflow size={17} />
      </div>
      <div className="brand-text text-sm font-bold tracking-normal">Next AI Draw IO</div>
      <input
        className="topbar-title"
        value={props.title}
        onChange={(event) => props.onTitleChange(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        placeholder="未命名图表"
        aria-label="图表标题"
      />

      <div className="toolbar-divider" />

      <button className="btn btn-ghost btn-icon" onClick={props.onUndo} disabled={!props.canUndo} title="撤销 (⌘Z)">
        <Undo2 size={16} />
      </button>
      <button className="btn btn-ghost btn-icon" onClick={props.onRedo} disabled={!props.canRedo} title="重做 (⌘⇧Z)">
        <Redo2 size={16} />
      </button>

      <div className="toolbar-divider" />

      <button className="btn btn-ghost btn-icon" onClick={props.onSave} title="保存 (⌘S)">
        <Save size={16} />
      </button>

      <div className="relative">
        <button
          className="btn btn-ghost h-8 gap-1.5 rounded-md px-2.5 text-sm"
          onClick={() => setMenuOpen((open) => !open)}
          title="导出或导入文件"
        >
          <Download size={15} />
          文件
          <ChevronDown size={13} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="export-menu">
              <button onClick={() => { setMenuOpen(false); props.onExportPng(); }}>
                <Image /> 导出 PNG 图片
              </button>
              <button onClick={() => { setMenuOpen(false); props.onExportJson(); }}>
                <FileJson /> 导出 JSON 工程
              </button>
              <button onClick={() => { setMenuOpen(false); props.onCopyMermaid(); }}>
                <FileText /> 复制 Mermaid
              </button>
              <button onClick={() => { setMenuOpen(false); props.onDownloadMermaid(); }}>
                <Download /> 下载 .mmd
              </button>
              <div className="my-1 h-px bg-line" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                <Upload /> 导入 JSON 工程
              </button>
            </div>
          </>
        )}
      </div>

      <button className="btn btn-danger-ghost btn-icon" onClick={props.onClear} title="清空画布">
        <Trash2 size={16} />
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden text-[11px] text-muted sm:inline">{savedText}</span>
        <button className="btn btn-ghost btn-icon" onClick={props.onToggleTheme} title="切换深浅色主题">
          {props.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          className={`btn btn-icon ${props.aiOpen ? "btn-ghost-active" : "btn-ghost"}`}
          onClick={props.onToggleAi}
          title="打开或关闭 AI 生成面板"
        >
          <PanelRight size={16} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) props.onImportFile(file);
          event.currentTarget.value = "";
        }}
      />
    </header>
  );
}
