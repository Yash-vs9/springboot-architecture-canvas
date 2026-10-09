import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Activity, 
  Gauge, 
  ChevronDown 
} from 'lucide-react';
import type { SimulationScenario, SimulationStep } from '../data/types';

interface SimulatorBarProps {
  scenarios: SimulationScenario[];
  activeScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
  currentStepIndex: number;
  onStepChange: (stepIndex: number) => void;
}

export const SimulatorBar: FC<SimulatorBarProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  currentStepIndex,
  onStepChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2000); // ms per step

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const steps = activeScenario.steps;
  const currentStep: SimulationStep | undefined = steps[currentStepIndex];

  // Auto playback timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        onStepChange(
          currentStepIndex + 1 < steps.length ? currentStepIndex + 1 : 0
        );
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed, onStepChange]);

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92vw] max-w-5xl z-20 bg-[#161b22]/95 backdrop-blur-xl border border-[#30363d] rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5">
      {/* Top row: Controls, Scenario Picker, and Progress */}
      <div className="flex items-center justify-between gap-4">
        {/* Scenario Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <Activity className="w-4 h-4 text-[#6db33f]" />
            <span className="font-semibold text-white">Flow Tracer:</span>
          </div>

          <div className="relative">
            <select
              value={activeScenarioId}
              onChange={(e) => {
                setIsPlaying(false);
                onSelectScenario(e.target.value);
                onStepChange(0);
              }}
              className="appearance-none bg-[#0d1117] text-xs font-medium text-[#c9d1d9] pl-3 pr-8 py-1.5 rounded-lg border border-[#30363d] focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8b949e] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white disabled:opacity-30 disabled:hover:text-[#8b949e] transition-colors"
            title="Step Backward"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-[#238636] text-white hover:bg-[#2ea043]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Animate Flow</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white disabled:opacity-30 disabled:hover:text-[#8b949e] transition-colors"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed & Step Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <Gauge className="w-3.5 h-3.5" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-[#0d1117] text-[11px] text-[#8b949e] py-1 px-1.5 rounded border border-[#30363d] focus:outline-none"
            >
              <option value={3000}>0.5x (Slow)</option>
              <option value={2000}>1x (Normal)</option>
              <option value={1000}>2x (Fast)</option>
            </select>
          </div>

          <div className="text-xs font-mono px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-[#58a6ff]">
            Step {currentStepIndex + 1} / {steps.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden border border-white/5">
        <div
          className="bg-[#6db33f] h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Current Step Description Card */}
      {currentStep && (
        <div className="bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d] flex items-center justify-between gap-4 text-xs">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-white text-xs truncate">
                {currentStep.title}
              </span>
              {currentStep.caller && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-[#8b949e]">
                  Caller: {currentStep.caller}
                </span>
              )}
            </div>
            <p className="text-[#8b949e] text-[11px] truncate">
              {currentStep.description}
            </p>
          </div>

          <div className="flex items-center gap-3 border-l border-[#30363d] pl-4 flex-shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#92ec56] block truncate">
                {currentStep.methodCalled}
              </span>
              <span className="text-[10px] text-[#8b949e] block truncate max-w-xs">
                {currentStep.internalStateChange}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
