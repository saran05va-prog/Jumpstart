import { useMemo } from "react";
import type { GraphNodeDTO, GraphEdgeDTO, RoadmapResponse, ColorTone } from "../../lib/types";
import { colorThemeToTone } from "../../lib/types";
import { colorMap } from "../../lib/utils";

interface Props {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
  roadmap: RoadmapResponse;
  onNodeClick?: (node: GraphNodeDTO) => void;
}

interface LayoutNode extends GraphNodeDTO {
  level: number;
  x: number;
  y: number;
}

const NODE_W = 190;
const NODE_H = 52;
const LEVEL_GAP = 100;
const NODE_GAP_X = 28;
const PADDING = 40;

export default function RoadmapGraph({ nodes, edges, roadmap, onNodeClick }: Props) {
  const tone = colorThemeToTone(roadmap.colorTheme);
  const cm = colorMap[tone];

  const layout = useMemo(() => {
    if (nodes.length === 0) return null;

    const nodeMap = new Map<number, LayoutNode>();
    const adj = new Map<number, number[]>();
    const inDeg = new Map<number, number>();

    for (const n of nodes) {
      nodeMap.set(n.id, { ...n, level: 0, x: 0, y: 0 });
      adj.set(n.id, []);
      inDeg.set(n.id, 0);
    }

    const isInGraph = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      if (!isInGraph.has(e.source) || !isInGraph.has(e.target)) continue;
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    }

    // Assign levels via longest-path from roots
    const level = new Map<number, number>();
    function dfs(u: number): number {
      if (level.has(u)) return level.get(u)!;
      let maxParentLevel = -1;
      for (const [parentId, children] of adj) {
        if (children.includes(u)) {
          maxParentLevel = Math.max(maxParentLevel, dfs(parentId));
        }
      }
      const lvl = maxParentLevel + 1;
      level.set(u, lvl);
      return lvl;
    }

    for (const n of nodes) {
      if ((inDeg.get(n.id) ?? 0) === 0) {
        dfs(n.id);
      }
    }
    for (const n of nodes) {
      if (!level.has(n.id)) level.set(n.id, 0);
    }

    // Group by level
    const byLevel = new Map<number, number[]>();
    let maxLevel = 0;
    for (const n of nodes) {
      const l = level.get(n.id) ?? 0;
      if (!byLevel.has(l)) byLevel.set(l, []);
      byLevel.get(l)!.push(n.id);
      maxLevel = Math.max(maxLevel, l);
      nodeMap.get(n.id)!.level = l;
    }

    const totalH = (() => {
      let max = 0;
      for (const [, ids] of byLevel) max = Math.max(max, ids.length);
      return max * NODE_H + (max - 1) * LEVEL_GAP;
    })();

    for (const [lvl, ids] of byLevel) {
      const count = ids.length;
      const startY = (totalH - (count * NODE_H + (count - 1) * LEVEL_GAP)) / 2;
      ids.sort((a, b) => a - b); // stable order by id (backend sends sorted)
      ids.forEach((id, i) => {
        const ln = nodeMap.get(id)!;
        ln.x = PADDING + lvl * (NODE_W + NODE_GAP_X);
        ln.y = PADDING + startY + i * (NODE_H + LEVEL_GAP);
      });
    }

    const svgW = PADDING * 2 + (maxLevel + 1) * (NODE_W + NODE_GAP_X);
    const svgH = totalH + PADDING * 2;

    return { nodes: nodeMap, byLevel, maxLevel, svgW, svgH };
  }, [nodes, edges]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[13px] text-mist-600">No topic graph available for this roadmap.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto scrollbar-none rounded-xl">
      <svg
        viewBox={`0 0 ${layout.svgW} ${layout.svgH}`}
        className="min-w-full"
        style={{ minHeight: layout.svgH }}
      >
        <defs>
          <marker id={`arrow-${tone}`} viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={tone === "moss" ? "#4C7A5E" : tone === "ember" ? "#E8743B" : "#D8B25C"} />
          </marker>
          <linearGradient id="node-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const src = layout.nodes.get(e.source);
          const tgt = layout.nodes.get(e.target);
          if (!src || !tgt) return null;
          const x1 = src.x + NODE_W;
          const y1 = src.y + NODE_H / 2;
          const x2 = tgt.x;
          const y2 = tgt.y + NODE_H / 2;
          const d = `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`;
          const active = tgt.status === "COMPLETED" || tgt.status === "DONE" || tgt.status === "IN_PROGRESS";
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={active ? cm.bg : "#324047"}
              strokeWidth={1.5}
              strokeOpacity={active ? 0.7 : 0.4}
              markerEnd={`url(#arrow-${tone})`}
              className="transition-all duration-500"
            />
          );
        })}

        {/* Nodes */}
        {Array.from(layout.nodes.values()).map((n) => {
          const completed = n.status === "COMPLETED" || n.status === "DONE";
          const inProgress = n.status === "IN_PROGRESS" || n.status === "CURRENT";
          return (
            <g
              key={n.id}
              onClick={() => onNodeClick?.(n)}
              className="cursor-pointer"
            >
              <rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                ry={10}
                fill={completed ? "#1C2E24" : inProgress ? "#2C2418" : "#161E22"}
                stroke={completed ? "#4C7A5E" : inProgress ? "#E8743B" : "#243036"}
                strokeWidth={completed ? 2 : inProgress ? 2 : 1}
                className="transition-all duration-300 hover:brightness-125"
              />
              <rect x={n.x} y={n.y} width={NODE_W} height={10} rx={10} ry={10} fill="url(#node-glow)" />

              {/* Status icon */}
              {completed ? (
                <>
                  <circle cx={n.x + 14} cy={n.y + NODE_H / 2} r={7} fill="#4C7A5E" />
                  <text x={n.x + 14} y={n.y + NODE_H / 2 + 1} textAnchor="middle" fill="#0E1417" fontSize={8} fontWeight="bold">✓</text>
                </>
              ) : inProgress ? (
                <>
                  <circle cx={n.x + 14} cy={n.y + NODE_H / 2} r={7} fill="#E8743B" />
                  <text x={n.x + 14} y={n.y + NODE_H / 2 + 1} textAnchor="middle" fill="#0E1417" fontSize={7}>◐</text>
                </>
              ) : (
                <circle cx={n.x + 14} cy={n.y + NODE_H / 2} r={7} fill="#324047" />
              )}

              {/* Title */}
              <text
                x={n.x + 28}
                y={n.y + NODE_H / 2 - 1}
                fill={completed ? "#6B9C7E" : "#ECEFE9"}
                fontSize={11.5}
                fontFamily="IBM Plex Sans, sans-serif"
                fontWeight={500}
                className="select-none"
              >
                {n.title.length > 22 ? n.title.slice(0, 20) + "…" : n.title}
              </text>

              {/* Resource count badge */}
              {n.resourceCount > 0 && (
                <>
                  <rect
                    x={n.x + NODE_W - (String(n.resourceCount).length * 7 + 16)}
                    y={n.y + NODE_H / 2 + 5}
                    width={String(n.resourceCount).length * 7 + 12}
                    height={16}
                    rx={4}
                    fill="#1C262B"
                  />
                  <text
                    x={n.x + NODE_W - 8}
                    y={n.y + NODE_H / 2 + 16}
                    fill="#5F716A"
                    fontSize={9}
                    fontFamily="IBM Plex Mono, monospace"
                    textAnchor="end"
                  >
                    {n.resourceCount} resources
                  </text>
                </>
              )}

              {/* Note count */}
              {n.noteCount > 0 && (
                <text
                  x={n.x + NODE_W - 8}
                  y={n.y + NODE_H / 2 - 6}
                  fill="#5F716A"
                  fontSize={8.5}
                  fontFamily="IBM Plex Mono, monospace"
                  textAnchor="end"
                >
                  📝 {n.noteCount}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${PADDING}, ${layout.svgH - 18})`}>
          <circle cx={0} cy={0} r={5} fill="#4C7A5E" />
          <text x={10} y={3} fill="#5F716A" fontSize={9}>Completed</text>
          <circle cx={80} cy={0} r={5} fill="#E8743B" />
          <text x={90} y={3} fill="#5F716A" fontSize={9}>In Progress</text>
          <circle cx={166} cy={0} r={5} fill="#324047" />
          <text x={176} y={3} fill="#5F716A" fontSize={9}>Not Started</text>
        </g>
      </svg>
    </div>
  );
}
