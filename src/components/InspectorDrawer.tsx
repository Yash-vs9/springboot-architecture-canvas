import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  BookOpen, 
  Code2, 
  AlertTriangle, 
  HelpCircle, 
  Sliders, 
  Layers,
  ChevronRight,
  Bot,
  Sparkles,
  Cpu,
  Workflow,
  Eye
} from 'lucide-react';
import type { SpringComponentNode } from '../data/types';
import { generateNodePrompt } from '../utils/aiPromptGenerator';

interface InspectorDrawerProps {
  node: SpringComponentNode | null;
  onClose: () => void;
}

type TabType = 'OVERVIEW' | 'DEEP_DIVE' | 'CODE' | 'PITFALLS' | 'INTERVIEW' | 'CONFIG';

export const InspectorDrawer: FC<InspectorDrawerProps> = ({ node, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [copiedPackage, setCopiedPackage] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);

  if (!node) return null;

  const handleCopyPackage = () => {
    navigator.clipboard.writeText(`${node.package}.${node.simpleName}`);
    setCopiedPackage(true);
    setTimeout(() => setCopiedPackage(false), 2000);
  };

  const handleCopyAIPrompt = () => {
    const prompt = generateNodePrompt(node);
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const tabs: { id: TabType; label: string; icon: ReactNode }[] = [
    { id: 'OVERVIEW', label: 'Role & Architecture', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'DEEP_DIVE', label: 'Internal Trace & Memory', icon: <Workflow className="w-3.5 h-3.5 text-[#58a6ff]" /> },
    { id: 'CODE', label: 'Java Code & Methods', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'PITFALLS', label: 'Production Pitfalls', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'INTERVIEW', label: 'Interview Pearls', icon: <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'CONFIG', label: 'Config Levers', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside className="fixed top-16 right-0 bottom-0 w-[580px] max-w-[92vw] bg-[#161b22] border-l border-[#30363d] shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#30363d] bg-[#0d1117]/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#238636]/20 text-[#92ec56] border border-[#238636]/30">
              {node.category.replace('_', ' ')}
            </span>
            <span className="text-xs text-[#8b949e] flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {node.layer}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAIPrompt}
              className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy an exhaustive prompt tailored for ChatGPT, Claude, or Gemini"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#92ec56]" />
                  <span className="text-[#92ec56]">Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>Copy AI Prompt</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold text-white leading-snug">
          {node.name}
        </h3>

        {/* Copyable full package */}
        <div className="flex items-center justify-between bg-[#161b22] px-2.5 py-1.5 rounded border border-[#30363d] text-xs font-mono text-[#8b949e]">
          <span className="truncate">{node.package}</span>
          <button
            onClick={handleCopyPackage}
            className="ml-2 flex items-center gap-1 text-[11px] text-[#58a6ff] hover:underline flex-shrink-0"
            title="Copy FQCN"
          >
            {copiedPackage ? (
              <>
                <Check className="w-3 h-3 text-[#92ec56]" />
                <span className="text-[#92ec56]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy FQCN</span>
              </>
            )}
          </button>
        </div>

        {/* AI Prompt Quick Launcher Banner */}
        <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-purple-200 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="truncate">Need even more depth? Copy prompt for any AI chat</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="text-[11px] text-[#8b949e] hover:text-white underline flex items-center gap-0.5"
            >
              <Eye className="w-3 h-3" />
              <span>{showPromptPreview ? 'Hide' : 'Preview'}</span>
            </button>
            <button
              onClick={handleCopyAIPrompt}
              className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium text-[11px] transition-colors"
            >
              {copiedPrompt ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Collapsible Prompt Preview */}
        {showPromptPreview && (
          <div className="bg-[#090d13] border border-purple-500/40 rounded-lg p-3 text-[11px] font-mono text-[#c9d1d9] max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
            {generateNodePrompt(node)}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#30363d] bg-[#0d1117] px-2 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all flex-shrink-0 ${
                isActive
                  ? 'border-[#58a6ff] text-white bg-[#161b22]'
                  : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5">
                High-Level Role
              </h4>
              <p className="text-sm text-[#e6edf3] leading-relaxed bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d]">
                {node.roleSummary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5 flex items-center justify-between">
                <span>Low-Level Engineering Behind The Scenes</span>
                <span className="text-[10px] font-mono text-[#58a6ff]">Core Mechanics</span>
              </h4>
              <p className="text-xs text-[#c9d1d9] leading-relaxed bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d]">
                {node.lowLevelExplanation}
              </p>
            </div>

            {node.executionOrder && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#21262d]/50 border border-[#30363d] text-xs text-[#8b949e]">
                <span className="font-mono text-[#92ec56]">Phase #{node.executionOrder}</span>
                <span>in standard runtime execution pipeline</span>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Ecosystem Tags & Concepts
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs bg-[#21262d] text-[#58a6ff] border border-[#30363d] font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEEP DIVE & EXECUTION TRACE */}
        {activeTab === 'DEEP_DIVE' && (
          <div className="space-y-4">
            {node.deepDive ? (
              <>
                {/* Step-by-Step Execution Sequence */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2 flex items-center gap-1.5">
                    <Workflow className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>Step-by-Step JVM Execution Trace</span>
                  </h4>
                  <div className="space-y-2">
                    {node.deepDive.stepByStepTrace.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] flex items-start gap-2.5 text-xs text-[#e6edf3]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30 flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Memory and Concurrency Model */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Memory & Thread Concurrency Model</span>
                  </h4>
                  <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs text-[#c9d1d9] leading-relaxed">
                    {node.deepDive.memoryAndThreadModel}
                  </div>
                </div>

                {/* Design Patterns Implemented */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Design Patterns Implemented</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {node.deepDive.designPatterns.map((pattern, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Real-World Production Scenario */}
                {node.deepDive.realWorldScenario && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5">
                      Enterprise Production Scenario
                    </h4>
                    <p className="text-xs text-[#c9d1d9] bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d] leading-relaxed">
                      {node.deepDive.realWorldScenario}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs space-y-3">
                  <div className="flex items-center gap-2 text-[#58a6ff] font-semibold">
                    <Workflow className="w-4 h-4" />
                    <span>Detailed Runtime Execution Sequence</span>
                  </div>
                  <p className="text-[#c9d1d9] leading-relaxed">
                    {node.lowLevelExplanation}
                  </p>
                  <div className="pt-2 border-t border-[#30363d] space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold block">
                      Key Execution Entry Points:
                    </span>
                    {node.methods.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-mono text-[#92ec56] font-bold">{i + 1}.</span>
                        <div>
                          <span className="font-mono text-[#79c0ff]">{m.name}</span>
                          <span className="text-[#8b949e]"> — {m.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI prompt shortcut */}
                <div className="p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-semibold">
                    <Bot className="w-4 h-4" />
                    <span>Want line-by-line bytecode & trace details?</span>
                  </div>
                  <p className="text-purple-200/80 leading-relaxed">
                    Click below to generate and copy an expert study prompt designed to get a line-by-line internal breakdown from ChatGPT, Claude, or Gemini.
                  </p>
                  <button
                    onClick={handleCopyAIPrompt}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPrompt ? 'Copied Prompt to Clipboard!' : 'Copy AI Prompt for this Node'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: JAVA CODE & METHODS */}
        {activeTab === 'CODE' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Core Method Signatures
              </h4>
              <div className="space-y-2">
                {node.methods.map((method, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#58a6ff]" />
                      <span className="text-xs font-mono font-bold text-[#92ec56]">
                        {method.name}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[#79c0ff] bg-black/30 p-1.5 rounded">
                      {method.signature}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-1">{method.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                  Spring Source Code Walkthrough
                </h4>
              </div>
              <div className="relative group">
                <pre className="p-3.5 bg-[#090d13] border border-[#30363d] rounded-lg font-mono text-[11px] text-[#e6edf3] overflow-x-auto leading-relaxed">
                  <code>{node.codeSnippet}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTION PITFALLS */}
        {activeTab === 'PITFALLS' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                These are critical real-world runtime pitfalls and memory/concurrency bugs observed in production Spring Boot services.
              </span>
            </div>

            {node.pitfalls.map((pitfall, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-start gap-2.5 text-xs text-[#e6edf3] leading-relaxed"
              >
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono text-[11px] flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p>{pitfall}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: SENIOR INTERVIEW QUESTIONS */}
        {activeTab === 'INTERVIEW' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Authoritative answers to core Spring Boot internal architecture questions commonly asked in senior engineering interviews.
              </span>
            </div>

            {node.interviewQuestions.map((q, idx) => (
              <div
                key={idx}
                className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden"
              >
                <div className="p-3 bg-[#161b22] border-b border-[#30363d]">
                  <span className="text-[10px] font-mono text-[#58a6ff] uppercase block mb-0.5">
                    Interview Question #{idx + 1}
                  </span>
                  <h5 className="text-xs font-semibold text-white leading-snug">
                    {q.question}
                  </h5>
                </div>
                <div className="p-3 text-xs text-[#c9d1d9] leading-relaxed bg-[#0d1117]">
                  <span className="font-semibold text-[#92ec56] block mb-1">
                    Engineering Answer:
                  </span>
                  <p>{q.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: CONFIG LEVERS */}
        {activeTab === 'CONFIG' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Configuration Keys & Customization Hooks
              </h4>
              <p className="text-xs text-[#8b949e] mb-3">
                Use these application.properties / application.yaml keys and bean extension points to tune or override this component in production:
              </p>

              <div className="space-y-2">
                {node.configLevers.map((lever, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg font-mono text-xs text-[#79c0ff] flex items-center justify-between"
                  >
                    <span className="truncate">{lever}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-3.5 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between text-xs text-[#8b949e]">
        <button
          onClick={handleCopyAIPrompt}
          className="text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{copiedPrompt ? 'Copied Prompt!' : 'Copy AI Study Prompt'}</span>
        </button>

        <button
          onClick={onClose}
          className="px-3.5 py-1.5 bg-[#21262d] text-white rounded-lg hover:bg-[#30363d] text-xs font-medium transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </aside>
  );
};
