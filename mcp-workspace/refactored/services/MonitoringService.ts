// services/MonitoringService.ts - Service de monitoring temps réel

import { WebSocketServer, WebSocket } from 'ws';
import { MonitoringMetrics, MonitoringEvent, AgentState } from '../types/index.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { WorkflowRepository } from '../repositories/WorkflowRepository.js';

export class MonitoringService {
  private wsServer: WebSocketServer | null = null;
  private connectedClients = new Set<WebSocket>();
  private metrics: MonitoringMetrics;
  private startTime: Date = new Date();
  private agentStates = new Map<string, AgentState>();

  constructor(
    private taskRepository: TaskRepository,
    private workflowRepository: WorkflowRepository
  ) {
    this.metrics = this.initializeMetrics();
    this.initializeWebSocket();
    this.setupMetricsCollection();
  }

  private initializeWebSocket(): void {
    try {
      this.wsServer = new WebSocketServer({ port: 8080 });
      
      this.wsServer.on('connection', (ws: WebSocket) => {
        console.error('Dashboard client connected');
        this.connectedClients.add(ws);
        
        this.sendToClient(ws, {
          type: 'initial_state',
          timestamp: new Date().toISOString(),
          data: this.getCurrentState()
        });
        
        ws.on('message', (message) => {
          try {
            const request = JSON.parse(message.toString());
            this.handleWebSocketRequest(ws, request);
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        });
        
        ws.on('close', () => {
          this.connectedClients.delete(ws);
        });
      });
      
      console.error('Monitoring WebSocket server initialized on port 8080');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  private setupMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
      this.broadcastUpdate({
        type: 'metrics_update',
        data: this.metrics
      });
    }, 10000);
  }

  private initializeMetrics(): MonitoringMetrics {
    return {
      startTime: new Date().toISOString(),
      totalWorkflows: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      totalTasks: 0,
      completedTasks: 0,
      totalCost: 0,
      avgCostPerWorkflow: 0,
      agentUtilization: {
        designer: { activeTime: 0, idleTime: 0, taskCount: 0 },
        developer: { activeTime: 0, idleTime: 0, taskCount: 0 },
        qa: { activeTime: 0, idleTime: 0, taskCount: 0 }
      },
      bottlenecks: [],
      recommendations: [],
      costProjections: {
        daily: 0,
        monthly: 0,
        annual: 0
      },
      performance: {
        avgTaskDuration: 0,
        successRate: 0,
        errorRate: 0
      }
    };
  }

