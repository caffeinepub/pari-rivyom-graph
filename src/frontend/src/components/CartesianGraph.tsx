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

// Wrap text into lines that fit within maxWidth (approximate char-based)
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  // Approximate: average char width is ~0.55 * fontSize for sans-serif
  const avgCharWidth = fontSize * 0.58;
  const charsPerLine = Math.max(3, Math.floor(maxWidth / avgCharWidth));
  if (text.length <= charsPerLine) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= charsPerLine) {
      current = test;
    } else {
      if (current) lines.push(current);
      // If single word is too long, force-break it
      if (word.length > charsPerLine) {
        let w = word;
        while (w.length > charsPerLine) {
          lines.push(`${w.slice(0, charsPerLine - 1)}-`);
          w = w.slice(charsPerLine - 1);
        }
        current = w;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface LabelBox {
  x: number; // left edge
  y: number; // top edge
  w: number;
  h: number;
}

function boxesOverlap(a: LabelBox, b: LabelBox, margin = 4): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
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

  // Region labels: wrap to fit inside region, then resolve overlaps by nudging vertically
  const regionLabelFontSize = Math.max(9, Math.min(13, axisLabelFontSize - 1));
  const regionLabelLineH = regionLabelFontSize + 4;
  const REGION_PADDING = 6; // px inner padding from rect edges

  const regionElements = useMemo(() => {
    // First pass: compute rect geometry and wrapped text for each region
    const regionData = regions.map((r) => {
      const color = regionColours?.[r.id.toString()] ?? hashColor(r.name);
      const rx = toSvgX(r.x - r.width / 2);
      const ry = toSvgY(r.y + r.height / 2);
      const rw = (r.width / (2 * RANGE)) * plotW;
      const rh = (r.height / (2 * RANGE)) * plotH;

      // Available width for text inside the rect
      const availableW = Math.max(10, rw - REGION_PADDING * 2);
      const lines = wrapText(r.name, availableW, regionLabelFontSize);
      const textBlockH = lines.length * regionLabelLineH;

      // Ideal centered Y for the text block top
      const idealCenterY = ry + rh / 2;
      const idealTopY = idealCenterY - textBlockH / 2;

      return {
        r,
        color,
        rx,
        ry,
        rw,
        rh,
        lines,
        textBlockH,
        idealCenterY,
        // clamp: keep text inside rect vertically
        clampedTopY: Math.max(
          ry + REGION_PADDING,
          Math.min(idealTopY, ry + rh - textBlockH - REGION_PADDING),
        ),
        // label x: center of rect
        labelX: rx + rw / 2,
      };
    });

    // Second pass: resolve label overlap between regions by nudging vertically
    // Sort by idealCenterY so we process top-to-bottom
    const sorted = [...regionData].sort(
      (a, b) => a.idealCenterY - b.idealCenterY,
    );

    // Track placed label boxes (in SVG coords)
    const placedBoxes: LabelBox[] = [];

    for (const rd of sorted) {
      let topY = rd.clampedTopY;

      // Try to find a non-overlapping Y by nudging downward then upward
      const boxW = rd.rw - REGION_PADDING * 2;
      const boxH = rd.textBlockH;
      const candidateBox: LabelBox = {
        x: rd.labelX - boxW / 2,
        y: topY,
        w: boxW,
        h: boxH,
      };

      let overlapping = placedBoxes.some((pb) =>
        boxesOverlap(candidateBox, pb),
      );

      if (overlapping) {
        // Try nudging down
        for (let dy = regionLabelLineH; dy <= 200; dy += regionLabelLineH) {
          candidateBox.y = topY + dy;
          overlapping = placedBoxes.some((pb) =>
            boxesOverlap(candidateBox, pb),
          );
          if (!overlapping) {
            topY = candidateBox.y;
            break;
          }
        }
        // If still overlapping try nudging up
        if (overlapping) {
          for (let dy = regionLabelLineH; dy <= 200; dy += regionLabelLineH) {
            candidateBox.y = topY - dy;
            overlapping = placedBoxes.some((pb) =>
              boxesOverlap(candidateBox, pb),
            );
            if (!overlapping) {
              topY = candidateBox.y;
              break;
            }
          }
        }
      }

      placedBoxes.push({ x: rd.labelX - boxW / 2, y: topY, w: boxW, h: boxH });
      // Store resolved topY back
      rd.clampedTopY = topY;
    }

    // Render
    return regionData.map((rd) => {
      const { r, color, rx, ry, rw, rh, lines, clampedTopY, labelX } = rd;
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
          {lines.map((line, i) => (
            <text
              // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable for wrapped text segments
              key={i}
              x={labelX}
              y={clampedTopY + i * regionLabelLineH + regionLabelFontSize}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={regionLabelFontSize}
              fontFamily="Bricolage Grotesque, system-ui, sans-serif"
              fontWeight="600"
              fill={color}
              fillOpacity={0.9}
              style={{ pointerEvents: "none" }}
            >
              {line}
            </text>
          ))}
        </g>
      );
    });
  }, [
    regions,
    regionColours,
    toSvgX,
    toSvgY,
    plotW,
    plotH,
    regionLabelFontSize,
    regionLabelLineH,
  ]);

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

  // Point elements — spread overlapping dots + collision-detect labels
  const POINT_SPREAD = 16; // px between dots at same coord
  const pointFontSize = Math.max(9, axisLabelFontSize - 2);
  const coordFontSize = Math.max(7, tickLabelFontSize);
  const LABEL_H = pointFontSize + 2 + coordFontSize + 2; // name + coord stacked

  const pointElements = useMemo(() => {
    // Compute initial dot positions (with spread)
    const dotPositions = points.map((p) => {
      const basePx = toSvgX(p.x);
      const basePy = toSvgY(p.y);
      const key = `${p.x},${p.y}`;
      const group = pointsByCoord.get(key) ?? [p];
      const idx = group.findIndex((g) => g.id === p.id);
      const total = group.length;
      const offsetX = (idx - (total - 1) / 2) * POINT_SPREAD;
      return { p, px: basePx + offsetX, py: basePy, basePx, basePy };
    });

    // For each point compute candidate label position, then resolve collisions
    // Candidate: prefer above-right, above-left, below-right, below-left
    const labelMargin = 8;
    const labelW = 80; // approximate label width in px

    interface PlacedLabel {
      x: number; // left edge
      y: number; // top edge
      w: number;
      h: number;
    }

    const placedLabels: PlacedLabel[] = [];

    const resolved = dotPositions.map(({ p, px, py, basePx, basePy }) => {
      const color = pointColours?.[p.id.toString()] ?? hashColor(p.name);
      const showTether = Math.abs(px - basePx) > 1;

      // Candidate offsets: 4 corners + sides
      const candidates: {
        dx: number;
        dy: number;
        anchor: "start" | "middle" | "end";
      }[] = [
        { dx: labelMargin, dy: -(LABEL_H + labelMargin), anchor: "start" }, // top-right
        {
          dx: -labelMargin - labelW,
          dy: -(LABEL_H + labelMargin),
          anchor: "start",
        }, // top-left
        { dx: labelMargin, dy: labelMargin + 4, anchor: "start" }, // bottom-right
        { dx: -labelMargin - labelW, dy: labelMargin + 4, anchor: "start" }, // bottom-left
        { dx: labelMargin, dy: -LABEL_H / 2, anchor: "start" }, // right-middle
        { dx: -labelMargin - labelW, dy: -LABEL_H / 2, anchor: "start" }, // left-middle
      ];

      let chosenDx = labelMargin;
      let chosenDy = -(LABEL_H + labelMargin);
      let chosenAnchor: "start" | "middle" | "end" = "start";
      let placed = false;

      for (const c of candidates) {
        const box: PlacedLabel = {
          x: px + c.dx,
          y: py + c.dy,
          w: labelW,
          h: LABEL_H,
        };
        const overlaps = placedLabels.some((pl) => boxesOverlap(box, pl, 2));
        if (!overlaps) {
          chosenDx = c.dx;
          chosenDy = c.dy;
          chosenAnchor = c.anchor;
          placedLabels.push(box);
          placed = true;
          break;
        }
      }

      // If no candidate worked, nudge upward in steps until clear
      if (!placed) {
        for (let extraDy = 0; extraDy <= 300; extraDy += pointFontSize + 4) {
          const dy = -(LABEL_H + labelMargin + extraDy);
          const box: PlacedLabel = {
            x: px + labelMargin,
            y: py + dy,
            w: labelW,
            h: LABEL_H,
          };
          const overlaps = placedLabels.some((pl) => boxesOverlap(box, pl, 2));
          if (!overlaps) {
            chosenDx = labelMargin;
            chosenDy = dy;
            chosenAnchor = "start";
            placedLabels.push(box);
            break;
          }
        }
      }

      const nameLy = py + chosenDy;
      const coordLy = nameLy + pointFontSize + 2;

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
          {/* Label background for readability */}
          <rect
            x={px + chosenDx - 2}
            y={nameLy - 1}
            width={labelW + 4}
            height={LABEL_H + 2}
            fill="oklch(0.11 0.016 265)"
            fillOpacity={0.7}
            rx={3}
          />
          {/* Name label */}
          <text
            x={px + chosenDx + (chosenAnchor === "middle" ? labelW / 2 : 0)}
            y={nameLy + pointFontSize - 1}
            textAnchor={chosenAnchor}
            fontSize={pointFontSize}
            fontFamily="Bricolage Grotesque, system-ui, sans-serif"
            fontWeight="600"
            fill={color}
          >
            {p.name}
          </text>
          {/* Coord label */}
          <text
            x={px + chosenDx + (chosenAnchor === "middle" ? labelW / 2 : 0)}
            y={coordLy + coordFontSize - 1}
            textAnchor={chosenAnchor}
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

    return resolved;
  }, [
    points,
    pointColours,
    pointsByCoord,
    toSvgX,
    toSvgY,
    pointFontSize,
    coordFontSize,
    LABEL_H,
  ]);

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
