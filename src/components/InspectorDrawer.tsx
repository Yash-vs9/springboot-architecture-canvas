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
  ChevronRight
} from 'lucide-react';
import type { SpringComponentNode } from '../data/types';

interface InspectorDrawerProps {
  node: SpringComponentNode | null;
  onClose: () => void;
}

type TabType = 'OVERVIEW' | 'CODE' | 'PITFALLS' | 'INTERVIEW' | 'CONFIG';

export const InspectorDrawer: FC<InspectorDrawerProps> = ({ node, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [copied, setCopied] = useState<boolean>(false);

  if (!node) return null;

  const handleCopyPackage = () => {
    navigator.clipboard.writeText(`${node.package}.${node.simpleName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: TabType; label: string; icon: ReactNode }[] = [
    { id: 'OVERVIEW', label: 'Architecture Role', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'CODE', label: 'Java Code & Methods', icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: 'PITFALLS', label: 'Production Pitfalls', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'INTERVIEW', label: 'Interview Pearls', icon: <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'CONFIG', label: 'Config Levers', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside className="fixed top-16 right-0 bottom-0 w-[540px] max-w-[90vw] bg-[#161b22] border-l border-[#30363d] shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#30363d] bg-[#0d1117]/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#238636]/20 text-[#92ec56] border border-[#238636]/30">
              {node.category.replace('_', ' ')}
            </span>
            <span className="text-xs text-[#8b949e] flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {node.layer}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-base font-bold text-white mb-1 leading-snug">
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
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#92ec56]" />
                <span className="text-[#92ec56]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#30363d] bg-[#0d1117] px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all ${
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
              <p className="text-sm text-[#e6edf3] leading-relaxed bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                {node.roleSummary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-1.5">
                Low-Level Engineering Behind The Scenes
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

        {/* TAB 2: JAVA CODE & METHODS */}
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

        {/* TAB 3: PRODUCTION PITFALLS */}
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

        {/* TAB 4: SENIOR INTERVIEW QUESTIONS */}
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

        {/* TAB 5: CONFIG LEVERS */}
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
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between text-xs text-[#8b949e]">
        <span>Spring Boot Core Internal Architecture</span>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-[#21262d] text-white rounded hover:bg-[#30363d] text-xs transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </aside>
  );
};
