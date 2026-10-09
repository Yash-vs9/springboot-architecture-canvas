import type { SpringComponentNode, SimulationScenario, SimulationStep } from '../data/types';

export interface FilterDetailsForPrompt {
  order: number;
  name: string;
  className: string;
  location: string;
  whatItDoes: string;
  detailedExplanation?: string;
  mutatesThreadLocal: string;
  configHook: string;
}

/**
 * Generates an exhaustive, production-grade AI prompt tailored for SpringComponentNode.
 * Can be pasted into ChatGPT, Claude, Gemini, or DeepSeek.
 */
export function generateNodePrompt(node: SpringComponentNode): string {
  const methodList = node.methods
    .map((m) => `  - \`${m.name}\`: \`${m.signature}\` (${m.description})`)
    .join('\n');

  const pitfallList = node.pitfalls
    .map((p, i) => `  ${i + 1}. ${p}`)
    .join('\n');

  const interviewList = node.interviewQuestions
    .map(
      (q, i) =>
        `  Q${i + 1}: ${q.question}\n     Answer Pearl: ${q.answer}`
    )
    .join('\n');

  const configList = node.configLevers
    .map((c) => `  - \`${c}\``)
    .join('\n');

  return `You are a Principal Java & Spring Framework Engineer, Spring Core Contributor, and JVM Internals Specialist.

Please give me an exhaustive, production-grade deep-dive explanation of the following Spring Boot 3.x / Spring Framework 6.x / Jakarta EE 10 architectural component:

============================================================
COMPONENT: ${node.name} (${node.simpleName})
CLASS: ${node.package}.${node.simpleName}
LAYER: ${node.layer} (Category: ${node.category})
${node.executionOrder ? `PIPELINE ORDER: Phase #${node.executionOrder}` : ''}
TAGS: ${node.tags.join(', ')}
SPECIFICATION CONTEXT: Spring Boot 3.x / Spring Framework 6.x / Jakarta Servlet 6.0
============================================================

CONTEXT FROM SPRINGLENS BLUEPRINT:
• High-Level Architectural Role:
${node.roleSummary}

• Low-Level Under-the-Hood Mechanism:
${node.lowLevelExplanation}

• Key Internal Method Signatures:
${methodList || '  (Standard lifecycle methods)'}

• Production Pitfalls & Known Gotchas:
${pitfallList}

• Representative Spring Source Code:
\`\`\`java
${node.codeSnippet}
\`\`\`

• Configuration Levers / Extension Hooks:
${configList}

------------------------------------------------------------
MY LEARNING OBJECTIVES — PLEASE EXPLAIN IN DETAIL:
------------------------------------------------------------
1. 🏛️ ARCHITECTURAL POSITION & LIFECYCLE:
   - Where exactly does this component sit in the Spring Boot request/startup lifecycle?
   - What invokes it, what does it produce, and what downstream components receive its output?

2. ⚙️ STEP-BY-STEP INTERNAL METHOD TRACE:
   - Walk me through the exact Java call stack when this component executes.
   - What happens line-by-line inside the key method(s) (e.g. state transitions, checks, caching)?

3. 🧵 THREAD MODEL, CONCURRENCY & MEMORY:
   - Is this class thread-safe? How does it handle concurrent requests?
   - Does it use ThreadLocal, ConcurrentHashMap, volatile fields, synchronized locks, or immutability?
   - Where are its objects allocated (JVM Heap, Metaspace) and what is their lifecycle (Singleton, Prototype, Request)?

4. 🔬 UNDER-THE-HOOD MECHANICS (Bytecode / Reflection / Proxies / Caches):
   - Does it use dynamic reflection, CGLIB/ByteBuddy subclassing, JDK Dynamic Proxies, or ASM bytecode generation?
   - If caching is involved, what data structures are used and how is eviction/invalidation handled?

5. 💥 PRODUCTION WAR STORIES & COMMON OUTAGES:
   - What are 2-3 real-world production bugs or performance bottlenecks related to this component (e.g. connection pool exhaustion, memory leaks, proxy self-invocation bypass)?
   - How do senior engineers diagnose and debug them in production with logs, thread dumps, or metrics?

6. 🎯 STAFF / PRINCIPAL INTERVIEW PEARLS:
   - Answer these specific interview questions with deep engineering nuance:
${interviewList}

Please format your response clearly with headings, code snippets, and ASCII sequence diagrams where helpful!`;
}

/**
 * Generates an exhaustive prompt for a specific Filter in the Servlet or Spring Security pipeline.
 */
export function generateFilterPrompt(filter: FilterDetailsForPrompt): string {
  return `You are a Spring Security & Servlet Container Internals Architect.

Please give me an exhaustive, production-grade deep-dive explanation of this specific filter in the Spring Boot request pipeline:

============================================================
FILTER: #${filter.order} ${filter.name}
CLASS: ${filter.className}
LOCATION: ${filter.location}
============================================================

OVERVIEW:
• Purpose: ${filter.whatItDoes}
• ThreadLocal Mutation: ${filter.mutatesThreadLocal}
• Configuration Hook: ${filter.configHook}

------------------------------------------------------------
PLEASE BREAK DOWN IN DETAIL:
------------------------------------------------------------
1. 📍 ORDERING & POSITION IN THE CHAIN:
   - Why is this filter placed at position #${filter.order}?
   - What filters must run BEFORE it, and what happens if it is placed incorrectly?
   - What filters run AFTER it that depend on the state it sets up?

2. 🔄 REQUEST / RESPONSE LIFECYCLE & MUTATIONS:
   - Exactly what headers, cookies, session attributes, or request wrappers (\`HttpServletRequestWrapper\`) does it inspect or modify?
   - How does it handle \`${filter.mutatesThreadLocal}\`? Walk me through how and when ThreadLocal values are populated and guaranteed to be cleaned up in a \`finally\` block to prevent thread pool leakage.

3. 🔍 SOURCE CODE EXECUTION TRACE:
   - Provide a simplified, clean walkthrough of its \`doFilter\` / \`doFilterInternal\` implementation from the Spring Framework / Spring Security source code.
   - How does it decide whether to continue the chain (\`filterChain.doFilter(request, response)\`) or short-circuit with an error/redirect?

4. 🛠️ PRODUCTION CONFIGURATION & CUSTOMIZATION:
   - Show how to configure, customize, or disable this filter using modern Spring Security 6.x \`SecurityFilterChain\` Lambda DSL (\`http -> ...\`).
   - If someone needs to replace it with a custom filter, show how to use \`http.addFilterBefore\` or \`http.addFilterAfter\`.

5. ⚠️ COMMON PRODUCTION BUGS & TROUBLESHOOTING:
   - What common production bugs occur here (e.g. CORS preflight 401/403, async request dispatch, CSRF token mismatch on REST APIs, session fixation)?
   - How do you enable and read debug logs for this filter (\`logging.level.org.springframework.security=DEBUG\`)?`;
}

