"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { DiagramNode } from "@/lib/types";

function DiagramNodeComponent({ id, data, selected }: NodeProps<DiagramNode>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const { updateNodeData } = useReactFlow();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const accent = data.color || "#4f6ef7";

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(data.label);
    setEditing(true);
  };

  const commit = useCallback(() => {
    setEditing(false);
    const label = draft.trim() || data.label;
    updateNodeData(id, { ...data, label });
  }, [draft, data, id, updateNodeData]);

  const cancel = () => setEditing(false);

  const handleStyle = { borderColor: accent };

  return (
    <div className="node-root" onDoubleClick={startEdit}>
      <div
        className={`node-shape node-shape--${data.kind}${selected ? " node-shape--selected" : ""}`}
        style={{
          borderColor: accent,
          background: `color-mix(in srgb, ${accent} 12%, rgb(var(--panel)))`,
          color: "rgb(var(--ink))",
        }}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            className="node-inline-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") cancel();
            }}
          />
        ) : (
          <>
            <span className="node-label">{data.label}</span>
            {data.detail && <span className="node-detail">{data.detail}</span>}
          </>
        )}
      </div>
      <Handle type="target" position={Position.Left} id="left" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} />
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
    </div>
  );
}

export default memo(DiagramNodeComponent);
