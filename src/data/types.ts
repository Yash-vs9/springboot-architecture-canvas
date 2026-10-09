export type ViewMode = 
  | 'WEB_REQUEST_PIPELINE'
  | 'IOC_BEAN_LIFECYCLE'
  | 'STARTUP_BOOTSTRAP'
  | 'SECURITY_FILTER_CHAIN'
  | 'TRANSACTIONS_AND_DATA';

export type DetailLevel = 'HIGH_LEVEL' | 'LOW_LEVEL';

export type ComponentCategory = 
  | 'SERVER'
  | 'SERVLET_FILTER'
  | 'SECURITY_FILTER'
  | 'MVC_CORE'
  | 'HANDLER'
  | 'CONTROLLER'
  | 'IOC_CORE'
  | 'BEAN_POST_PROCESSOR'
  | 'PROXY_AOP'
  | 'BOOTSTRAP'
  | 'AUTOCONFIG'
  | 'DATA_PERSISTENCE';

export interface MethodDetail {
  name: string;
  signature: string;
  description: string;
  returnType?: string;
}

export interface DeepDiveExecution {
  stepByStepTrace: string[];
  memoryAndThreadModel: string;
  designPatterns: string[];
  realWorldScenario?: string;
}

export interface SpringComponentNode {
  id: string;
  name: string;
  simpleName: string;
  package: string;
  category: ComponentCategory;
  layer: string; // e.g. "Network & Web Container", "Servlet Filter Chain", "DispatcherServlet Dispatch"
  roleSummary: string;
  lowLevelExplanation: string;
  executionOrder?: number;
  methods: MethodDetail[];
  codeSnippet: string;
  pitfalls: string[];
  interviewQuestions: {
    question: string;
    answer: string;
  }[];
  configLevers: string[];
  deepDive?: DeepDiveExecution;
  // Canvas layout
  x: number;
  y: number;
  width: number;
  height: number;
  tags: string[];
  viewModes: ViewMode[];
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  lowLevelCall?: string; // e.g. "doDispatch() -> getHandler()"
  dashed?: boolean;
  viewModes: ViewMode[];
}

export type LearningMode = 'GUIDED_STEP_BY_STEP' | 'FULL_BLUEPRINT';

export interface SimulationStep {
  stepNumber: number;
  nodeId: string;
  title: string;
  description: string;
  simpleAnalogy?: string;
  whyItMatters?: string;
  keyTakeaway?: string;
  caller?: string;
  methodCalled: string;
  internalStateChange: string;
  highlightEdges?: string[];
}

export interface SimulationScenario {
  id: string;
  viewMode: ViewMode;
  name: string;
  shortTitle: string;
  description: string;
  steps: SimulationStep[];
}

