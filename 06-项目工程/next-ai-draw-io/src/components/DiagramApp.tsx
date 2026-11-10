"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import DiagramNodeComponent from "@/components/DiagramNode";
import RightPanel from "@/components/RightPanel";
import ShapePalette from "@/components/ShapePalette";
import StatusBar from "@/components/StatusBar";
import TopBar from "@/components/TopBar";
import { generateWithAi } from "@/lib/aiClient";
import { buildDocFromAiJson, nodeSize } from "@/lib/diagramParser";
import { PROMPT_EXAMPLES } from "@/lib/examples";
import { toMermaid } from "@/lib/mermaid";
import {
  AI_SETTINGS_KEY,
  THEME_KEY,
  createSeedDoc,
  loadDoc,
  loadPromptHistory,
  saveDoc,
  savePromptHistory,
} from "@/lib/storage";
import type {
  AiSettings,
  DiagramDoc,
  DiagramEdge,
  DiagramNode,
  DiagramNodeData,
  NodeKind,
} from "@/lib/types";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function DiagramAppInner() {
  const rf = useReactFlow();
  const initialRef = useRef<DiagramDoc | null>(null);
  if (!initialRef.current) initialRef.current = loadDoc() ?? createSeedDoc();
  const initialDoc = initialRef.current;

  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>(initialDoc.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdge>(initialDoc.edges);
  const [title, setTitle] = useState(initialDoc.title);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [saveState, setSaveState] = useState<"saved" | "dirty">("saved");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [aiOpen, setAiOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"ai" | "inspect">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<"local" | "cloud">("local");
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    try {
      const raw = window.localStorage.getItem(AI_SETTINGS_KEY);
      if (raw) return { apiKey: "", baseUrl: "", model: "gpt-4o-mini", ...JSON.parse(raw) };
    } catch {
      // 忽略损坏的设置
    }
    return { apiKey: "", baseUrl: "", model: "gpt-4o-mini" };
  });
  const [promptHistory, setPromptHistory] = useState<string[]>(() => loadPromptHistory());
  const [toast, setToast] = useState<string | null>(null);
  const [, setHistoryTick] = useState(0);

  const pastRef = useRef<DiagramDoc[]>([]);
  const futureRef = useRef<DiagramDoc[]>([]);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const titleRef = useRef(title);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const bumpHistory = useCallback(() => setHistoryTick((tick) => tick + 1), []);

  const pushHistory = useCallback(() => {
    pastRef.current.push({
      version: 1,
      title: titleRef.current,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    if (pastRef.current.length > 100) pastRef.current.shift();
    futureRef.current = [];
    bumpHistory();
  }, [bumpHistory]);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push({
      version: 1,
      title: titleRef.current,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    setTitle(prev.title);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    bumpHistory();
  }, [bumpHistory, setEdges, setNodes, setTitle]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({
      version: 1,
      title: titleRef.current,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    setTitle(next.title);
    setNodes(next.nodes);
    setEdges(next.edges);
    bumpHistory();
  }, [bumpHistory, setEdges, setNodes, setTitle]);

  useEffect(() => {
    setSaveState("dirty");
    const timer = window.setTimeout(() => {
      saveDoc({ version: 1, title, nodes, edges });
      setSaveState("saved");
      setSavedAt(Date.now());
    }, 600);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, title]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // 忽略存储异常
    }
  }, [theme]);

  const saveNow = useCallback(() => {
    saveDoc({
      version: 1,
      title: titleRef.current,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    setSaveState("saved");
    setSavedAt(Date.now());
    showToast("已保存到本地");
  }, [showToast]);

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      const edge: DiagramEdge = {
        ...connection,
        id: uid("e"),
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#94a3b8" },
        labelStyle: { fill: "rgb(var(--ink))", fontSize: 11 },
      };
      setEdges((current) => addEdge(edge, current));
    },
    [pushHistory, setEdges]
  );

  const onNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onMove = useCallback((_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
    setZoom(viewport.zoom);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/next-ai-draw");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { kind?: NodeKind };
        const kind = parsed.kind ?? "rectangle";
        const size = nodeSize(kind, "新节点");
        const position = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        pushHistory();
        setNodes((current) => [
          ...current,
          {
            id: uid("n"),
            type: "diagram",
            position,
            width: size.width,
            height: size.height,
            data: { label: "新节点", kind, color: "#4f6ef7" },
          },
        ]);
      } catch {
        // 拖拽数据异常时忽略
      }
    },
    [pushHistory, rf, setNodes]
  );

  const addShape = useCallback(
    (kind: NodeKind) => {
      const size = nodeSize(kind, "新节点");
      const center = rf.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      pushHistory();
      setNodes((current) => [
        ...current,
        {
          id: uid("n"),
          type: "diagram",
          position: center,
          width: size.width,
          height: size.height,
          data: { label: "新节点", kind, color: "#4f6ef7" },
        },
      ]);
    },
    [pushHistory, rf, setNodes]
  );

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    const hasSelectedEdges = edgesRef.current.some((e) => e.selected);
    if (selectedNodeIds.size === 0 && !hasSelectedEdges) return;
    pushHistory();
    if (selectedNodeIds.size > 0) {
      setNodes((current) => current.filter((n) => !selectedNodeIds.has(n.id)));
      setEdges((current) =>
        current.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target))
      );
    } else {
      setEdges((current) => current.filter((e) => !e.selected));
    }
  }, [pushHistory, setEdges, setNodes]);

  const duplicateSelected = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected);
    if (selected.length === 0) return;
    pushHistory();
    const clones = selected.map((n) => ({
      ...n,
      id: uid("n"),
      position: { x: n.position.x + 28, y: n.position.y + 28 },
      selected: false,
      data: { ...n.data },
    }));
    setNodes((current) => [...current, ...clones]);
  }, [pushHistory, setNodes]);

  const clearCanvas = useCallback(() => {
    if (nodesRef.current.length === 0 && edgesRef.current.length === 0) {
      showToast("画布已经是空的");
      return;
    }
    if (!window.confirm("确定清空整个画布吗？可以按 ⌘Z 撤销。")) return;
    pushHistory();
    setNodes([]);
    setEdges([]);
    showToast("画布已清空");
  }, [pushHistory, setEdges, setNodes, showToast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        event.preventDefault();
        redo();
      } else if (mod && key === "s") {
        event.preventDefault();
        saveNow();
      } else if (mod && key === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (!mod && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, duplicateSelected, redo, saveNow, undo]);

  const currentDoc = (): DiagramDoc => ({
    version: 1,
    title: titleRef.current,
    nodes: nodesRef.current,
    edges: edgesRef.current,
  });

  const exportJson = useCallback(() => {
    downloadBlob(
      new Blob([JSON.stringify(currentDoc(), null, 2)], { type: "application/json" }),
      `${titleRef.current || "diagram"}.drawio.json`
    );
    showToast("已导出 JSON 工程");
  }, [showToast]);

  const exportPng = useCallback(async () => {
    const el = document.querySelector(".react-flow");
    if (!(el instanceof HTMLElement)) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: theme === "dark" ? "#0d0f13" : "#ffffff",
        pixelRatio: 2,
        width: el.clientWidth,
        height: el.clientHeight,
      });
      const link = document.createElement("a");
      link.download = `${titleRef.current || "diagram"}.png`;
      link.href = dataUrl;
      link.click();
      showToast("已导出 PNG 图片");
    } catch {
      showToast("PNG 导出失败，请重试");
    }
  }, [showToast, theme]);

  const copyMermaid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toMermaid(currentDoc()));
      showToast("Mermaid 已复制到剪贴板");
    } catch {
      showToast("复制失败，请手动选择");
    }
  }, [showToast]);

  const downloadMermaid = useCallback(() => {
    downloadBlob(
      new Blob([toMermaid(currentDoc())], { type: "text/plain" }),
      `${titleRef.current || "diagram"}.mmd`
    );
    showToast("已下载 Mermaid 文件");
  }, [showToast]);

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const doc = JSON.parse(String(reader.result)) as DiagramDoc;
          if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
            throw new Error("结构不完整");
          }
          pushHistory();
          setNodes(doc.nodes);
          setEdges(doc.edges);
          if (doc.title) setTitle(doc.title);
          showToast(`已导入 ${doc.nodes.length} 个节点`);
        } catch {
          showToast("JSON 格式不正确，导入失败");
        }
      };
      reader.readAsText(file);
    },
    [pushHistory, setEdges, setNodes, setTitle, showToast]
  );

  const saveAiSettings = useCallback(() => {
    try {
      window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
    } catch {
      // 忽略存储异常
    }
    setAiSource(aiSettings.apiKey.trim() ? "cloud" : "local");
    showToast("AI 设置已保存");
  }, [aiSettings, showToast]);

  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await generateWithAi(aiPrompt, aiSettings);
      const doc = buildDocFromAiJson(result);
      pushHistory();
      setNodes(doc.nodes);
      setEdges(doc.edges);
      if (doc.title) setTitle(doc.title);
      setAiSource(result.source);
      const nextHistory = [aiPrompt, ...promptHistory].slice(0, 12);
      setPromptHistory(nextHistory);
      savePromptHistory(nextHistory);
      window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 60);
      showToast(
        `已生成 ${doc.nodes.length} 个节点、${doc.edges.length} 条连线${
          result.source === "cloud" ? "（云端模型）" : "（本地解析）"
        }`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "生成失败");
    } finally {
      setAiLoading(false);
    }
  }, [
    aiLoading,
    aiPrompt,
    aiSettings,
    promptHistory,
    pushHistory,
    rf,
    setEdges,
    setNodes,
    setTitle,
    showToast,
  ]);

  const usePrompt = useCallback((prompt: string) => {
    setAiPrompt(prompt);
    setPanelTab("ai");
  }, []);

  const selectedNode = useMemo(() => {
    const node = nodes.find((n) => n.selected);
    return node ? { id: node.id, data: node.data } : null;
  }, [nodes]);

  const selectedEdge = useMemo(() => edges.find((e) => e.selected) ?? null, [edges]);

  const selectedCount =
    nodes.filter((n) => n.selected).length + edges.filter((e) => e.selected).length;

  const updateNode = useCallback(
    (patch: Partial<DiagramNodeData>) => {
      const selected = nodesRef.current.find((n) => n.selected);
      if (!selected) return;
      pushHistory();
      setNodes((current) =>
        current.map((n) => (n.id === selected.id ? { ...n, data: { ...n.data, ...patch } } : n))
      );
    },
    [pushHistory, setNodes]
  );

  const updateEdge = useCallback(
    (patch: Partial<DiagramEdge>) => {
      const selected = edgesRef.current.find((e) => e.selected);
      if (!selected) return;
      pushHistory();
      setEdges((current) =>
        current.map((e) => (e.id === selected.id ? { ...e, ...patch } : e))
      );
    },
    [pushHistory, setEdges]
  );

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const nodeTypes = useMemo(() => ({ diagram: DiagramNodeComponent }), []);
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return (
    <div className="app-shell" data-theme={theme}>
      <TopBar
        title={title}
        onTitleChange={setTitle}
        theme={theme}
        onToggleTheme={toggleTheme}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={saveNow}
        onClear={clearCanvas}
        onImportFile={importFile}
        onExportPng={exportPng}
        onExportJson={exportJson}
        onCopyMermaid={copyMermaid}
        onDownloadMermaid={downloadMermaid}
        aiOpen={aiOpen}
        onToggleAi={() => setAiOpen((open) => !open)}
        saveState={saveState}
        savedAt={savedAt}
      />
      <div className="workspace">
        <ShapePalette onAddShape={addShape} />
        <div className="canvas-wrap">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStart={onNodeDragStart}
            onMove={onMove}
            nodeTypes={nodeTypes}
            colorMode={theme}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={2.5}
            deleteKeyCode={null}
            selectionKeyCode="Shift"
            multiSelectionKeyCode="Meta"
            panOnScroll
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => ((node.data as DiagramNodeData).color || "#4f6ef7")}
              maskColor="rgb(var(--accent) / 0.08)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {aiOpen && (
          <RightPanel
            tab={panelTab}
            onTabChange={setPanelTab}
            onClose={() => setAiOpen(false)}
            aiPrompt={aiPrompt}
            onAiPromptChange={setAiPrompt}
            aiLoading={aiLoading}
            onGenerate={handleGenerate}
            aiSource={aiSource}
            aiSettings={aiSettings}
            onAiSettingsChange={setAiSettings}
            onSaveAiSettings={saveAiSettings}
            promptHistory={promptHistory}
            onUsePrompt={usePrompt}
            examples={PROMPT_EXAMPLES}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            selectedCount={selectedCount}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdge}
            onDeleteSelection={deleteSelected}
          />
        )}
      </div>
      <StatusBar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        zoom={zoom}
        saveState={saveState}
        savedAt={savedAt}
      />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function DiagramApp() {
  return (
    <ReactFlowProvider>
      <DiagramAppInner />
    </ReactFlowProvider>
  );
}