/**
 * Generates an AI prompt for a Guided Tour Step.
 */
export function generateStepPrompt(
  scenario: SimulationScenario,
  step: SimulationStep,
  node?: SpringComponentNode | null
): string {
  return `You are an expert Spring Boot Architect and Teacher.

I am studying the "${scenario.name}" roadmap and currently on Step #${step.stepNumber}: "${step.title}".

============================================================
ROADMAP: ${scenario.name}
CURRENT STEP: #${step.stepNumber} - ${step.title}
COMPONENT: ${node ? `${node.name} (${node.package}.${node.simpleName})` : step.nodeId}
CALLER: ${step.caller || 'Preceding Phase'}
METHOD CALLED: \`${step.methodCalled}\`
INTERNAL STATE CHANGE: ${step.internalStateChange}
============================================================

WHAT I ALREADY KNOW:
• Description: ${step.description}
• In Plain English / Real-World Analogy: ${step.simpleAnalogy || 'N/A'}
• Why It Matters: ${step.whyItMatters || 'N/A'}
• Key Takeaway: ${step.keyTakeaway || 'N/A'}

------------------------------------------------------------
WHAT I NEED YOU TO EXPLAIN IN DEPTH:
------------------------------------------------------------
1. 🧠 DEEP DIVE:
   - Explain what actually happens in JVM memory and thread execution during this exact step.
   - Break down the call \`${step.methodCalled}\` down to the exact data structures and conditional logic.

2. 🔗 CONNECTING THE DOTS:
   - Why couldn't the previous step directly call the next step? Why is this intermediary step mandatory in clean Spring architecture?

3. 💡 REAL-WORLD USE CASE:
   - Provide a concrete enterprise scenario (e.g. e-commerce checkout, banking transfer, JWT authentication) illustrating this exact step in action.

4. ❓ PRACTICE INTERVIEW QUESTION:
   - Give me a tough technical interview question based on this step, and then provide the Staff-level model answer.`;
}

/**
 * Generates an AI prompt for the Spring IoC 3-Level Cache Simulator.
 */
export function generateIoCCachePrompt(): string {
  return `You are a Spring Framework Core Engine Architect specializing in DefaultListableBeanFactory, BeanPostProcessor lifecycle, and JVM Memory structures.

Please give me an exhaustive, technical deep-dive explanation of the **Spring 3-Level Singleton Cache** (\`DefaultSingletonBeanRegistry\`) and how it resolves circular dependencies.

============================================================
TOPIC: Spring IoC 3-Level Singleton Cache & Circular Dependency Resolution
============================================================

PLEASE COVER IN DETAIL:
1. 🗃️ THE THREE CACHE MAPS:
   - Level 1 (\`singletonObjects\` - ConcurrentHashMap): What lives here? When is an object promoted to L1?
   - Level 2 (\`earlySingletonObjects\` - HashMap): Why do we need this separate from Level 1 and Level 3?
   - Level 3 (\`singletonFactories\` - HashMap<String, ObjectFactory<?>>): What is the lambda / ObjectFactory stored here? Why don't we create the early bean eagerly?

2. 🔄 CIRCULAR DEPENDENCY STEP-BY-STEP (Bean A depends on Bean B, Bean B depends on Bean A):
   - Walk through the exact call sequence of \`getBean()\`, \`doGetBean()\`, \`getSingleton()\`, \`createBean()\`, \`doCreateBean()\`, \`addSingletonFactory()\`, and \`populateBean()\`.
   - Trace how Bean B gets a reference to Bean A before Bean A is fully initialized.

3. 🛡️ PROXIES & AOP WITH CIRCULAR DEPENDENCIES:
   - What happens if Bean A has \`@Transactional\` or \`@Async\`?
   - How does \`SmartInstantiationAwareBeanPostProcessor.getEarlyBeanReference()\` ensure Bean B gets the CGLIB proxy rather than the raw target instance?
   - Why does Spring 5.1+ fail by default if \`@Async\` is used in a circular dependency?

4. 🚫 CONSTRUCTOR INJECTION VS FIELD/SETTER INJECTION:
   - Why CANNOT the 3-level cache resolve circular dependencies when constructors are used (\`BeanCurrentlyInCreationException\`)?
   - How does JVM bytecode stack allocation explain this physical limitation?

5. ⚡ MODERN BEST PRACTICES (Spring Boot 2.6+ / 3.x):
   - Why is \`spring.main.allow-circular-references=false\` by default in modern Spring Boot?
   - How should engineers refactor circular dependencies using events, \`@Lazy\`, or mediator classes?`;
}
