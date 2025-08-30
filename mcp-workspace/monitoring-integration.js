// Extensions à ajouter au serveur MCP existant pour le monitoring

// 1. Ajouter WebSocket support
import { WebSocketServer } from 'ws';

class MultiAgentMCP {
  // Ajouter ces propriétés
  private wsServer: WebSocketServer;
  private connectedClients: Set<WebSocket> = new Set();
  private metrics: WorkflowMetrics = this.initializeMetrics();
  
  constructor() {
    // Code existant...
    
    // Nouveau : Setup WebSocket server pour dashboard
    this.setupWebSocketServer();
  }
  
  setupWebSocketServer() {
    this.wsServer = new WebSocketServer({ port: 8080 });
    
    this.wsServer.on('connection', (ws) => {
      this.connectedClients.add(ws);
      
      // Envoyer l'état initial au nouveau client
      this.sendToClient(ws, {
        type: 'initial_state',
        data: {
          activeWorkflows: this.workflows.filter(w => w.status === 'running'),
          agentStates: Array.from(this.agentStates.entries()),
          pendingTasks: this.tasks.filter(t => t.status === 'pending'),
          metrics: this.metrics
        }
      });
      
      ws.on('close', () => {
        this.connectedClients.delete(ws);
      });
    });
  }
  
  // Méthode pour broadcaster les mises à jour
  broadcastUpdate(event: any) {
    const message = JSON.stringify(event);
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, event);
      }
    });
  }
  
  sendToClient(client: WebSocket, event: any) {
    try {
      client.send(JSON.stringify(event));
    } catch (error) {
      console.error('Error sending to client:', error);
    }
  }
  
  // Modifier les méthodes existantes pour broadcaster les changements
  
  async updateTaskStatus(args) {
    const result = await super.updateTaskStatus(args);
    
    // Nouveau : Broadcaster la mise à jour
    this.broadcastUpdate({
      type: 'task_status_changed',
      timestamp: new Date().toISOString(),
      data: {
        taskId: args.taskId,
        status: args.status,
        agent: args.agent,
        workflowId: this.tasks.find(t => t.id === args.taskId)?.workflowId
      }
    });
    
    // Mettre à jour les métriques
    this.updateMetrics('task_status_change', args);
    
    return result;
  }
  
  async startWorkflow(args) {
    const result = await super.startWorkflow(args);
    
    // Nouveau : Broadcaster le nouveau workflow
    this.broadcastUpdate({
      type: 'workflow_started',
      timestamp: new Date().toISOString(),
      data: {
        workflowId: result.workflowId,
        name: args.workflowType,
        projectName: args.projectName
      }
    });
    
    return result;
  }
  
  // Méthodes de métriques
  initializeMetrics(): WorkflowMetrics {
    return {
      totalWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      averageDuration: 0,
      totalCost: 0,
      averageCostPerWorkflow: 0,
      agentUtilization: {
        designer: { activeTime: 0, totalTime: 0 },
        developer: { activeTime: 0, totalTime: 0 },
        qa: { activeTime: 0, totalTime: 0 }
      },
      bottlenecks: [],
      recommendations: []
    };
  }
  
  updateMetrics(eventType: string, data: any) {
    // Logique de mise à jour des métriques
    // Calculer les tendances, identifier les goulots d'étranglement, etc.
    
    // Broadcaster les métriques mises à jour
    this.broadcastUpdate({
      type: 'metrics_updated',
      timestamp: new Date().toISOString(),
      data: this.metrics
    });
  }
  
  // Nouveaux outils MCP pour le dashboard
  setupMonitoringTools() {
    return [
      {
        name: 'get_dashboard_state',
        description: 'Get current state for dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            includeHistory: { type: 'boolean', default: false }
          }
        }
      },
      {
        name: 'get_performance_metrics',
        description: 'Get performance metrics for dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d'] },
            agentFilter: { type: 'array' }
          }
        }
      },
      {
        name: 'get_cost_analysis',
        description: 'Get cost analysis and projections',
        inputSchema: {
          type: 'object',
          properties: {
            includeProjections: { type: 'boolean', default: true }
          }
        }
      }
    ];
  }
  
  // Handlers pour les nouveaux outils
  async getDashboardState(args) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          activeWorkflows: this.workflows.filter(w => w.status === 'running').map(w => ({
            id: w.id,
            name: w.name,
            currentStep: w.currentStep,
            totalSteps: w.steps.length,
            progress: Math.round((w.currentStep / w.steps.length) * 100),
            agents: this.getWorkflowAgents(w.id)
          })),
          agentStates: Array.from(this.agentStates.entries()).map(([agent, state]) => ({
            agent,
            status: state.status,
            lastActive: state.lastActive,
            currentTask: this.getCurrentTaskForAgent(agent)
          })),
          metrics: this.metrics
        }, null, 2)
      }]
    };
  }
  
  async getPerformanceMetrics(args) {
    // Calculer les métriques de performance sur la période demandée
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(this.calculatePerformanceMetrics(args.timeRange), null, 2)
      }]
    };
  }
  
  async getCostAnalysis(args) {
    // Calculer l'analyse des coûts
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(this.calculateCostAnalysis(), null, 2)
      }]
    };
  }
}

// Types pour les métriques
interface WorkflowMetrics {
  totalWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageDuration: number;
  totalCost: number;
  averageCostPerWorkflow: number;
  agentUtilization: {
    [key: string]: {
      activeTime: number;
      totalTime: number;
    }
  };
  bottlenecks: string[];
  recommendations: string[];
}

// Instructions de déploiement:
// 1. Ajouter ces extensions au index.js existant
// 2. Installer ws: npm install ws @types/ws
// 3. Démarrer le serveur MCP modifié
// 4. Modifier le dashboard pour se connecter à ws://localhost:8080
// 5. Le dashboard recevra les mises à jour en temps réel