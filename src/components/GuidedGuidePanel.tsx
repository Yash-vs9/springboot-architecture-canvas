import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Code2, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Lightbulb,
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  Bot,
  Check
} from 'lucide-react';
import type { SimulationScenario, SimulationStep, SpringComponentNode } from '../data/types';
import { generateStepPrompt } from '../utils/aiPromptGenerator';

interface GuidedGuidePanelProps {
  scenarios: SimulationScenario[];
  activeScenario: SimulationScenario;
  onSelectScenario: (scenarioId: string) => void;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  activeNode: SpringComponentNode | null;
  onOpenInspector: (node: SpringComponentNode) => void;
  isSpotlightMode: boolean;
  onToggleSpotlight: () => void;
  onCloseGuidedMode?: () => void;
}

export const GuidedGuidePanel: FC<GuidedGuidePanelProps> = ({
  scenarios,
  activeScenario,
  onSelectScenario,
  currentStepIndex,
  onStepChange,
  activeNode,
  onOpenInspector,
  isSpotlightMode,
  onToggleSpotlight,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);
  const [copiedStepPrompt, setCopiedStepPrompt] = useState<boolean>(false);

  const steps = activeScenario.steps;
  const currentStep: SimulationStep | undefined = steps[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  const handleCopyStepPrompt = () => {
    if (!currentStep) return;
    const prompt = generateStepPrompt(activeScenario, currentStep, activeNode);
    navigator.clipboard.writeText(prompt);
    setCopiedStepPrompt(true);
    setTimeout(() => setCopiedStepPrompt(false), 2500);
  };

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        onStepChange(currentStepIndex + 1 < steps.length ? currentStepIndex + 1 : 0);
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, steps.length, onStepChange]);

  const handleNext = () => {
    if (currentStepIndex + 1 < steps.length) {
      onStepChange(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    onStepChange(0);
  };

  return (
    <div className="absolute top-4 left-4 z-20 w-[420px] max-w-[92vw] max-h-[calc(100vh-6rem)] bg-[#161b22]/95 backdrop-blur-xl border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e6edf3] animate-in fade-in slide-in-from-left duration-200">
      {/* Header: Roadmap Selector & Mode indicator */}
      <div className="p-4 border-b border-[#30363d] bg-[#0d1117]/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6db33f] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#6db33f]">
              Step-by-Step Learning Guide
            </span>
          </div>

          {/* Spotlight Toggle */}
          <button
            onClick={onToggleSpotlight}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              isSpotlightMode
                ? 'bg-[#6db33f]/15 border-[#6db33f]/50 text-[#92ec56]'
                : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white'
            }`}
            title="Focus only on current step and dim other nodes to eliminate distraction"
          >
            {isSpotlightMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Spotlight ON</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Show All</span>
              </>
            )}
          </button>
        </div>

        {/* Roadmap Selector Dropdown */}
        <div className="relative">
          <select
            value={activeScenario.id}
            onChange={(e) => {
              setIsPlaying(false);
              onSelectScenario(e.target.value);
              onStepChange(0);
            }}
            className="w-full appearance-none bg-[#161b22] text-xs font-semibold text-white pl-3 pr-8 py-2 rounded-xl border border-[#30363d] focus:outline-none focus:border-[#58a6ff] cursor-pointer shadow-inner"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                📖 {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#8b949e] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Progress Bar & Counter */}
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
            <span>
              Step <strong className="text-white font-mono">{currentStepIndex + 1}</strong> of{' '}
              <strong className="text-white font-mono">{steps.length}</strong>
            </span>
            <span className="font-mono text-[#58a6ff] font-semibold">{progressPercent}% Completed</span>
          </div>
          <div className="w-full h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#238636] to-[#6db33f] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Educational Card Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {currentStep && (
          <>
            {/* Step Title Badge & Main Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#6db33f]/20 text-[#92ec56] border border-[#6db33f]/40">
                  STAGE #{currentStep.stepNumber}
                </span>
                {activeNode && (
                  <span className="text-[11px] font-mono text-[#8b949e] truncate">
                    {activeNode.package}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white leading-snug">
                {currentStep.title}
              </h3>
            </div>

            {/* In Simple Terms / Analogy (Makes it super readable!) */}
            <div className="p-3.5 bg-[#1f2937]/50 rounded-xl border border-blue-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#58a6ff]">
                <Lightbulb className="w-4 h-4 text-[#58a6ff] flex-shrink-0" />
                <span>In Simple Terms (Plain English)</span>
              </div>
              <p className="text-xs text-[#e6edf3] leading-relaxed">
                {currentStep.simpleAnalogy || currentStep.description}
              </p>
            </div>

            {/* Behind The Scenes (Engineering Mechanics) */}
            <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#92ec56]">
                <Code2 className="w-4 h-4 text-[#92ec56] flex-shrink-0" />
                <span>What Happens Behind The Scenes</span>
              </div>

              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] font-mono text-[#8b949e] block">Entry Point Call:</span>
                  <div className="font-mono text-[11px] bg-black/50 p-2 rounded text-[#79c0ff] border border-white/5 truncate">
                    {currentStep.methodCalled}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-[#8b949e] block">Memory & State Change:</span>
                  <p className="text-xs text-[#c9d1d9] bg-black/30 p-2 rounded border border-white/5">
                    {currentStep.internalStateChange}
                  </p>
                </div>
              </div>
            </div>

            {/* Why it Matters / Interview Pearl */}
            {currentStep.whyItMatters && (
              <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-semibold block mb-0.5">Why You Need To Know This:</strong>
                  <span>{currentStep.whyItMatters}</span>
                </div>
              </div>
            )}

            {/* Action Buttons: Inspect & Copy AI Prompt */}
            <div className="space-y-2">
              {activeNode && (
                <button
                  onClick={() => onOpenInspector(activeNode)}
                  className="w-full py-2 px-3 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] hover:text-white border border-[#30363d] font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#58a6ff]" />
                  <span>Inspect Class Source Code, Pitfalls & Interview Questions</span>
                </button>
              )}

              <button
                onClick={handleCopyStepPrompt}
                className="w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                title="Copy an AI study prompt tailored for this specific step to paste into ChatGPT, Claude, or Gemini"
              >
                {copiedStepPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#92ec56]" />
                    <span className="text-[#92ec56]">AI Study Prompt Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span>Copy AI Study Prompt for this Step</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Step Timeline Bar */}
            <div className="pt-2 border-t border-[#30363d]">
              <button
                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                className="w-full flex items-center justify-between text-[11px] text-[#8b949e] hover:text-white py-1"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  Jump to any step in this roadmap ({steps.length} steps)
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTimelineExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isTimelineExpanded && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                  {steps.map((st, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    const isPast = idx < currentStepIndex;
                    return (
                      <button
                        key={st.stepNumber}
                        onClick={() => onStepChange(idx)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-all ${
                          isCurrent
                            ? 'bg-[#6db33f]/20 text-white font-bold border border-[#6db33f]/40'
                            : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPast ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#92ec56] flex-shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-[#8b949e] text-[9px] flex items-center justify-center font-mono flex-shrink-0">
                              {st.stepNumber}
                            </span>
                          )}
                          <span className="truncate">{st.title.replace(/^Step \d+:\s*/, '')}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] text-[#92ec56] font-mono uppercase flex-shrink-0">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between gap-2">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="flex-1 py-2 px-3 rounded-xl bg-[#21262d] text-xs font-semibold text-[#c9d1d9] hover:text-white hover:bg-[#30363d] disabled:opacity-30 disabled:hover:text-[#c9d1d9] disabled:hover:bg-[#21262d] flex items-center justify-center gap-1.5 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <button
          onClick={handleReset}
          className="p-2 rounded-xl text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          title="Reset to step 1"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
          }`}
          title={isPlaying ? 'Pause Auto-Play' : 'Auto-Play Guided Tour'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStepIndex >= steps.length - 1}
          className="flex-1 py-2 px-3 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-xs font-bold text-white disabled:opacity-30 disabled:hover:bg-[#238636] flex items-center justify-center gap-1.5 transition-all shadow-md"
        >
          <span>Next Step</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
