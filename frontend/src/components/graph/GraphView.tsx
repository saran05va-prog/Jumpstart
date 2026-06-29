import { useState, useEffect, useRef } from "react";
import { Loader2, RotateCcw, Search, X } from "lucide-react";
import * as d3 from "d3";
import { api } from "../../lib/api";
import type { GraphDTO, GraphNodeDTO, GraphEdgeDTO } from "../../lib/types";

interface GraphViewProps {
  roadmapId: number;
  onTopicSelect: (topicId: number) => void;
}

const NODE_RADIUS_BASE = 10;
const NODE_SCALE = 1.8;

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#1D9E75",
  IN_PROGRESS: "#EF9F27",
  NOT_STARTED: "#888780",
  LOCKED: "#534AB7",
  DONE: "#1D9E75",
  CURRENT: "#EF9F27",
  UPCOMING: "#888780",
};

function nodeRadius(node: GraphNodeDTO): number {
  return Math.max(NODE_RADIUS_BASE, Math.sqrt(node.estimatedMinutes) / NODE_SCALE);
}

export default function GraphView({ roadmapId, onTopicSelect }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graph, setGraph] = useState<GraphDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ completed: true, locked: true, notStarted: true });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNodeDTO } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<GraphDTO>(`/roadmaps/${roadmapId}/graph`)
      .then(setGraph)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load graph"))
      .finally(() => setLoading(false));
  }, [roadmapId]);

  useEffect(() => {
    if (!graph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Filter nodes based on visibility
    const visibleStatuses = new Set<string>();
    if (filters.completed) { visibleStatuses.add("COMPLETED"); visibleStatuses.add("DONE"); }
    if (filters.locked) visibleStatuses.add("LOCKED");
    if (filters.notStarted) { visibleStatuses.add("NOT_STARTED"); visibleStatuses.add("IN_PROGRESS"); visibleStatuses.add("CURRENT"); visibleStatuses.add("UPCOMING"); }

    const filteredNodes = graph.nodes.filter(n => visibleStatuses.has(n.status));
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graph.edges.filter(e =>
      filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    if (filteredNodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2).attr("y", height / 2)
        .attr("text-anchor", "middle").attr("fill", "#888780")
        .attr("font-size", "14px")
        .text("No visible nodes");
      return;
    }

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => { g.attr("transform", event.transform); });
    svg.call(zoom);

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#D3D1C7");

    // Create simulation
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredEdges)
        .id((d: any) => d.id)
        .distance(90))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => nodeRadius(d as GraphNodeDTO) + 6));

    // Draw edges
    const link = g.append("g")
      .selectAll("line")
      .data(filteredEdges)
      .join("line")
      .attr("stroke", "#D3D1C7")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Draw nodes
    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(d3.drag<SVGGElement, GraphNodeDTO>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Node circle
    node.append("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => STATUS_COLORS[d.status] || "#888780")
      .attr("stroke", (d) => d.noteCount > 0 ? "#F59E0B" : "none")
      .attr("stroke-width", (d) => d.noteCount > 0 ? 2 : 0)
      .attr("cursor", "pointer")
      .on("click", (_event, d) => onTopicSelect(d.id))
      .on("mouseenter", (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left + 12, y: event.clientY - rect.top - 10, node: d });
      })
      .on("mouseleave", () => setTooltip(null));

    // Node label
    node.append("text")
      .text((d) => d.title.length > 20 ? d.title.slice(0, 18) + "…" : d.title)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => nodeRadius(d) + 14)
      .attr("fill", "#D3D1C7")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none");

    // Search highlighting
    if (search.trim()) {
      const q = search.toLowerCase();
      node.each(function (d: any) {
        const el = d3.select(this);
        const match = d.title.toLowerCase().includes(q);
        el.attr("opacity", match ? 1 : 0.2);
        if (match) {
          el.select("circle").attr("r", nodeRadius(d) * 1.3);
        }
      });
    }

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // If no edges, arrange nodes in a grid
    if (filteredEdges.length === 0 && filteredNodes.length > 0) {
      simulation.alpha(0).stop();
      const cols = Math.ceil(Math.sqrt(filteredNodes.length));
      const gridW = width * 0.6;
      const gridH = height * 0.6;
      const startX = (width - gridW) / 2;
      const startY = (height - gridH) / 2;
      filteredNodes.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        n.x = startX + col * (gridW / Math.max(cols - 1, 1));
        n.y = startY + row * (gridH / Math.max(Math.ceil(filteredNodes.length / cols) - 1, 1));
      });
      simulation.nodes(filteredNodes);
      simulation.alpha(0).tick(1);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    }

    return () => { simulation.stop(); };
  }, [graph, filters, search, onTopicSelect]);

  function resetView() {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full py-20"><Loader2 size={24} className="animate-spin text-ember-400" /></div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center h-full py-20"><p className="text-ember-400 text-[14px] mb-4">{error}</p></div>;
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Filter toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-700 px-3 py-1.5">
          <Search size={13} className="text-mist-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="w-32 bg-transparent outline-none text-[12px] text-paper placeholder:text-mist-500"
          />
          {search && <button onClick={() => setSearch("")}><X size={12} className="text-mist-500 hover:text-mist-200" /></button>}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-mist-400 cursor-pointer">
          <input type="checkbox" checked={filters.completed} onChange={() => setFilters(f => ({ ...f, completed: !f.completed }))} className="rounded" />
          Completed
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-mist-400 cursor-pointer">
          <input type="checkbox" checked={filters.locked} onChange={() => setFilters(f => ({ ...f, locked: !f.locked }))} className="rounded" />
          Locked
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-mist-400 cursor-pointer">
          <input type="checkbox" checked={filters.notStarted} onChange={() => setFilters(f => ({ ...f, notStarted: !f.notStarted }))} className="rounded" />
          Not started
        </label>
        <button onClick={resetView} className="flex items-center gap-1 text-[11px] text-mist-500 hover:text-mist-200"><RotateCcw size={11} /> Reset</button>
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg border border-slate-700 bg-ink-900 px-3 py-2 shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-[12px] font-medium text-paper">{tooltip.node.title}</p>
          <p className="text-[10px] text-mist-500">Status: {tooltip.node.status}</p>
          <p className="text-[10px] text-mist-500">{tooltip.node.estimatedMinutes} min · {tooltip.node.noteCount} notes · {tooltip.node.resourceCount} resources</p>
        </div>
      )}
    </div>
  );
}
