import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// 五根柱子的数据
const DATA = [
  { label: "一月", value: 85, color: "#FF6B6B" },
  { label: "二月", value: 65, color: "#4ECDC4" },
  { label: "三月", value: 92, color: "#45B7D1" },
  { label: "四月", value: 78, color: "#96CEB4" },
  { label: "五月", value: 70, color: "#FFEAA7" },
];

// 单根柱子的组件
const Bar: React.FC<{
  index: number;
  value: number;
  maxValue: number;
  label: string;
  color: string;
  barWidth: number;
  gap: number;
}> = ({ index, value, maxValue, label, color, barWidth, gap }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // 每根柱子依次延迟出现
  const delay = index * 10;

  // 柱子的弹簧动画（从 0 弹跳到目标高度）
  const barHeight = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
    from: 0,
    to: (value / maxValue) * (height * 0.5),
  });

  // 数值标签的淡入动画
  const labelOpacity = spring({
    frame: frame - delay - 5,
    fps,
    config: { damping: 200 },
  });

  // 底部标签的淡入
  const bottomLabelOpacity = interpolate(
    frame - delay,
    [0, 15],
    [0, 1],
    {
      extrapolateRight: "clamp",
    },
  );

  const chartBottom = height - 100;
  const barLeft =
    gap +
    index * (barWidth + gap) +
    (1280 - DATA.length * (barWidth + gap)) / 2;

  return (
    <g>
      {/* 柱子 */}
      <rect
        x={barLeft}
        y={chartBottom - barHeight}
        width={barWidth}
        height={barHeight}
        fill={color}
        rx={8}
        ry={8}
      />
      {/* 柱子顶部的数值标签 */}
      <text
        x={barLeft + barWidth / 2}
        y={chartBottom - barHeight - 20}
        textAnchor="middle"
        fontSize={28}
        fontWeight="bold"
        fill={color}
        opacity={labelOpacity}
      >
        {value}%
      </text>
      {/* 底部标签 */}
      <text
        x={barLeft + barWidth / 2}
        y={chartBottom + 40}
        textAnchor="middle"
        fontSize={24}
        fontWeight="bold"
        fill="#ffffff"
        opacity={bottomLabelOpacity}
      >
        {label}
      </text>
    </g>
  );
};

export const BarChart: React.FC = () => {
  const frame = useCurrentFrame();
  const maxValue = Math.max(...DATA.map((d) => d.value));

  // 标题动画
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = spring({
    frame,
    fps: 30,
    config: { damping: 15, stiffness: 80 },
    from: -50,
    to: 0,
  });

  const barWidth = 120;
  const gap = 40;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 标题 */}
      <h1
        style={{
          fontSize: 48,
          fontWeight: "bold",
          color: "#ffffff",
          marginBottom: 40,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        月度销售数据
      </h1>

      {/* SVG 柱状图 */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1280 720"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* 水平基线 */}
        <line
          x1={80}
          y1={620}
          x2={1200}
          y2={620}
          stroke="#555"
          strokeWidth={2}
        />

        {DATA.map((item, i) => (
          <Bar
            key={i}
            index={i}
            value={item.value}
            maxValue={maxValue}
            label={item.label}
            color={item.color}
            barWidth={barWidth}
            gap={gap}
          />
        ))}
      </svg>
    </div>
  );
};
