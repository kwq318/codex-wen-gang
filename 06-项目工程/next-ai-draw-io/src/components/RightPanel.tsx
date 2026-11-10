"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Cpu,
  Loader2,
  Palette,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { DiagramEdge, DiagramNodeData, NodeKind } from "@/lib/types";
import type { AiSettings } from "@/lib/types";
import type { PromptExample } from "@/lib/examples";

const KIND_OPTIONS: Array<{ value: NodeKind; label: string }> = [
  { value: "rectangle", label: "矩形" },
  { value: "rounded", label: "圆角" },
  { value: "decision", label: "决策菱形" },
  { value: "ellipse", label: "椭圆" },
  { value: "database", label: "数据库" },
  { value: "note", label: "备注" },
  { value: "parallelogram", label: "平行四边形" },
  { value: "hexagon", label: "六边形" },
];

const EDGE_TYPES = [
  { value: "smoothstep", label: "圆角折线" },
  { value: "bezier", label: "贝塞尔曲线" },
  { value: "straight", label: "直线" },
];

const COLOR_SWATCHES = [
  "#4f6ef7",
  "#0ea5a4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#64748b",
  "#e2e8f0",
];

export interface RightPanelProps {
  tab: "ai" | "inspect";
  onTabChange: (tab: "ai" | "inspect") => void;
  onClose: () => void;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  aiLoading: boolean;
  onGenerate: () => void;
  aiSource: "local" | "cloud";
  aiSettings: AiSettings;
  onAiSettingsChange: (settings: AiSettings) => void;
  onSaveAiSettings: () => void;
  promptHistory: string[];
  onUsePrompt: (prompt: string) => void;
  examples: PromptExample[];
  selectedNode: { id: string; data: DiagramNodeData } | null;
  selectedEdge: { id: string; label?: ReactNode; type?: string; animated?: boolean; style?: CSSProperties } | null;
  selectedCount: number;
  onUpdateNode: (patch: Partial<DiagramNodeData>) => void;
  onUpdateEdge: (patch: Partial<DiagramEdge>) => void;
  onDeleteSelection: () => void;
}

