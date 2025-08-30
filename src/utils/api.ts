import type { 
  Agent, 
  Task, 
  Workflow, 
  SystemMetrics, 
  LogEntry, 
  Alert, 
  ApiResponse, 
  PaginatedResponse 
} from '@/types';

class MCPApiService {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    const response = await this.request<Agent[]>('/agents');
    return response.data || [];
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    const response = await this.request<Agent>(`/agents/${agentId}`);
    return response.data || null;
  }

  async updateAgentStatus(agentId: string, status: Agent['status']): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/agents/${agentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data?.success || false;
  }

  // Tasks
  async getTasks(filters?: {
    agentId?: string;
    status?: string;
    workflowId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = `/tasks${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<PaginatedResponse<Task>>(endpoint);
    return response.data || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }

  async getTask(taskId: string): Promise<Task | null> {
    const response = await this.request<Task>(`/tasks/${taskId}`);
    return response.data || null;
  }

  async createTask(task: Omit<Task, 'id' | 'created'>): Promise<Task | null> {
    const response = await this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return response.data || null;
  }

  async updateTaskStatus(taskId: string, status: Task['status'], agentId?: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, agentId }),
    });
    return response.data?.success || false;
  }

  // Workflows
  async getWorkflows(filters?: {
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Workflow>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = `/workflows${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<PaginatedResponse<Workflow>>(endpoint);
    return response.data || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const response = await this.request<Workflow>(`/workflows/${workflowId}`);
    return response.data || null;
  }

  async startWorkflow(workflowType: string, projectName: string, description: string): Promise<Workflow | null> {
    const response = await this.request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify({ workflowType, projectName, description }),
    });
    return response.data || null;
  }

  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/workflows/${workflowId}/pause`, {
      method: 'PUT',
    });
    return response.data?.success || false;
  }

  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/workflows/${workflowId}/resume`, {
      method: 'PUT',
    });
    return response.data?.success || false;
  }

  // System Metrics
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    const response = await this.request<SystemMetrics>('/system/metrics');
    return response.data || null;
  }

  // Logs
  async getLogs(filters?: {
    level?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<LogEntry>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = `/logs${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<PaginatedResponse<LogEntry>>(endpoint);
    return response.data || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }

  // Alerts
  async getAlerts(filters?: {
    type?: string;
    isRead?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Alert>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const endpoint = `/alerts${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<PaginatedResponse<Alert>>(endpoint);
    return response.data || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  }

  async markAlertAsRead(alertId: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/alerts/${alertId}/read`, {
      method: 'PUT',
    });
    return response.data?.success || false;
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/alerts/${alertId}`, {
      method: 'DELETE',
    });
    return response.data?.success || false;
  }
}

// Instance singleton
export const mcpApi = new MCPApiService();
export default mcpApi;
