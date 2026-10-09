import { useState } from 'react';
import type { FC } from 'react';
import { 
  X, 
  Cpu, 
  Database, 
  RefreshCw, 
  GitBranch,
  Bot,
  Check,
  AlertTriangle
} from 'lucide-react';
import { generateIoCCachePrompt } from '../utils/aiPromptGenerator';

interface IoCContainerMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IoCContainerMemoryModal: FC<IoCContainerMemoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeMemoryTab, setActiveMemoryTab] = useState<'CACHE_SIMULATOR' | 'HIERARCHY' | 'DATA_STRUCTURES'>('CACHE_SIMULATOR');
  const [cacheSimulationStep, setCacheSimulationStep] = useState<number>(0);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  const handleCopyPrompt = () => {
    const prompt = generateIoCCachePrompt();
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  if (!isOpen) return null;

  // 3-Level Cache Simulation Steps
  const cacheSteps = [
    {
      title: 'Initial State: Container Started',
      description: 'The BeanFactory is empty. Both ServiceA and ServiceB need to be created.',
      level1: [],
      level2: [],
      level3: [],
      creationSet: [],
      action: 'Client calls getBean("serviceA").',
    },
    {
      title: 'Step 1: Instantiating ServiceA (Constructor Reflection)',
      description: 'ServiceA is instantiated in memory. It is added to singletonsCurrentlyInCreation. Spring adds an ObjectFactory into the 3rd-level cache.',
      level1: [],
      level2: [],
      level3: ['serviceA: ObjectFactory(() -> getEarlyReference)'],
      creationSet: ['serviceA'],
      action: 'ServiceA starts populateBean() and discovers @Autowired ServiceB.',
    },
    {
      title: 'Step 2: ServiceA requests ServiceB',
      description: 'Spring calls getBean("serviceB"). ServiceB is instantiated and also exposes its ObjectFactory in the 3rd-level cache.',
      level1: [],
      level2: [],
      level3: ['serviceA: ObjectFactory', 'serviceB: ObjectFactory'],
      creationSet: ['serviceA', 'serviceB'],
      action: 'ServiceB starts populateBean() and discovers @Autowired ServiceA!',
    },
    {
      title: 'Step 3: ServiceB resolves ServiceA from 3rd-Level Cache',
      description: 'getBean("serviceA"): Miss in Level 1, Miss in Level 2, FOUND in Level 3! Invokes ObjectFactory.getObject(). ServiceA is promoted to Level 2 (early reference) and removed from Level 3.',
      level1: [],
      level2: ['serviceA: EarlyProxyReference (partially initialized)'],
      level3: ['serviceB: ObjectFactory'],
      creationSet: ['serviceA', 'serviceB'],
      action: 'ServiceB injects ServiceA early proxy reference and finishes initialization.',
    },
    {
      title: 'Step 4: ServiceB is fully created and Promoted to Level 1',
      description: 'ServiceB completes @PostConstruct, InitializingBean, and AOP wrapping. Promoted to Level 1 singletonObjects. Removed from Level 3.',
      level1: ['serviceB: Fully Initialized Singleton'],
      level2: ['serviceA: EarlyProxyReference'],
      level3: [],
      creationSet: ['serviceA'],
      action: 'ServiceA receives fully initialized ServiceB into its field.',
    },
    {
      title: 'Step 5: ServiceA Completes Initialization & Promoted to Level 1',
      description: 'ServiceA finishes all BeanPostProcessor callbacks. Promoted to Level 1 singletonObjects. Level 2 early reference is cleared. Circular dependency successfully resolved!',
      level1: ['serviceB: Fully Initialized Singleton', 'serviceA: Fully Initialized Singleton'],
      level2: [],
      level3: [],
      creationSet: [],
      action: 'Both beans are now ready in singletonObjects cache with singleton guarantees.',
    },
  ];

  const currentStep = cacheSteps[cacheSimulationStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Spring IoC Container Memory & 3-Level Cache Internals
              </h2>
              <p className="text-xs text-[#8b949e]">
                Low-level data structures, container inheritance hierarchy, and circular dependency memory mechanics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPrompt}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy an exhaustive prompt explaining 3-level cache internals for ChatGPT / Claude"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#92ec56]" />
                  <span className="text-[#92ec56]">Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy 3-Level Cache AI Prompt</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-[#30363d] bg-[#161b22] flex gap-2">
          <button
            onClick={() => setActiveMemoryTab('CACHE_SIMULATOR')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeMemoryTab === 'CACHE_SIMULATOR'
                ? 'border-[#6db33f] text-white'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#6db33f]" />
            <span>3-Level Cache Interactive Simulator</span>
          </button>

          <button
            onClick={() => setActiveMemoryTab('DATA_STRUCTURES')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeMemoryTab === 'DATA_STRUCTURES'
                ? 'border-[#58a6ff] text-white'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>DefaultListableBeanFactory Memory Structures</span>
          </button>

          <button
            onClick={() => setActiveMemoryTab('HIERARCHY')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeMemoryTab === 'HIERARCHY'
                ? 'border-[#a371f7] text-white'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-[#a371f7]" />
            <span>BeanFactory & ApplicationContext Hierarchy</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0d1117] space-y-6">
          {/* TAB 1: 3-LEVEL CACHE SIMULATOR */}
          {activeMemoryTab === 'CACHE_SIMULATOR' && (
            <div className="space-y-6">
              {/* Modern Spring Boot 3.x / 2.6+ Architectural Reality Banner */}
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-300 block">
                    Important Spring Boot 3.x / 2.6+ Architectural Specification:
                  </span>
                  <p className="text-amber-200/90 leading-relaxed">
                    By default in Spring Boot 2.6+ and 3.x, circular references are <strong>disabled</strong> (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">spring.main.allow-circular-references=false</code>). The 3-level cache mechanism below is Spring Framework's internal engine (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">DefaultSingletonBeanRegistry</code>) that resolves field/setter circular dependencies when enabled or in standalone Spring Framework. Note: Constructor-based circular references can <strong>never</strong> be resolved by the cache.
                  </p>
                </div>
              </div>

              {/* Stepper controls */}
              <div className="flex items-center justify-between bg-[#161b22] p-3.5 rounded-xl border border-[#30363d]">
                <div>
                  <span className="text-[11px] font-mono text-[#6db33f] uppercase block mb-0.5">
                    Step {cacheSimulationStep + 1} of {cacheSteps.length}
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {currentStep.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCacheSimulationStep((prev) => Math.max(0, prev - 1))}
                    disabled={cacheSimulationStep === 0}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#21262d] text-[#c9d1d9] hover:text-white disabled:opacity-30 disabled:hover:text-[#c9d1d9] transition-colors"
                  >
                    Previous Step
                  </button>
                  <button
                    onClick={() =>
                      setCacheSimulationStep((prev) =>
                        prev + 1 < cacheSteps.length ? prev + 1 : 0
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#238636] text-white hover:bg-[#2ea043] font-semibold transition-colors"
                  >
                    {cacheSimulationStep + 1 < cacheSteps.length ? 'Next Step' : 'Restart Flow'}
                  </button>
                </div>
              </div>

              {/* Step Narrative */}
              <p className="text-xs text-[#c9d1d9] leading-relaxed bg-[#161b22]/50 p-3.5 rounded-lg border border-[#30363d]">
                {currentStep.description}
              </p>

              {/* Memory Cache Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1st Level Cache */}
                <div className="p-4 bg-[#161b22] rounded-xl border border-emerald-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                        1st Level Cache
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                        singletonObjects
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] mb-3">
                      Fully initialized singletons. Ready for application use.
                    </p>

                    <div className="space-y-1.5 min-h-[80px]">
                      {currentStep.level1.length === 0 ? (
                        <div className="text-xs text-[#484f58] italic py-4 text-center">
                          (Empty)
                        </div>
                      ) : (
                        currentStep.level1.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-200"
                          >
                            {item}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-[#8b949e]">
                    Map&lt;String, Object&gt;
                  </div>
                </div>

                {/* 2nd Level Cache */}
                <div className="p-4 bg-[#161b22] rounded-xl border border-amber-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                        2nd Level Cache
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                        earlySingletonObjects
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] mb-3">
                      Early exposed references / early proxies to break cycles.
                    </p>

                    <div className="space-y-1.5 min-h-[80px]">
                      {currentStep.level2.length === 0 ? (
                        <div className="text-xs text-[#484f58] italic py-4 text-center">
                          (Empty)
                        </div>
                      ) : (
                        currentStep.level2.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-xs font-mono text-amber-200"
                          >
                            {item}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-[#8b949e]">
                    Map&lt;String, Object&gt;
                  </div>
                </div>

                {/* 3rd Level Cache */}
                <div className="p-4 bg-[#161b22] rounded-xl border border-blue-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">
                        3rd Level Cache
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
                        singletonFactories
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] mb-3">
                      Holds ObjectFactory lambda to generate early proxy if circular cycle occurs.
                    </p>

                    <div className="space-y-1.5 min-h-[80px]">
                      {currentStep.level3.length === 0 ? (
                        <div className="text-xs text-[#484f58] italic py-4 text-center">
                          (Empty)
                        </div>
                      ) : (
                        currentStep.level3.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-blue-950/40 border border-blue-500/30 text-xs font-mono text-blue-200"
                          >
                            {item}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono text-[#8b949e]">
                    Map&lt;String, ObjectFactory&lt;?&gt;&gt;
                  </div>
                </div>
              </div>

              {/* Set of singletons in creation */}
              <div className="p-3 bg-[#161b22] rounded-xl border border-[#30363d] flex items-center justify-between text-xs">
                <span className="text-[#8b949e] font-mono">
                  singletonsCurrentlyInCreation (Set&lt;String&gt;):
                </span>
                <span className="font-mono text-[#92ec56]">
                  {currentStep.creationSet.length > 0
                    ? `[${currentStep.creationSet.join(', ')}]`
                    : '[] (None in creation)'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: DATA STRUCTURES */}
          {activeMemoryTab === 'DATA_STRUCTURES' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">
                Under the Hood: DefaultListableBeanFactory Internal Maps
              </h4>
              <p className="text-xs text-[#8b949e]">
                DefaultListableBeanFactory extends DefaultSingletonBeanRegistry and encapsulates all IoC state in these Concurrent and Linked hash collections:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                  <span className="text-[#58a6ff] block font-bold">beanDefinitionMap</span>
                  <span className="text-[11px] text-[#8b949e]">ConcurrentHashMap&lt;String, BeanDefinition&gt;</span>
                  <p className="text-xs text-[#c9d1d9] mt-1 font-sans">
                    Holds the configuration metadata (class name, scope, autowire mode, lazy-init flag, constructor arguments) scanned by ASM.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                  <span className="text-[#92ec56] block font-bold">singletonObjects</span>
                  <span className="text-[11px] text-[#8b949e]">ConcurrentHashMap&lt;String, Object&gt; (capacity 256)</span>
                  <p className="text-xs text-[#c9d1d9] mt-1 font-sans">
                    The final primary singleton cache. Any getBean() call checks this map first.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                  <span className="text-amber-400 block font-bold">earlySingletonObjects</span>
                  <span className="text-[11px] text-[#8b949e]">HashMap&lt;String, Object&gt; (capacity 16)</span>
                  <p className="text-xs text-[#c9d1d9] mt-1 font-sans">
                    Stores references to beans that have been instantiated via reflection but whose property injection or BeanPostProcessors have not finished.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                  <span className="text-cyan-400 block font-bold">singletonFactories</span>
                  <span className="text-[11px] text-[#8b949e]">HashMap&lt;String, ObjectFactory&lt;?&gt;&gt;</span>
                  <p className="text-xs text-[#c9d1d9] mt-1 font-sans">
                    Stores ObjectFactory functional interfaces that wrap SmartInstantiationAwareBeanPostProcessor to create early AOP proxies only when requested by a circular dependency.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                  <span className="text-purple-400 block font-bold">dependentBeanMap & dependenciesForBeanMap</span>
                  <span className="text-[11px] text-[#8b949e]">ConcurrentHashMap&lt;String, Set&lt;String&gt;&gt;</span>
                  <p className="text-xs text-[#c9d1d9] mt-1 font-sans">
                    Maintains the directed dependency graph ensuring beans are destroyed in exact reverse order of creation when the context shuts down.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HIERARCHY */}
          {activeMemoryTab === 'HIERARCHY' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">
                Spring Container Interface & Class Inheritance Graph
              </h4>
              <p className="text-xs text-[#8b949e]">
                Understanding the distinction between the BeanFactory hierarchy and the ApplicationContext hierarchy is a cornerstone of senior Spring engineering:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#161b22] rounded-xl border border-[#30363d] space-y-3">
                  <h5 className="font-bold text-[#58a6ff] text-xs uppercase tracking-wider">
                    BeanFactory Hierarchy (Core IoC)
                  </h5>
                  <div className="space-y-1.5 font-mono text-[11px] text-[#c9d1d9]">
                    <div className="p-1.5 bg-black/40 rounded border border-white/5">
                      &bull; interface BeanFactory (Root)
                    </div>
                    <div className="p-1.5 bg-black/40 rounded border border-white/5 pl-4 text-[#8b949e]">
                      &rarr; interface ListableBeanFactory
                    </div>
                    <div className="p-1.5 bg-black/40 rounded border border-white/5 pl-6 text-[#8b949e]">
                      &rarr; interface ConfigurableListableBeanFactory
                    </div>
                    <div className="p-2 bg-[#238636]/20 text-[#92ec56] rounded border border-[#238636]/40 font-bold pl-8">
                      &rArr; class DefaultListableBeanFactory (Concrete Backbone)
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#161b22] rounded-xl border border-[#30363d] space-y-3">
                  <h5 className="font-bold text-[#a371f7] text-xs uppercase tracking-wider">
                    ApplicationContext Hierarchy (Enterprise Container)
                  </h5>
                  <div className="space-y-1.5 font-mono text-[11px] text-[#c9d1d9]">
                    <div className="p-1.5 bg-black/40 rounded border border-white/5">
                      &bull; interface ApplicationContext
                    </div>
                    <div className="p-1.5 bg-black/40 rounded border border-white/5 pl-4 text-[#8b949e]">
                      &rarr; interface ConfigurableApplicationContext
                    </div>
                    <div className="p-1.5 bg-black/40 rounded border border-white/5 pl-6 text-[#8b949e]">
                      &rarr; abstract class AbstractApplicationContext
                    </div>
                    <div className="p-2 bg-[#a371f7]/20 text-[#d2a8ff] rounded border border-[#a371f7]/40 font-bold pl-8">
                      &rArr; AnnotationConfigServletWebServerApplicationContext
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
          <span>Spring IoC Container Behind The Scenes</span>
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
