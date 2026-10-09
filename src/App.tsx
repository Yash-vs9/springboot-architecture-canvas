import { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Canvas } from './components/Canvas';
import { InspectorDrawer } from './components/InspectorDrawer';
import { SimulatorBar } from './components/SimulatorBar';
import { FilterExplorerModal } from './components/FilterExplorerModal';
import { PlanModal } from './components/PlanModal';
import { IoCContainerMemoryModal } from './components/IoCContainerMemoryModal';
import { GuidedGuidePanel } from './components/GuidedGuidePanel';

import { 
  SPRING_NODES, 
  GRAPH_EDGES, 
  SIMULATION_SCENARIOS 
} from './data/springData';
import type { 
  ViewMode, 
  DetailLevel, 
  LearningMode,
  SpringComponentNode, 
  SimulationStep 
} from './data/types';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('WEB_REQUEST_PIPELINE');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('HIGH_LEVEL');
  const [learningMode, setLearningMode] = useState<LearningMode>('GUIDED_STEP_BY_STEP');
  const [isSpotlightMode, setIsSpotlightMode] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<SpringComponentNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isFilterExplorerOpen, setIsFilterExplorerOpen] = useState<boolean>(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [isIoCMemoryOpen, setIsIoCMemoryOpen] = useState<boolean>(false);

  // Simulation state
  const activeScenarios = useMemo(() => {
    const matched = SIMULATION_SCENARIOS.filter((s) => s.viewMode === currentView);
    return matched.length > 0 ? matched : [SIMULATION_SCENARIOS[0]];
  }, [currentView]);

  const [activeScenarioId, setActiveScenarioId] = useState<string>(activeScenarios[0]?.id || 'req_dispatch_scenario');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Whenever the view changes, synchronize active scenario
  useEffect(() => {
    const matched = SIMULATION_SCENARIOS.find((s) => s.viewMode === currentView);
    if (matched) {
      setActiveScenarioId(matched.id);
      setCurrentStepIndex(0);
    }
  }, [currentView]);

  const currentScenario = useMemo(() => {
    return (
      SIMULATION_SCENARIOS.find((s) => s.id === activeScenarioId) ||
      activeScenarios[0]
    );
  }, [activeScenarioId, activeScenarios]);

  const currentSimStep: SimulationStep | null = useMemo(() => {
    if (!currentScenario || currentScenario.steps.length === 0) return null;
    return currentScenario.steps[currentStepIndex] || null;
  }, [currentScenario, currentStepIndex]);

  const activeStepNode = useMemo(() => {
    if (!currentSimStep) return null;
    return SPRING_NODES.find((n) => n.id === currentSimStep.nodeId) || null;
  }, [currentSimStep]);

  // Keyboard navigation for stepping through the guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        if (currentStepIndex + 1 < (currentScenario?.steps.length || 0)) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, currentScenario]);

  // Handle direct selection of a node by ID (e.g. from filter directory)
  const handleSelectNodeById = (nodeId: string) => {
    const target = SPRING_NODES.find((n) => n.id === nodeId);
    if (target) {
      // If node belongs to a different view, switch view first
      if (!target.viewModes.includes(currentView)) {
        setCurrentView(target.viewModes[0]);
      }
      setSelectedNode(target);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#090d13] text-[#e6edf3] overflow-hidden font-sans">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={(v) => {
          setCurrentView(v);
          setSelectedNode(null);
        }}
        detailLevel={detailLevel}
        onToggleDetailLevel={() =>
          setDetailLevel((prev) => (prev === 'HIGH_LEVEL' ? 'LOW_LEVEL' : 'HIGH_LEVEL'))
        }
        learningMode={learningMode}
        onToggleLearningMode={() =>
          setLearningMode((prev) =>
            prev === 'GUIDED_STEP_BY_STEP' ? 'FULL_BLUEPRINT' : 'GUIDED_STEP_BY_STEP'
          )
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFilterExplorer={() => setIsFilterExplorerOpen(true)}
        onOpenIoCMemory={() => setIsIoCMemoryOpen(true)}
        onOpenPlanModal={() => setIsPlanModalOpen(true)}
      />

      {/* Main Interactive Canvas Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <Canvas
          nodes={SPRING_NODES}
          edges={GRAPH_EDGES}
          currentView={currentView}
          detailLevel={detailLevel}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          currentSimStep={currentSimStep}
          searchQuery={searchQuery}
          isSpotlightMode={learningMode === 'GUIDED_STEP_BY_STEP' ? isSpotlightMode : false}
        />

        {/* Guided Step-by-Step Learning Panel (Prevents overwhelm!) */}
        {learningMode === 'GUIDED_STEP_BY_STEP' ? (
          <GuidedGuidePanel
            scenarios={activeScenarios}
            activeScenario={currentScenario}
            onSelectScenario={setActiveScenarioId}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
            activeNode={activeStepNode}
            onOpenInspector={setSelectedNode}
            isSpotlightMode={isSpotlightMode}
            onToggleSpotlight={() => setIsSpotlightMode((prev) => !prev)}
          />
        ) : (
          /* Floating Simulation Tracer Bar (For Full Blueprint mode) */
          <SimulatorBar
            scenarios={activeScenarios}
            activeScenarioId={activeScenarioId}
            onSelectScenario={setActiveScenarioId}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
          />
        )}

        {/* Slide-over Deep-Dive Inspector Drawer */}
        <InspectorDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      </main>

      {/* Modals */}
      <FilterExplorerModal
        isOpen={isFilterExplorerOpen}
        onClose={() => setIsFilterExplorerOpen(false)}
        onSelectNode={handleSelectNodeById}
      />

      <IoCContainerMemoryModal
        isOpen={isIoCMemoryOpen}
        onClose={() => setIsIoCMemoryOpen(false)}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
      />
    </div>
  );
}

export default App;