function AiTab({
  aiPrompt,
  onAiPromptChange,
  aiLoading,
  onGenerate,
  aiSource,
  aiSettings,
  onAiSettingsChange,
  onSaveAiSettings,
  promptHistory,
  onUsePrompt,
  examples,
}: RightPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            aiSource === "cloud"
              ? "bg-accent/15 text-accent"
              : "bg-ok/15 text-ok"
          }`}
        >
          {aiSource === "cloud" ? <Cpu size={12} /> : <Bot size={12} />}
          {aiSource === "cloud" ? "云端模型" : "本地智能解析"}
        </span>
        <button
          className="btn btn-ghost btn-icon ml-auto"
          onClick={() => setSettingsOpen((open) => !open)}
          title="AI 服务设置"
        >
          <Settings2 size={15} />
        </button>
      </div>

      {settingsOpen && (
        <div className="panel space-y-2.5 p-3">
          <label className="field-label">
            API Key
            <input
              type="password"
              className="field mt-1"
              value={aiSettings.apiKey}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </label>
          <label className="field-label">
            Base URL
            <input
              className="field mt-1"
              value={aiSettings.baseUrl}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label className="field-label">
            模型
            <input
              className="field mt-1"
              value={aiSettings.model}
              onChange={(event) => onAiSettingsChange({ ...aiSettings, model: event.target.value })}
              placeholder="gpt-4o-mini"
            />
          </label>
          <button className="btn btn-accent h-8 w-full" onClick={onSaveAiSettings}>
            <Check size={15} /> 保存设置
          </button>
          <p className="text-[11px] leading-relaxed text-muted">
            不填写 API Key 时使用本地解析，数据不出本机；填写后通过本站接口转发到 OpenAI 兼容服务。
          </p>
        </div>
      )}

      <textarea
        className="field ai-textarea"
        value={aiPrompt}
        onChange={(event) => onAiPromptChange(event.target.value)}
        placeholder={
          "用文字描述图表，例如：\n[开始] 用户上车 -> 语音唤醒 -> (决策) 需要车控?\n(决策) 需要车控? --是--> 车控执行"
        }
      />
      <button className="btn btn-accent h-9 w-full" onClick={onGenerate} disabled={aiLoading || !aiPrompt.trim()}>
        {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {aiLoading ? "正在生成..." : "生成图表"}
      </button>

      <div>
        <div className="field-label">试试示例</div>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <button
              key={example.title}
              className="sample-chip"
              onClick={() => onUsePrompt(example.prompt)}
              title={example.prompt}
            >
              {example.title}
            </button>
          ))}
        </div>
      </div>

      {promptHistory.length > 0 && (
        <div>
          <div className="field-label">最近生成</div>
          <div className="space-y-1">
            {promptHistory.map((prompt, index) => (
              <button
                key={`${prompt.slice(0, 12)}-${index}`}
                className="block w-full truncate rounded-md border border-line bg-surface px-2.5 py-1.5 text-left text-xs text-muted hover:border-accent hover:text-ink"
                onClick={() => onUsePrompt(prompt)}
                title={prompt}
              >
                {prompt.split("\n")[0].slice(0, 34)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InspectorTab({
  selectedNode,
  selectedEdge,
  selectedCount,
  onUpdateNode,
  onUpdateEdge,
  onDeleteSelection,
}: RightPanelProps) {
  if (selectedNode) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <label className="field-label">
          标签
          <input
            className="field mt-1"
            value={selectedNode.data.label}
            onChange={(event) => onUpdateNode({ label: event.target.value })}
          />
        </label>
        <label className="field-label">
          形状
          <select
            className="field mt-1"
            value={selectedNode.data.kind}
            onChange={(event) => onUpdateNode({ kind: event.target.value as NodeKind })}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <div className="field-label">强调色</div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                className={`swatch ${selectedNode.data.color === color ? "swatch-active" : ""}`}
                style={{ background: color }}
                onClick={() => onUpdateNode({ color })}
                title={color}
              />
            ))}
            <label
              className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-md border border-line text-muted"
              title="自定义颜色"
            >
              <Palette size={13} />
              <input
                type="color"
                className="h-0 w-0 opacity-0"
                value={selectedNode.data.color || "#4f6ef7"}
                onChange={(event) => onUpdateNode({ color: event.target.value })}
              />
            </label>
          </div>
        </div>
        <label className="field-label">
          备注（显示在节点内）
          <input
            className="field mt-1"
            value={selectedNode.data.detail || ""}
            onChange={(event) => onUpdateNode({ detail: event.target.value })}
            placeholder="可选"
          />
        </label>
        <button className="btn btn-danger-ghost h-8 w-full" onClick={onDeleteSelection}>
          <Trash2 size={15} /> 删除节点
        </button>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <label className="field-label">
          连线标签
          <input
            className="field mt-1"
            value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
            onChange={(event) => onUpdateEdge({ label: event.target.value })}
            placeholder="可选"
          />
        </label>
        <label className="field-label">
          线型
          <select
            className="field mt-1"
            value={selectedEdge.type || "smoothstep"}
            onChange={(event) => onUpdateEdge({ type: event.target.value })}
          >
            {EDGE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[rgb(var(--accent))]"
            checked={Boolean(selectedEdge.animated)}
            onChange={(event) => onUpdateEdge({ animated: event.target.checked })}
          />
          动画流动效果
        </label>
        <label className="field-label">
          连线颜色
          <input
            type="color"
            className="mt-1 h-8 w-full cursor-pointer rounded-md border border-line bg-surface"
            value={typeof selectedEdge.style?.stroke === "string" ? selectedEdge.style.stroke : "#94a3b8"}
            onChange={(event) => onUpdateEdge({ style: { ...selectedEdge.style, stroke: event.target.value } })}
          />
        </label>
        <button className="btn btn-danger-ghost h-8 w-full" onClick={onDeleteSelection}>
          <Trash2 size={15} /> 删除连线
        </button>
      </div>
    );
  }

  if (selectedCount > 0) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <p className="text-sm text-muted">已选中 {selectedCount} 个元素</p>
        <button className="btn btn-danger-ghost h-8 w-full" onClick={onDeleteSelection}>
          <Trash2 size={15} /> 删除选中
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-sm leading-relaxed text-muted">
      选中画布中的节点或连线后，可在这里调整标签、形状、颜色等属性。
    </div>
  );
}

export default function RightPanel(props: RightPanelProps) {
  return (
    <aside className="right-panel">
      <div className="flex h-11 flex-none items-center gap-1 border-b border-line px-2">
        <button
          className={`btn h-8 flex-1 rounded-md px-2 text-[13px] font-medium ${
            props.tab === "ai" ? "bg-accent/12 text-accent" : "text-muted hover:text-ink"
          }`}
          onClick={() => props.onTabChange("ai")}
        >
          <Sparkles size={14} /> AI 生成
        </button>
        <button
          className={`btn h-8 flex-1 rounded-md px-2 text-[13px] font-medium ${
            props.tab === "inspect" ? "bg-accent/12 text-accent" : "text-muted hover:text-ink"
          }`}
          onClick={() => props.onTabChange("inspect")}
        >
          <SlidersHorizontal size={14} /> 属性
        </button>
        <button className="btn btn-ghost btn-icon" onClick={props.onClose} title="关闭面板">
          <X size={15} />
        </button>
      </div>
      {props.tab === "ai" ? <AiTab {...props} /> : <InspectorTab {...props} />}
    </aside>
  );
}
