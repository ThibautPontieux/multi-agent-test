// Types pour le système de monitoring MCP
export type AgentType = 'designer' | 'developer' | 'qa' | 'orchestrator';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type WorkflowType = 'development-cycle' | 'bug-fix' | 'feature-request' | 'code-review';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: 'online' | 'offline' | 'busy' | 'error';
  lastActivity: string;
  currentTasks: number;
  totalTasksCompleted: number;
  performance: {
    successRate: number;
    averageTaskTime: number; // en minutes
    workloadCapacity: number;
  };
  capabilities: string[];
}

export interface Task {
  id: string;
  from: string;
  to: string;
  type: string;
  title: string;
  description: string;
  status: TaskStatus;
  created: string;
  updated?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number; // en minutes
  actualDuration?: number; // en minutes
  workflowId?: string;
  data?: Record<string, any>;
  workflowInfo?: {
    workflowName: string;
    currentStep: number;
    totalSteps: number;
    isAutoTriggered: boolean;
  };
}

export interface Workflow {
  id: string;
  name: string;
  type: WorkflowType;
  status: 'active' | 'completed' | 'failed' | 'paused';
  description: string;
  projectName: string;
  startTime: string;
  endTime?: string;
  currentStep: number;
  totalSteps: number;
  progress: number; // pourcentage 0-100
  assignedAgents: AgentType[];
  tasks: Task[];
  metadata?: {
    repository?: string;
    branch?: string;
    pullRequestId?: string;
    priority: 'low' | 'medium' | 'high';
  };
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeWorkflows: number;
  completedWorkflows: number;
  systemUptime: string;
  averageTaskCompletionTime: number;
  systemLoad: number; // 0-100
  memoryUsage: number; // 0-100
  errorRate: number; // pourcentage
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source: string; // agent ou système
  context?: {
    agentId?: string;
    taskId?: string;
    workflowId?: string;
    additionalData?: Record<string, any>;
  };
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  source: string;
  actionRequired?: boolean;
  relatedEntity?: {
    type: 'agent' | 'task' | 'workflow';
    id: string;
    name: string;
  };
}

// Types pour les WebSocket messages
export interface WebSocketMessage {
  type: 'agent_update' | 'task_update' | 'workflow_update' | 'system_metrics' | 'log_entry' | 'alert';
  payload: any;
  timestamp: string;
}

// Types pour l'API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Configuration du dashboard
export interface DashboardConfig {
  refreshInterval: number; // en secondes
  maxLogsDisplayed: number;
  enableRealTimeUpdates: boolean;
  alertsRetentionDays: number;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    desktop: boolean;
    sounds: boolean;
    criticalOnly: boolean;
  };
}
