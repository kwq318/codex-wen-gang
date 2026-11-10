"use client";

interface StatusBarProps {
  nodeCount: number;
  edgeCount: number;
  zoom: number;
  saveState: "saved" | "dirty";
  savedAt: number | null;
}

export default function StatusBar({ nodeCount, edgeCount, zoom, saveState, savedAt }: StatusBarProps) {
  const savedText =
    saveState === "dirty"
      ? "正在自动保存..."
      : savedAt
        ? `已保存 ${new Date(savedAt).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "已保存";

  return (
    <footer className="statusbar">
      <span>
        {nodeCount} 个节点 · {edgeCount} 条连线
      </span>
      <span>缩放 {Math.round(zoom * 100)}%</span>
      <span className="hidden md:inline">双击节点编辑文字，拖拽连线，⌘S 保存</span>
      <span className="ml-auto">{savedText}</span>
    </footer>
  );
}
