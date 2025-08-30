// types/index.ts - Définitions de types centralisées

export interface Task {
  id: string;
  from: 'designer' | 'developer' | 'qa' | 'orchestrator';
  to: 'designer' | 'developer' | 'qa' | 'orchestrator';
  type: 'requirement' | 'code' | 'review' | 'feedback' | 'workflow_trigger';
  title: string;
  description: string;
  data?: any;
  status: 'pending' | 'in_progress' | 'completed';
  created: string;
  workflowId?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  created: string;
}

export interface WorkflowStep {
  id: string;
  agent: 'designer' | 'developer' | 'qa';
  action: string;
  description: string;
  dependencies?: string[];
  autoTrigger: boolean;
  template?: any;
}

export interface AgentState {
  status: string;
  lastActive: string;
}

export interface LogEntry {
  agent: string;
  message: string;
  timestamp: string;
}

export interface MonitoringMetrics {
  startTime: string;
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  totalTasks: number;
  completedTasks: number;
  totalCost: number;
  avgCostPerWorkflow: number;
  agentUtilization: {
    [key: string]: {
      activeTime: number;
      idleTime: number;
      taskCount: number;
    };
  };
  bottlenecks: string[];
  recommendations: string[];
  costProjections: {
    daily: number;
    monthly: number;
    annual: number;
  };
  performance: {
    avgTaskDuration: number;
    successRate: number;
    errorRate: number;
  };
}

export interface MonitoringEvent {
  type: string;
  timestamp: string;
  data: any;
}

export interface MCPResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface Repository {
  findById(id: string): any;
  findAll(): any[];
  create(item: any): any;
  update(id: string, updates: any): any;
  delete(id: string): boolean;
}