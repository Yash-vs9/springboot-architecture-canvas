import type { FC, ReactNode } from 'react';
import { 
  Network, 
  Cpu, 
  Rocket, 
  ShieldCheck, 
  Database, 
  Layers, 
  FileCode2, 
  Search,
  Filter,
  BookOpen,
  Compass,
  Map
} from 'lucide-react';
import type { ViewMode, DetailLevel, LearningMode } from '../data/types';

interface NavbarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  detailLevel: DetailLevel;
  onToggleDetailLevel: () => void;
  learningMode: LearningMode;
  onToggleLearningMode: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilterExplorer: () => void;
  onOpenIoCMemory: () => void;
  onOpenPlanModal: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  currentView,
  onSelectView,
  detailLevel,
  onToggleDetailLevel,
  learningMode,
  onToggleLearningMode,
  searchQuery,
  onSearchChange,
  onOpenFilterExplorer,
  onOpenIoCMemory,
  onOpenPlanModal,
}) => {
  const views: { id: ViewMode; label: string; icon: ReactNode; badge?: string }[] = [
    { id: 'WEB_REQUEST_PIPELINE', label: 'Web Request Pipeline', icon: <Network className="w-4 h-4" /> },
    { id: 'IOC_BEAN_LIFECYCLE', label: 'IoC & Bean Lifecycle', icon: <Cpu className="w-4 h-4" />, badge: '3-Level Cache' },
    { id: 'STARTUP_BOOTSTRAP', label: 'Bootstrap Engine', icon: <Rocket className="w-4 h-4" /> },
    { id: 'SECURITY_FILTER_CHAIN', label: 'Security Filter Chain', icon: <ShieldCheck className="w-4 h-4" />, badge: '15 Filters' },
    { id: 'TRANSACTIONS_AND_DATA', label: 'Transactions & Data', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <header className="h-16 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 z-30 select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#6db33f]/15 border border-[#6db33f]/40 flex items-center justify-center text-[#6db33f] font-black shadow-inner">
            <span className="text-xl">🍃</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide text-sm">SpringLens</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#6db33f]/20 text-[#92ec56] border border-[#6db33f]/30">
                v3.4 Internals
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e]">Spring Boot Engineering Architecture & Canvas</p>
          </div>
        </div>
      </div>

      {/* Main Architecture View Tabs */}
      <nav className="flex items-center bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
        {views.map((v) => {
          const isActive = currentView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onSelectView(v.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#238636] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]'
              }`}
            >
              {v.icon}
              <span>{v.label}</span>
              {v.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#21262d] text-[#6db33f]'
                }`}>
                  {v.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tools, Search & Toggles */}
      <div className="flex items-center gap-2.5">
        {/* Guided Step-by-Step vs Full Blueprint Switcher */}
        <div className="flex items-center bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
          <button
            onClick={() => learningMode !== 'GUIDED_STEP_BY_STEP' && onToggleLearningMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              learningMode === 'GUIDED_STEP_BY_STEP'
                ? 'bg-[#238636] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-white'
            }`}
            title="Step-by-step guided mode: learn one concept at a time without feeling overwhelmed"
          >
            <Compass className="w-3.5 h-3.5 text-[#92ec56]" />
            <span>Guided Tour</span>
          </button>
          <button
            onClick={() => learningMode !== 'FULL_BLUEPRINT' && onToggleLearningMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              learningMode === 'FULL_BLUEPRINT'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-white'
            }`}
            title="Full blueprint mode: explore the entire architecture canvas at once"
          >
            <Map className="w-3.5 h-3.5 text-[#79c0ff]" />
            <span>Full Blueprint</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search classes, filters, methods..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-52 h-8 pl-8 pr-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8b949e] hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Level of Detail Toggle */}
        <button
          onClick={onToggleDetailLevel}
          className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all ${
            detailLevel === 'LOW_LEVEL'
              ? 'bg-[#1f6feb]/20 border-[#1f6feb] text-[#58a6ff]'
              : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white'
          }`}
          title="Toggle High-Level Architecture vs Low-Level JVM Call Stacks"
        >
          {detailLevel === 'LOW_LEVEL' ? (
            <>
              <FileCode2 className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Low-Level Internals</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5" />
              <span>High-Level Overview</span>
            </>
          )}
        </button>

        {/* Filter Explorer Button */}
        <button
          onClick={onOpenFilterExplorer}
          className="h-8 px-2.5 rounded-md text-xs font-medium bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white hover:bg-[#30363d] flex items-center gap-1.5 transition-colors"
          title="Where are filters located and what do they do?"
        >
          <Filter className="w-3.5 h-3.5 text-[#e3b341]" />
          <span>Filter Directory</span>
        </button>

        {/* IoC 3-Level Cache & Memory Button */}
        <button
          onClick={onOpenIoCMemory}
          className="h-8 px-2.5 rounded-md text-xs font-medium bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white hover:bg-[#30363d] flex items-center gap-1.5 transition-colors"
          title="Inspect DefaultListableBeanFactory 3-Level Singleton Cache & Memory Structures"
        >
          <Cpu className="w-3.5 h-3.5 text-[#6db33f]" />
          <span>IoC Cache & Memory</span>
        </button>

        {/* Plan & Spec Button */}
        <button
          onClick={onOpenPlanModal}
          className="h-8 px-2.5 rounded-md text-xs font-medium bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white hover:bg-[#30363d] flex items-center gap-1.5 transition-colors"
          title="Refined Prompt & Architecture Plan"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#a371f7]" />
          <span>Spec & Plan</span>
        </button>
      </div>
    </header>
  );
};
