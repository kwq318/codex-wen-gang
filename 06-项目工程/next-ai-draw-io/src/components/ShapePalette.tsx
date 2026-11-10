"use client";

import type { LucideIcon } from "lucide-react";
import { Circle, Database, Diamond, Hexagon, MoveHorizontal, Square, StickyNote, Triangle } from "lucide-react";
import type { NodeKind } from "@/lib/types";

interface ShapeItem {
  kind: NodeKind;
  label: string;
  icon: LucideIcon;
}

const SHAPES: ShapeItem[] = [
  { kind: "rectangle", label: "矩形", icon: Square },
  { kind: "rounded", label: "圆角", icon: Triangle },
  { kind: "decision", label: "决策", icon: Diamond },
  { kind: "ellipse", label: "椭圆", icon: Circle },
  { kind: "database", label: "数据库", icon: Database },
  { kind: "note", label: "备注", icon: StickyNote },
  { kind: "parallelogram", label: "流程", icon: MoveHorizontal },
  { kind: "hexagon", label: "六边形", icon: Hexagon },
];

interface ShapePaletteProps {
  onAddShape: (kind: NodeKind) => void;
}

export default function ShapePalette({ onAddShape }: ShapePaletteProps) {
  return (
    <aside className="shape-palette">
      <div className="mb-1 px-1 text-xs font-semibold text-muted">形状库</div>
      {SHAPES.map((shape) => {
        const Icon = shape.icon;
        return (
          <div
            key={shape.kind}
            className="shape-card"
            draggable
            title={`拖到画布，或点击添加到画布中心（${shape.label}）`}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/next-ai-draw", JSON.stringify({ kind: shape.kind }));
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onAddShape(shape.kind)}
          >
            <Icon size={17} />
            <span>{shape.label}</span>
          </div>
        );
      })}
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted/80">
        点击卡片在画布中心添加，拖拽可放到指定位置。
      </p>
    </aside>
  );
}
