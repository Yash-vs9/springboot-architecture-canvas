import type { FC } from 'react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlanModal: FC<PlanModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6db33f]/10 border border-[#6db33f]/30 flex items-center justify-center text-[#6db33f]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Refined Engineering Prompt & Architecture Plan
              </h2>
              <p className="text-xs text-[#8b949e]">
                Master plan & technical specification for Spring Boot Internals Canvas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#c9d1d9] leading-relaxed bg-[#0d1117]">
          {/* Section 1: Refined Prompt */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6db33f]" />
              1. Refined Master Prompt
            </h3>
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] space-y-2 text-[#e6edf3]">
              <p className="italic">
                &ldquo;Build an interactive developer-first visual architecture canvas application designed for mid-to-senior software engineers to master the internals of Spring Boot.
              </p>
              <p>
                The platform features a multi-layered, zoomable canvas visualizing:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#8b949e] pl-2 font-mono text-[11px]">
                <li><strong className="text-white">Web Dispatch Pipeline</strong>: Tomcat Acceptor/Poller, Servlet Filter Chain, Spring Security FilterChain (15 filters), DispatcherServlet.doDispatch(), HandlerMapping, HandlerAdapters, Argument Resolvers, and Jackson serialization.</li>
                <li><strong className="text-white">IoC & Bean Lifecycle</strong>: DefaultListableBeanFactory, BeanDefinitions, BeanFactoryPostProcessors, Instantiation reflection, 3-level singleton cache (circular dependency engine), and BeanPostProcessor initialization hooks.</li>
                <li><strong className="text-white">Bootstrap & Auto-Configuration</strong>: SpringApplication.run(), Environment & ConfigData, AutoConfiguration.imports, and AbstractApplicationContext.refresh() 12 phases.</li>
                <li><strong className="text-white">Transactions & Persistence</strong>: @Transactional AOP proxy interception, ThreadLocal TransactionSynchronizationManager, HikariCP connection checkout, and Hibernate 1st-level cache / OSIV.</li>
              </ul>
              <p>
                Include step-by-step lifecycle flow simulation, deep-dive class inspectors with real method signatures, source code snippets, production pitfalls, and senior interview pearls.&rdquo;
              </p>
            </div>
          </section>

          {/* Section 2: Core Engineering Pillars */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#58a6ff]" />
              2. Core Engineering Pillars Covered
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1.5">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#92ec56]" />
                  Where Filters Live & Run
                </h4>
                <p className="text-[11px] text-[#8b949e]">
                  Separates container-level filters (Tomcat ApplicationFilterChain) from Spring-managed security filters using DelegatingFilterProxy and FilterChainProxy.
                </p>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1.5">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#92ec56]" />
                  High-Level vs Low-Level Diagrams
                </h4>
                <p className="text-[11px] text-[#8b949e]">
                  Dynamic LOD (Level of Detail) switch: toggle from clean architectural system flow to low-level JVM method signatures and call stacks with 1 click.
                </p>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1.5">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#92ec56]" />
                  3-Level Singleton Cache
                </h4>
                <p className="text-[11px] text-[#8b949e]">
                  Visualizes why singletonObjects, earlySingletonObjects, and singletonFactories exist and how they resolve circular dependencies with AOP proxies.
                </p>
              </div>

              <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-1.5">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#92ec56]" />
                  Production Traps & Interview Tips
                </h4>
                <p className="text-[11px] text-[#8b949e]">
                  Equips engineers with real-world failure cases (e.g. self-invocation @Transactional bypass, thread-pool leaks, OSIV DB connection exhaustion).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Architecture Canvas Capabilities */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a371f7]" />
              3. Interactive Canvas Capabilities
            </h3>
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl space-y-2 text-[#8b949e]">
              <p>
                - <strong className="text-white">Smooth Infinite Pan & Zoom</strong>: Mouse-drag canvas, wheel zoom (25% to 220%), auto-fit screen, and real-time minimap.
              </p>
              <p>
                - <strong className="text-white">Animated Flow Simulation</strong>: Play, pause, step forward/backward, and watch glowing SVG particles trace actual HTTP requests and startup events.
              </p>
              <p>
                - <strong className="text-white">Slide-Over Deep-Dive Inspector</strong>: Complete breakdown of every component with copyable FQCN, Spring Framework internal source code, and configuration levers.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
          <span>Spring Boot Architecture Visual Canvas</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#238636] text-white hover:bg-[#2ea043] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
