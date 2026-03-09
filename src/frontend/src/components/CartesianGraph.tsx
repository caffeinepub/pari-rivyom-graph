import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Point, Region } from "../backend.d";
import { useIsMobile } from "../hooks/use-mobile";

interface CartesianGraphProps {
  points: Point[];
  regions: Region[];
  pointColours?: Record<string, string>;
  regionColours?: Record<string, string>;
}

const RANGE = 10; // -10 to +10
const ARROW_SIZE = 8;
const MOBILE_SIZE = 600;

export const LABEL_COLORS = [
  "oklch(0.78 0.16 62)", // amber
  "oklch(0.72 0.15 195)", // cyan
  "oklch(0.72 0.18 145)", // green
  "oklch(0.7 0.2 320)", // pink
  "oklch(0.75 0.18 280)", // purple
  "oklch(0.65 0.22 25)", // red-orange
];

export function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

export function CartesianGraph({
  points,
  regions,
  pointColours,
  regionColours,
}: CartesianGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [desktopSize, setDesktopSize] = useState({ width: 600, height: 600 });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      setDesktopSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  const width = isMobile ? MOBILE_SIZE : desktopSize.width;
  const height = isMobile ? MOBILE_SIZE : desktopSize.height;

  // Responsive padding based on container width
  const PAD = useMemo(() => {
    if (width < 380) return 32;
    if (width < 500) return 40;
    return 56;
  }, [width]);

  // Responsive font sizes
  const axisLabelFontSize = useMemo(
    () => Math.max(10, Math.min(14, width / 40)),
    [width],
  );
  const tickLabelFontSize = useMemo(
    () => Math.max(7, Math.min(9, width / 60)),
    [width],
  );

  const plotW = width - PAD * 2;
  const plotH = height - PAD * 2;

  // Convert graph coords [-10,10] to SVG coords
  const toSvgX = useCallback(
    (gx: number) => PAD + ((gx + RANGE) / (2 * RANGE)) * plotW,
    [PAD, plotW],
  );
  const toSvgY = useCallback(
    (gy: number) => PAD + ((RANGE - gy) / (2 * RANGE)) * plotH,
    [PAD, plotH],
  );

  const cx = toSvgX(0);
  const cy = toSvgY(0);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    for (let v = -RANGE; v <= RANGE; v++) {
      if (v === 0) continue;
      // vertical
      lines.push(
        <line
          key={`vg${v}`}
          x1={toSvgX(v)}
          y1={PAD}
          x2={toSvgX(v)}
          y2={height - PAD}
          stroke="oklch(0.24 0.028 258)"
          strokeWidth={v % 5 === 0 ? 0.8 : 0.4}
        />,
      );
      // horizontal
      lines.push(
        <line
          key={`hg${v}`}
          x1={PAD}
          y1={toSvgY(v)}
          x2={width - PAD}
          y2={toSvgY(v)}
          stroke="oklch(0.24 0.028 258)"
          strokeWidth={v % 5 === 0 ? 0.8 : 0.4}
        />,
      );
    }
    return lines;
  }, [width, height, PAD, toSvgX, toSvgY]);

  // Tick marks
  const ticks = useMemo(() => {
    const marks: React.ReactElement[] = [];
    for (let v = -RANGE; v <= RANGE; v++) {
      if (v === 0) continue;
      const tickLen = v % 5 === 0 ? 5 : 3;
      marks.push(
        <line
          key={`xtick${v}`}
          x1={toSvgX(v)}
          y1={cy - tickLen}
          x2={toSvgX(v)}
          y2={cy + tickLen}
          stroke="oklch(0.45 0.04 250)"
          strokeWidth={1}
        />,
      );
      marks.push(
        <line
          key={`ytick${v}`}
          x1={cx - tickLen}
          y1={toSvgY(v)}
          x2={cx + tickLen}
          y2={toSvgY(v)}
          stroke="oklch(0.45 0.04 250)"
          strokeWidth={1}
        />,
      );
      // Tick labels for multiples of 5 only
      if (v % 5 === 0) {
        marks.push(
          <text
            key={`xtlabel${v}`}
            x={toSvgX(v)}
            y={cy + tickLabelFontSize + 7}
            textAnchor="middle"
            fontSize={tickLabelFontSize}
            fill="oklch(0.45 0.04 250)"
            fontFamily="Geist Mono, monospace"
          >
            {v}
          </text>,
        );
        marks.push(
          <text
            key={`ytlabel${v}`}
            x={cx - 10}
            y={toSvgY(v) + 3}
            textAnchor="end"
            fontSize={tickLabelFontSize}
            fill="oklch(0.45 0.04 250)"
            fontFamily="Geist Mono, monospace"
          >
            {v}
          </text>,
        );
      }
    }
    return marks;
  }, [toSvgX, toSvgY, cx, cy, tickLabelFontSize]);

  // Group regions by bounding-box key to detect overlaps
  const regionsByBBox = useMemo(() => {
    const map = new Map<string, Region[]>();
    for (const r of regions) {
      const key = `${r.x},${r.y},${r.width},${r.height}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [regions]);

  // Region elements — stack labels vertically when regions share the same bbox
  const regionLabelFontSize = Math.max(9, axisLabelFontSize - 2);
  const regionLabelLineH = regionLabelFontSize + 4;

  const regionElements = regions.map((r) => {
    const color = regionColours?.[r.id.toString()] ?? hashColor(r.name);
    const rx = toSvgX(r.x - r.width / 2);
    const ry = toSvgY(r.y + r.height / 2);
    const rw = (r.width / (2 * RANGE)) * plotW;
    const rh = (r.height / (2 * RANGE)) * plotH;

    const bboxKey = `${r.x},${r.y},${r.width},${r.height}`;
    const group = regionsByBBox.get(bboxKey) ?? [r];
    const idx = group.findIndex((g) => g.id === r.id);
    const total = group.length;

    // Vertical offset so stacked labels are centred inside the rect
    const totalTextH = total * regionLabelLineH;
    const startY =
      ry +
      rh / 2 -
      totalTextH / 2 +
      idx * regionLabelLineH +
      regionLabelFontSize / 2;

    return (
      <g key={r.id.toString()}>
        <rect
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          fill={color}
          fillOpacity={0.12}
          stroke={color}
          strokeOpacity={0.5}
          strokeWidth={1.5}
          strokeDasharray="4 2"
          rx={3}
        />
        <text
          x={rx + rw / 2}
          y={startY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={regionLabelFontSize}
          fontFamily="Bricolage Grotesque, system-ui, sans-serif"
          fontWeight="600"
          fill={color}
          fillOpacity={0.9}
          style={{ pointerEvents: "none" }}
        >
          {r.name}
        </text>
      </g>
    );
  });

  // Group points by coordinate key to detect overlaps
  const pointsByCoord = useMemo(() => {
    const map = new Map<string, Point[]>();
    for (const p of points) {
      const key = `${p.x},${p.y}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [points]);

  // Point elements — spread overlapping points horizontally
  const POINT_SPREAD = 14; // px between dots at the same coord
  const pointElements = points.map((p) => {
    const color = pointColours?.[p.id.toString()] ?? hashColor(p.name);
    const basePx = toSvgX(p.x);
    const basePy = toSvgY(p.y);

    // Find index within the group at this coord
    const key = `${p.x},${p.y}`;
    const group = pointsByCoord.get(key) ?? [p];
    const idx = group.findIndex((g) => g.id === p.id);
    const total = group.length;
    // Spread: centre the group around basePx
    const offsetX = (idx - (total - 1) / 2) * POINT_SPREAD;
    const px = basePx + offsetX;
    const py = basePy;

    // Smart label offset: push label away from center
    const labelDx = p.x >= 0 ? 10 : -10;
    const labelAnchor = p.x >= 0 ? "start" : "end";
    const labelDy = p.y >= 0 ? -8 : 14;
    const pointFontSize = Math.max(9, axisLabelFontSize - 2);
    const coordFontSize = Math.max(7, tickLabelFontSize);

    // If the dot was shifted, draw a thin line back to the true coordinate
    const showTether = Math.abs(offsetX) > 1;

    return (
      <g key={p.id.toString()} data-ocid="graph.chart_point">
        {/* Tether line to true coordinate when spread */}
        {showTether && (
          <line
            x1={px}
            y1={py}
            x2={basePx}
            y2={basePy}
            stroke={color}
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
        {/* Glow */}
        <circle cx={px} cy={py} r={8} fill={color} fillOpacity={0.15} />
        {/* Dot */}
        <circle
          cx={px}
          cy={py}
          r={5}
          fill={color}
          stroke="oklch(0.13 0.018 260)"
          strokeWidth={1.5}
        />
        {/* Crosshair lines */}
        <line
          x1={px - 3}
          y1={py}
          x2={px + 3}
          y2={py}
          stroke={color}
          strokeOpacity={0.5}
          strokeWidth={1}
        />
        <line
          x1={px}
          y1={py - 3}
          x2={px}
          y2={py + 3}
          stroke={color}
          strokeOpacity={0.5}
          strokeWidth={1}
        />
        {/* Label */}
        <text
          x={px + labelDx}
          y={py + labelDy}
          textAnchor={labelAnchor}
          fontSize={pointFontSize}
          fontFamily="Bricolage Grotesque, system-ui, sans-serif"
          fontWeight="600"
          fill={color}
        >
          {p.name}
        </text>
        {/* Coord label */}
        <text
          x={px + labelDx}
          y={py + labelDy + (p.y >= 0 ? -12 : 14)}
          textAnchor={labelAnchor}
          fontSize={coordFontSize}
          fontFamily="Geist Mono, monospace"
          fill={color}
          fillOpacity={0.65}
        >
          ({p.x}, {p.y})
        </text>
      </g>
    );
  });

  const svgElement = (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
      role="img"
      aria-label="Cartesian graph with axes: Rivyom (positive X), Pari (negative X), Good (positive Y), Bad (negative Y)"
    >
      <title>Cartesian Graph — Pari/Rivyom × Bad/Good</title>
      {/* Background */}
      <rect width={width} height={height} fill="oklch(0.11 0.016 265)" />

      {/* Subtle graph area background */}
      <rect
        x={PAD}
        y={PAD}
        width={plotW}
        height={plotH}
        fill="oklch(0.12 0.018 262)"
        rx={4}
      />

      {/* Grid */}
      {gridLines}

      {/* Regions (behind points) */}
      {regionElements}

      {/* Axis lines */}
      {/* X axis */}
      <line
        x1={PAD}
        y1={cy}
        x2={width - PAD - ARROW_SIZE}
        y2={cy}
        stroke="oklch(0.55 0.04 250)"
        strokeWidth={1.5}
      />
      {/* Y axis */}
      <line
        x1={cx}
        y1={height - PAD}
        x2={cx}
        y2={PAD + ARROW_SIZE}
        stroke="oklch(0.55 0.04 250)"
        strokeWidth={1.5}
      />

      {/* Arrow: right (Rivyom) */}
      <polygon
        points={`${width - PAD},${cy} ${width - PAD - ARROW_SIZE},${cy - 4} ${width - PAD - ARROW_SIZE},${cy + 4}`}
        fill="oklch(0.55 0.04 250)"
      />
      {/* Arrow: left (Pari) */}
      <polygon
        points={`${PAD},${cy} ${PAD + ARROW_SIZE},${cy - 4} ${PAD + ARROW_SIZE},${cy + 4}`}
        fill="oklch(0.55 0.04 250)"
      />
      {/* Arrow: top (Good) */}
      <polygon
        points={`${cx},${PAD} ${cx - 4},${PAD + ARROW_SIZE} ${cx + 4},${PAD + ARROW_SIZE}`}
        fill="oklch(0.55 0.04 250)"
      />
      {/* Arrow: bottom (Bad) */}
      <polygon
        points={`${cx},${height - PAD} ${cx - 4},${height - PAD - ARROW_SIZE} ${cx + 4},${height - PAD - ARROW_SIZE}`}
        fill="oklch(0.55 0.04 250)"
      />

      {/* Tick marks */}
      {ticks}

      {/* Axis Labels */}
      {/* Right: Rivyom */}
      <text
        x={width - PAD + 6}
        y={cy + 1}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={axisLabelFontSize}
        fontFamily="Bricolage Grotesque, system-ui, sans-serif"
        fontWeight="700"
        fill="oklch(0.78 0.16 62)"
        letterSpacing="0.04em"
      >
        Rivyom
      </text>

      {/* Left: Pari */}
      <text
        x={PAD - 6}
        y={cy + 1}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={axisLabelFontSize}
        fontFamily="Bricolage Grotesque, system-ui, sans-serif"
        fontWeight="700"
        fill="oklch(0.72 0.15 195)"
        letterSpacing="0.04em"
      >
        Pari
      </text>

      {/* Top: Good */}
      <text
        x={cx}
        y={PAD - 10}
        textAnchor="middle"
        dominantBaseline="auto"
        fontSize={axisLabelFontSize}
        fontFamily="Bricolage Grotesque, system-ui, sans-serif"
        fontWeight="700"
        fill="oklch(0.72 0.18 145)"
        letterSpacing="0.04em"
      >
        Good
      </text>

      {/* Bottom: Bad */}
      <text
        x={cx}
        y={height - PAD + 18}
        textAnchor="middle"
        dominantBaseline="auto"
        fontSize={axisLabelFontSize}
        fontFamily="Bricolage Grotesque, system-ui, sans-serif"
        fontWeight="700"
        fill="oklch(0.65 0.22 25)"
        letterSpacing="0.04em"
      >
        Bad
      </text>

      {/* Origin dot */}
      <circle cx={cx} cy={cy} r={3} fill="oklch(0.45 0.04 250)" />
      <text
        x={cx + 6}
        y={cy + 12}
        fontSize={tickLabelFontSize}
        fontFamily="Geist Mono, monospace"
        fill="oklch(0.4 0.03 250)"
      >
        0
      </text>

      {/* Points (on top) */}
      {pointElements}
    </svg>
  );

  if (isMobile) {
    return (
      <div
        data-ocid="graph.canvas_target"
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          WebkitOverflowScrolling:
            "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}
      >
        <div
          style={{
            minWidth: `${MOBILE_SIZE}px`,
            minHeight: `${MOBILE_SIZE}px`,
          }}
        >
          {svgElement}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "280px" }}
      data-ocid="graph.canvas_target"
    >
      {svgElement}
    </div>
  );
}
