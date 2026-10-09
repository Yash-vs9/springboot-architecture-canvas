# 🍃 SpringLens — Spring Boot Architecture & Internals Canvas

> **An interactive, developer-first visual architecture platform designed for software engineers and architects to master what happens behind the scenes in Spring Boot.**

---

## 🌟 Highlights

- **🎯 Guided Step-by-Step Learning Tour**: Learn one milestone at a time with plain-English analogies, avoiding cognitive overload. Includes spotlight focus mode and auto-play animations.
- **🗺️ Interactive Multi-Layer Canvas**: Infinite pan, mouse-wheel zoom (25%–220%), auto-fit, and visual architectural swimlanes.
- **⚡ Dual View Modes (LOD)**: Instant toggle between clean **High-Level System Topology** and **Low-Level JVM Call Stacks** (entry point methods, call hierarchies, and return types).
- **🛡️ Complete Filter Pipeline Directory**: Covers container filters (Tomcat `ApplicationFilterChain`), `DelegatingFilterProxy`, `FilterChainProxy`, and all 15 core Spring Security filters in their exact runtime execution order with `ThreadLocal` context mutations.
- **🧬 IoC Container & 3-Level Cache Simulator**: Visualizes `DefaultListableBeanFactory` memory structures (`singletonObjects`, `earlySingletonObjects`, `singletonFactories`) and steps through circular dependency resolution.
- **🔬 Deep-Dive Component Inspector**: 5-tab slide-over panel with architecture summaries, Spring Framework internal source code snippets, production gotchas (e.g., self-invocation `@Transactional` bypass), and senior interview pearls.

---

## 🏗️ Architectural Topology Covered

```
[HTTP Client / Browser]
       │
       ▼ (TCP Socket / HTTP 1.1 / 2)
[Tomcat NIO Connector] ── (Acceptor -> Poller -> Worker Thread)
       │
       ▼
[Servlet ApplicationFilterChain] ── (CharacterEncodingFilter, CorsFilter)
       │
       ▼
[DelegatingFilterProxy] ── (Bridges Tomcat Container -> Spring IoC)
       │
       ▼
[FilterChainProxy] ── (SecurityFilterChain Dispatcher)
       │
       ▼ (15 Canonical Filters: SecurityContext, Csrf, BearerToken, Authz...)
[DispatcherServlet.doDispatch()]
       ├── 1. checkMultipart()
       ├── 2. getHandler() ──> [RequestMappingHandlerMapping]
       ├── 3. applyPreHandle() ──> [HandlerInterceptor]
       ├── 4. getHandlerAdapter() ──> [RequestMappingHandlerAdapter]
       ├── 5. resolveArgument() ──> [HandlerMethodArgumentResolver] (@RequestBody / @PathVariable)
       ├── 6. method.invoke() ──> [Target @RestController]
       ├── 7. handleReturnValue() ──> [MappingJackson2HttpMessageConverter] (Direct OutputStream)
       ├── 8. applyPostHandle()
       ├── 9. processDispatchResult() ──> [HandlerExceptionResolver] (@ControllerAdvice)
       └── 10. triggerAfterCompletion()
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v18+` or `v20+` (Tested on Node.js v24)
- npm `v9+` or `v10+`

### Installation & Run

```bash
# Clone the repository
git clone <repo-url>
cd springboot-architecture-canvas

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Architecture**: Custom high-performance SVG/Canvas engine with Bezier curve connectors and particle flow animation

---

## 📄 License

MIT License
