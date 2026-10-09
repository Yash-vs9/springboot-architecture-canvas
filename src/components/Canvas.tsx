import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { FC, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Code2, 
  AlertCircle
} from 'lucide-react';
import type { 
  SpringComponentNode, 
  GraphEdge, 
  DetailLevel, 
  ViewMode, 
  SimulationStep 
} from '../data/types';

interface CanvasProps {
  nodes: SpringComponentNode[];
  edges: GraphEdge[];
  currentView: ViewMode;
  detailLevel: DetailLevel;
  selectedNode: SpringComponentNode | null;
  onSelectNode: (node: SpringComponentNode) => void;
  currentSimStep: SimulationStep | null;
  searchQuery: string;
  isSpotlightMode?: boolean;
}

export const Canvas: FC<CanvasProps> = ({
  nodes,
  edges,
  currentView,
  detailLevel,
  selectedNode,
  onSelectNode,
  currentSimStep,
  searchQuery,
  isSpotlightMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state for Pan & Zoom
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 120 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter visible nodes based on current view mode
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => n.viewModes.includes(currentView));
  }, [nodes, currentView]);

  // Filter visible edges based on current view mode and visible nodes
  const visibleEdges = useMemo(() => {
    const nodeIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter(
      (e) => e.viewModes.includes(currentView) && nodeIds.has(e.from) && nodeIds.has(e.to)
    );
  }, [edges, currentView, visibleNodes]);

  // Auto-pan to current simulated node if it changes
  useEffect(() => {
    if (currentSimStep && containerRef.current) {
      const targetNode = visibleNodes.find((n) => n.id === currentSimStep.nodeId);
      if (targetNode) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const targetX = containerWidth / 2 - (targetNode.x + targetNode.width / 2) * zoom;
        const targetY = containerHeight / 2 - (targetNode.y + targetNode.height / 2) * zoom;
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [currentSimStep, visibleNodes, zoom]);

  // Mouse drag pan handler
  const handleMouseDown = (e: ReactMouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Zoom with mouse wheel
  const handleWheel = (e: ReactWheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 2.2));
  };

  // Zoom control buttons
  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.2));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.25));
  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 80, y: 120 });
  };

  const fitView = () => {
    if (!containerRef.current || visibleNodes.length === 0) return;
    const minX = Math.min(...visibleNodes.map((n) => n.x));
    const maxX = Math.max(...visibleNodes.map((n) => n.x + n.width));
    const minY = Math.min(...visibleNodes.map((n) => n.y));
    const maxY = Math.max(...visibleNodes.map((n) => n.y + (detailLevel === 'LOW_LEVEL' ? n.height + 70 : n.height)));

    const width = maxX - minX + 200;
    const height = maxY - minY + 200;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const scale = Math.min(containerWidth / width, containerHeight / height, 1.2);
    setZoom(scale);
    setPan({
      x: (containerWidth - width * scale) / 2 - minX * scale + 100 * scale,
      y: (containerHeight - height * scale) / 2 - minY * scale + 80 * scale,
    });
  };

  // Compute node map for edge rendering
  const nodeMap = useMemo(() => {
    const map = new Map<string, SpringComponentNode>();
    visibleNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [visibleNodes]);

  // Architectural Layer Swimlanes calculation
  const layerRegions = useMemo(() => {
    const map = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();
    visibleNodes.forEach((node) => {
      const h = detailLevel === 'LOW_LEVEL' ? node.height + 70 : node.height;
      const existing = map.get(node.layer);
      if (!existing) {
        map.set(node.layer, {
          minX: node.x,
          maxX: node.x + node.width,
          minY: node.y,
          maxY: node.y + h,
        });
      } else {
        existing.minX = Math.min(existing.minX, node.x);
        existing.maxX = Math.max(existing.maxX, node.x + node.width);
        existing.minY = Math.min(existing.minY, node.y);
        existing.maxY = Math.max(existing.maxY, node.y + h);
      }
    });

    return Array.from(map.entries()).map(([layer, box]) => ({
      layer,
      x: box.minX - 18,
      y: box.minY - 32,
      width: box.maxX - box.minX + 36,
      height: box.maxY - box.minY + 48,
    }));
  }, [visibleNodes, detailLevel]);

  // Category Color Helper
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'SERVER':
        return {
          border: 'border-blue-500/40',
          bg: 'bg-blue-950/30',
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
        };
      case 'SERVLET_FILTER':
        return {
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'SECURITY_FILTER':
        return {
          border: 'border-purple-500/40',
          bg: 'bg-purple-950/30',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400',
        };
      case 'MVC_CORE':
      case 'HANDLER':
        return {
          border: 'border-[#6db33f]/50',
          bg: 'bg-[#6db33f]/10',
          badge: 'bg-[#6db33f]/20 text-[#92ec56] border-[#6db33f]/30',
          dot: 'bg-[#6db33f]',
        };
      case 'CONTROLLER':
        return {
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-950/30',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-400',
        };
      case 'IOC_CORE':
      case 'BEAN_POST_PROCESSOR':
        return {
          border: 'border-yellow-500/40',
          bg: 'bg-yellow-950/30',
          badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          dot: 'bg-yellow-400',
        };
      case 'PROXY_AOP':
      case 'DATA_PERSISTENCE':
        return {
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/30',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      default:
        return {
          border: 'border-slate-500/40',
          bg: 'bg-slate-900/40',
          badge: 'bg-slate-700 text-slate-300 border-slate-600',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      className={`relative w-full h-[calc(100vh-4rem)] bg-[#090d13] overflow-hidden select-none cursor-grab ${
        isDragging ? 'cursor-grabbing' : ''
      } canvas-grid`}
    >
      {/* Zoom / View controls toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#161b22]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#30363d] shadow-xl">
        <button
          onClick={zoomIn}
          className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-[#30363d] mx-1" />
        <span className="text-[11px] font-mono text-[#8b949e] w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <div className="h-4 w-px bg-[#30363d] mx-1" />
        <button
          onClick={resetView}
          className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={fitView}
          className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb Layer Legend */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#161b22]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#30363d] text-xs text-[#8b949e]">
        <span className="font-semibold text-white">Active Topology:</span>
        <span className="font-mono text-[#6db33f]">
          {currentView.replace(/_/g, ' ')}
        </span>
        <span className="text-[#30363d]">•</span>
        <span className="text-[11px]">
          {visibleNodes.length} Architectural Components
        </span>
      </div>

      {/* Main Canvas Transformation Container */}
      <div
        className="w-full h-full origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Edges Layer */}
        <svg className="absolute top-0 left-0 w-[5000px] h-[3000px] pointer-events-none z-0">
          <defs>
            {/* Standard Arrow Marker */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#484f58" />
            </marker>

            {/* Glowing Active Arrow Marker */}
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6db33f" />
            </marker>
          </defs>

          {visibleEdges.map((edge) => {
            const sourceNode = nodeMap.get(edge.from);
            const targetNode = nodeMap.get(edge.to);
            if (!sourceNode || !targetNode) return null;

            const isSimHighlighted = currentSimStep?.highlightEdges?.includes(edge.id);

            // Compute connection coordinates
            const sourceHeight = detailLevel === 'LOW_LEVEL' ? sourceNode.height + 70 : sourceNode.height;
            const targetHeight = detailLevel === 'LOW_LEVEL' ? targetNode.height + 70 : targetNode.height;

            const x1 = sourceNode.x + sourceNode.width;
            const y1 = sourceNode.y + sourceHeight / 2;
            const x2 = targetNode.x;
            const y2 = targetNode.y + targetHeight / 2;

            // Smooth cubic Bezier path
            const dx = Math.abs(x2 - x1) * 0.5;
            const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            const isDimmedEdge = isSpotlightMode && currentSimStep && !isSimHighlighted;

            return (
              <g 
                key={edge.id} 
                className="transition-all duration-300"
                style={{ opacity: isDimmedEdge ? 0.12 : 1 }}
              >
                {/* Background Shadow Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSimHighlighted ? '#6db33f' : '#21262d'}
                  strokeWidth={isSimHighlighted ? 4 : 2}
                  strokeDasharray={edge.dashed ? '6,6' : undefined}
                  markerEnd={isSimHighlighted ? 'url(#arrow-active)' : 'url(#arrow)'}
                />

                {/* Animated Flow Pulse for active simulation edge */}
                {isSimHighlighted && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#92ec56"
                    strokeWidth="3"
                    strokeDasharray="8,8"
                    className="animate-flow-dash"
                  />
                )}

                {/* Edge Call Label */}
                {(edge.label || edge.lowLevelCall) && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 10}
                    fill={isSimHighlighted ? '#92ec56' : '#8b949e'}
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="bg-[#0d1117] px-1 font-semibold"
                  >
                    {detailLevel === 'LOW_LEVEL' && edge.lowLevelCall
                      ? edge.lowLevelCall
                      : edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Layer Swimlanes Background Groupings */}
        {layerRegions.map((region) => (
          <div
            key={region.layer}
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
            }}
            className="absolute rounded-2xl border border-dashed border-[#30363d]/80 bg-[#161b22]/25 pointer-events-none transition-all duration-300"
          >
            <div className="absolute -top-3.5 left-4 px-3 py-0.5 rounded-full bg-[#161b22] border border-[#30363d] text-[10px] font-mono uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
              <span className="font-semibold text-white/90">{region.layer}</span>
            </div>
          </div>
        ))}

        {/* Nodes Layer */}
        {visibleNodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isSimCurrent = currentSimStep?.nodeId === node.id;
          const isSpotlightDimmed = isSpotlightMode && currentSimStep && !isSimCurrent;

          const isSearchMatched = searchQuery
            ? node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              node.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
              node.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
            : true;

          const theme = getCategoryTheme(node.category);
          const height = detailLevel === 'LOW_LEVEL' ? node.height + 80 : node.height + 15;
          const width = Math.max(node.width, 290);

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
              }}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              className={`absolute rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer p-4 flex flex-col justify-between ${
                theme.bg
              } ${theme.border} ${
                isSelected ? 'ring-2 ring-[#58a6ff] border-[#58a6ff] shadow-2xl z-20' : 'hover:border-[#58a6ff]/70'
              } ${
                isSimCurrent
                  ? 'glow-active-step ring-4 ring-[#6db33f] border-[#6db33f] scale-105 z-30 shadow-[0_0_35px_rgba(109,179,63,0.7)] bg-[#121c13]'
                  : ''
              } ${
                isSpotlightDimmed
                  ? 'opacity-20 grayscale-[35%] blur-[0.4px] hover:opacity-100 hover:grayscale-0 hover:blur-none hover:z-20 scale-[0.98]'
                  : 'opacity-100'
              } ${
                !isSearchMatched ? 'opacity-20 grayscale' : ''
              }`}
            >
              {/* Node Header */}
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9ca3af] truncate">
                      {node.category.replace('_', ' ')}
                    </span>
                  </div>

                  {node.executionOrder && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
                      Step #{node.executionOrder}
                    </span>
                  )}
                </div>

                {/* Node Title */}
                <h4 className="font-bold text-white text-sm leading-snug mb-1">
                  {node.simpleName}
                </h4>

                {/* Package String */}
                <p className="font-mono text-[10px] text-[#717a87] truncate mb-2">
                  {node.package}
                </p>

                {/* Role Summary (High contrast text!) */}
                <p className="text-xs text-[#e6edf3] line-clamp-3 leading-relaxed font-normal">
                  {node.roleSummary}
                </p>
              </div>

              {/* Low-Level Mode Extension (Methods & Callstack preview) */}
              {detailLevel === 'LOW_LEVEL' && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                    <span className="font-mono text-[#58a6ff] flex items-center gap-1 font-semibold">
                      <Code2 className="w-3.5 h-3.5" />
                      Key Entrypoint:
                    </span>
                  </div>
                  {node.methods[0] && (
                    <div className="font-mono text-xs bg-black/60 px-2 py-1.5 rounded-lg text-[#92ec56] truncate border border-white/10 font-bold">
                      {node.methods[0].name}()
                    </div>
                  )}
                  {node.pitfalls.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium truncate mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                      <span className="truncate">{node.pitfalls[0]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Node Footer Tags */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10 text-[10px] text-[#8b949e]">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {node.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 font-mono text-[#8b949e] border border-white/5"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="text-[#58a6ff] font-medium text-xs hover:underline flex items-center gap-0.5">
                  Inspect &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini-Map Component (Bottom-Left) */}
      <div className="absolute bottom-20 left-4 z-20 w-48 h-32 bg-[#161b22]/90 backdrop-blur-md rounded-lg border border-[#30363d] p-1.5 shadow-xl hidden md:block">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#8b949e] px-1 mb-1">
          <span>MINIMAP</span>
          <span>{visibleNodes.length} NODES</span>
        </div>
        <div className="relative w-full h-[calc(100%-16px)] bg-[#0d1117] rounded border border-[#21262d] overflow-hidden">
          {/* Scaled Dots for nodes */}
          {visibleNodes.map((n) => {
            const mx = (n.x / 3200) * 100;
            const my = (n.y / 1500) * 100;
            return (
              <div
                key={n.id}
                style={{ left: `${mx}%`, top: `${my}%` }}
                className={`absolute w-1.5 h-1.5 rounded-full ${
                  currentSimStep?.nodeId === n.id ? 'bg-[#92ec56] ring-1 ring-white' : 'bg-[#58a6ff]'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