  getCurrentState(): any {
    const activeWorkflows = this.workflowRepository
      .findActive()
      .map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        currentStep: w.currentStep,
        totalSteps: w.steps.length,
        progress: Math.round((w.currentStep / w.steps.length) * 100),
        startTime: w.created,
        duration: this.calculateDuration(w.created),
        currentAgent: w.steps[w.currentStep]?.agent || 'unknown'
      }));
      
    const agentStates = Array.from(this.agentStates.entries()).map(([agent, state]) => ({
      agent,
      status: state.status || 'idle',
      lastActive: state.lastActive || 'never',
      currentTask: this.getCurrentTaskForAgent(agent)
    }));
    
    const pendingTasks = this.taskRepository
      .findPending()
      .map(t => ({
        id: t.id,
        title: t.title,
        agent: t.to,
        type: t.type,
        priority: t.priority || 'medium',
        workflowId: t.workflowId,
        created: t.created
      }));
      
    return {
      activeWorkflows,
      agentStates, 
      pendingTasks,
      metrics: this.metrics,
      systemInfo: {
        uptime: this.calculateDuration(this.startTime.toISOString()),
        connectedClients: this.connectedClients.size
      }
    };
  }

  private getCurrentTaskForAgent(agent: string): any {
    const currentTask = this.taskRepository
      .findByAgent(agent)
      .find(t => t.status === 'in_progress' || t.status === 'pending');
    
    if (currentTask) {
      return {
        id: currentTask.id,
        title: currentTask.title,
        type: currentTask.type,
        duration: this.calculateDuration(currentTask.created)
      };
    }
    return null;
  }

  private updateMetrics(): void {
    const taskStats = this.taskRepository.getStats();
    const workflowStats = this.workflowRepository.getStats();
    
    this.metrics.totalWorkflows = workflowStats.total;
    this.metrics.activeWorkflows = workflowStats.running;
    this.metrics.completedWorkflows = workflowStats.completed;
    this.metrics.failedWorkflows = workflowStats.failed;
    
    this.metrics.totalTasks = taskStats.total;
    this.metrics.completedTasks = taskStats.completed;
    
    this.metrics.performance.successRate = this.metrics.totalWorkflows > 0 
      ? Math.round((this.metrics.completedWorkflows / this.metrics.totalWorkflows) * 100)
      : 0;
      
    // Calcul des coûts
    const costPerTask = 0.05;
    const costPerWorkflow = 0.25;
    this.metrics.totalCost = (this.metrics.completedTasks * costPerTask) + 
                             (this.metrics.completedWorkflows * costPerWorkflow);
    this.metrics.avgCostPerWorkflow = this.metrics.completedWorkflows > 0
      ? this.metrics.totalCost / this.metrics.completedWorkflows
      : 0;
      
    // Projections
    const uptimeHours = (new Date().getTime() - this.startTime.getTime()) / (1000 * 60 * 60);
    const dailyRate = uptimeHours > 0 ? (this.metrics.totalCost / uptimeHours) * 24 : 0;
    this.metrics.costProjections.daily = dailyRate;
    this.metrics.costProjections.monthly = dailyRate * 30;
    this.metrics.costProjections.annual = dailyRate * 365;
    
    this.identifyBottlenecks();
    this.generateRecommendations();
  }

  private identifyBottlenecks(): void {
    const taskStats = this.taskRepository.getStats();
    this.metrics.bottlenecks = [];
    
    // Agent avec le plus de tâches en attente
    const agentTaskCounts = taskStats.byAgent;
    let maxPending = 0;
    let bottleneckAgent: string | null = null;
    
    Object.entries(agentTaskCounts).forEach(([agent, count]) => {
      if (count > maxPending) {
        maxPending = count;
        bottleneckAgent = agent;
      }
    });
    
    if (maxPending > 2) {
      this.metrics.bottlenecks.push(`Agent ${bottleneckAgent} a ${maxPending} tâches en attente`);
    }
    
    // Workflows bloqués
    const blockedWorkflows = this.workflowRepository.findActive().filter(w => {
      const startTime = new Date(w.created);
      const duration = (new Date().getTime() - startTime.getTime()) / (1000 * 60);
      return duration > 60;
    });
    
    if (blockedWorkflows.length > 0) {
      this.metrics.bottlenecks.push(`${blockedWorkflows.length} workflow(s) bloqué(s) depuis >1h`);
    }
  }

  private generateRecommendations(): void {
    this.metrics.recommendations = [];
    
    if (this.metrics.bottlenecks.length > 0) {
      this.metrics.recommendations.push('Goulots d\'étranglement détectés - considérer l\'ajout d\'agents ou parallélisation');
    }
    
    if (this.metrics.performance.successRate < 90) {
      this.metrics.recommendations.push('Taux de succès <90% - analyser les causes d\'échec');
    }
    
    if (this.metrics.costProjections.monthly > 50) {
      this.metrics.recommendations.push('Projection mensuelle >$50 - optimiser les workflows');
    }
    
    const idleAgents = Array.from(this.agentStates.entries())
      .filter(([, state]) => state.status === 'idle').length;
    
    if (idleAgents === this.agentStates.size && this.metrics.activeWorkflows > 0) {
      this.metrics.recommendations.push('Agents inactifs malgré workflows actifs - vérifier la distribution des tâches');
    }
  }

  broadcastUpdate(event: MonitoringEvent): void {
    if (this.connectedClients.size === 0) return;
    
    const message = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error broadcasting to client:', error);
          this.connectedClients.delete(client);
        }
      }
    });
  }

  private sendToClient(client: WebSocket, event: any): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error sending to client:', error);
      }
    }
  }

  private handleWebSocketRequest(client: WebSocket, request: any): void {
    switch (request.type) {
      case 'get_current_state':
        this.sendToClient(client, {
          type: 'current_state',
          data: this.getCurrentState()
        });
        break;
        
      case 'get_metrics':
        this.sendToClient(client, {
          type: 'metrics',
          data: this.metrics
        });
        break;
        
      case 'request_recommendations':
        this.generateRecommendations();
        this.sendToClient(client, {
          type: 'recommendations',
          data: this.metrics.recommendations
        });
        break;
    }
  }

  updateAgentState(agent: string, state: Partial<AgentState>): void {
    const currentState = this.agentStates.get(agent) || { status: 'idle', lastActive: '' };
    this.agentStates.set(agent, { ...currentState, ...state });
    
    this.broadcastUpdate({
      type: 'agent_status_changed',
      data: { agent, ...state }
    });
  }

  private calculateDuration(startTime: string): string {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }
}