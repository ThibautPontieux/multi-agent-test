// Extensions à ajouter à votre fichier TypeScript existant

// 1. NOUVEAUX IMPORTS (à ajouter en haut)
import { WebSocketServer, WebSocket } from 'ws';

// 2. NOUVELLES INTERFACES (à ajouter après vos interfaces existantes)
interface MonitoringMetrics {
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

interface MonitoringEvent {
    type: string;
    timestamp: string;
    data: any;
}

// 3. NOUVELLES PROPRIÉTÉS (à ajouter dans votre classe MultiAgentMCP)
class MultiAgentMCP {
    // Vos propriétés existantes...
    
    // NOUVELLES PROPRIÉTÉS MONITORING
    private wsServer: WebSocketServer | null = null;
    private connectedClients = new Set<WebSocket>();
    private metrics: MonitoringMetrics;
    private startTime: Date = new Date();
    
    constructor() {
        // Votre code existant...
        
        // AJOUTER À LA FIN DU CONSTRUCTOR
        this.metrics = this.initializeMetrics();
        this.initializeMonitoring();
    }
    
    // 4. NOUVELLES MÉTHODES (à ajouter dans votre classe)
    
    private initializeMonitoring(): void {
        try {
            this.setupWebSocketServer();
            this.setupMetricsCollection();
            console.error('Monitoring WebSocket server initialized on port 8080');
        } catch (error) {
            console.error('Failed to initialize monitoring:', error);
        }
    }
    
    private setupWebSocketServer(): void {
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
    
    private getCurrentState(): any {
        const activeWorkflows = this.workflows
            .filter(w => w.status === 'running')
            .map(w => ({
                id: w.id,
                name: w.name,
                currentStep: w.currentStep,
                totalSteps: w.steps.length,
                progress: Math.round((w.currentStep / w.steps.length) * 100),
                duration: this.calculateDuration(w.created)
            }));
            
        const agentStates = Array.from(this.agentStates.entries()).map(([agent, state]) => ({
            agent,
            status: state.status || 'idle',
            lastActive: state.lastActive || 'never'
        }));
        
        return {
            activeWorkflows,
            agentStates,
            metrics: this.metrics,
            systemInfo: {
                uptime: this.calculateDuration(this.startTime.toISOString()),
                connectedClients: this.connectedClients.size
            }
        };
    }
    
    private updateMetrics(): void {
        this.metrics.totalWorkflows = this.workflows.length;
        this.metrics.activeWorkflows = this.workflows.filter(w => w.status === 'running').length;
        this.metrics.completedWorkflows = this.workflows.filter(w => w.status === 'completed').length;
        this.metrics.totalTasks = this.tasks.length;
        this.metrics.completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        
        // Calcul coût (adaptez selon votre modèle)
        const costPerTask = 0.05;
        this.metrics.totalCost = this.metrics.completedTasks * costPerTask;
        
        // Projections
        const uptimeHours = (new Date().getTime() - this.startTime.getTime()) / (1000 * 60 * 60);
        const dailyRate = uptimeHours > 0 ? (this.metrics.totalCost / uptimeHours) * 24 : 0;
        this.metrics.costProjections.daily = dailyRate;
        this.metrics.costProjections.monthly = dailyRate * 30;
    }
    
    private broadcastUpdate(event: MonitoringEvent): void {
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
                    this.connectedClients.delete(client);
                }
            }
        });
    }
    
    private sendToClient(client: WebSocket, event: any): void {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(event));
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
        }
    }
    
    private calculateDuration(startTime: string): string {
        const diff = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}

// 5. MODIFICATIONS À VOS MÉTHODES EXISTANTES

// Dans votre méthode updateTaskStatus existante, AJOUTER :
async updateTaskStatus(args: any) {
    // Votre code existant...
    
    // AJOUTER CETTE LIGNE À LA FIN :
    this.broadcastUpdate({
        type: 'task_status_changed',
        data: { taskId: args.taskId, status: args.status, agent: args.agent }
    });
    
    // Votre return existant...
}

// Dans votre méthode startWorkflow existante, AJOUTER :
async startWorkflow(args: any) {
    // Votre code existant...
    
    // AVANT LE RETURN, AJOUTER :
    this.broadcastUpdate({
        type: 'workflow_started',
        data: { workflowId: workflow.id, workflowName: args.workflowType }
    });
    
    // Votre return existant...
}

export { MultiAgentMCP };