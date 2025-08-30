// Extensions WebSocket pour le monitoring - À ajouter au serveur MCP existant
import { WebSocketServer } from 'ws';
import { execSync } from 'child_process';

class MonitoringExtension {
    constructor(mcpServer) {
        this.mcpServer = mcpServer;
        this.wsServer = null;
        this.connectedClients = new Set();
        this.metrics = this.initializeMetrics();
        this.startTime = new Date();
        
        this.setupWebSocketServer();
        this.setupMetricsCollection();
    }
    
    setupWebSocketServer() {
        try {
            this.wsServer = new WebSocketServer({ port: 8080 });
            console.error('WebSocket server started on port 8080');
            
            this.wsServer.on('connection', (ws, req) => {
                console.error('Dashboard client connected');
                this.connectedClients.add(ws);
                
                // Envoyer l'état initial
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
                    console.error('Dashboard client disconnected');
                    this.connectedClients.delete(ws);
                });
                
                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.connectedClients.delete(ws);
                });
            });
            
            this.wsServer.on('error', (error) => {
                console.error('WebSocket server error:', error);
            });
            
        } catch (error) {
            console.error('Failed to start WebSocket server:', error);
        }
    }
    
    setupMetricsCollection() {
        // Collecter les métriques toutes les 5 secondes
        setInterval(() => {
            this.updateMetrics();
            this.broadcastUpdate({
                type: 'metrics_update',
                data: this.metrics
            });
        }, 5000);
    }
    
    initializeMetrics() {
        return {
            startTime: new Date().toISOString(),
            totalWorkflows: 0,
            activeWorkflows: 0,
            completedWorkflows: 0,
            failedWorkflows: 0,
            totalTasks: 0,
            completedTasks: 0,
            avgWorkflowDuration: 0,
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
    
    getCurrentState() {
        const activeWorkflows = this.mcpServer.workflows
            .filter(w => w.status === 'running')
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
            
        const agentStates = Array.from(this.mcpServer.agentStates.entries()).map(([agent, state]) => ({
            agent,
            status: state.status || 'idle',
            lastActive: state.lastActive || 'never',
            currentTask: this.getCurrentTaskForAgent(agent)
        }));
        
        const pendingTasks = this.mcpServer.tasks
            .filter(t => t.status === 'pending')
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
                uptime: this.calculateDuration(this.startTime),
                connectedClients: this.connectedClients.size
            }
        };
    }
    
    getCurrentTaskForAgent(agent) {
        const currentTask = this.mcpServer.tasks.find(t => 
            t.to === agent && 
            (t.status === 'in_progress' || t.status === 'pending')
        );
        
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
    
    calculateDuration(startTime) {
        const start = new Date(startTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }
    
    updateMetrics() {
        const now = new Date();
        const workflows = this.mcpServer.workflows;
        const tasks = this.mcpServer.tasks;
        
        // Métriques de workflow
        this.metrics.totalWorkflows = workflows.length;
        this.metrics.activeWorkflows = workflows.filter(w => w.status === 'running').length;
        this.metrics.completedWorkflows = workflows.filter(w => w.status === 'completed').length;
        this.metrics.failedWorkflows = workflows.filter(w => w.status === 'failed').length;
        
        // Métriques de tâches
        this.metrics.totalTasks = tasks.length;
        this.metrics.completedTasks = tasks.filter(t => t.status === 'completed').length;
        
        // Calcul du taux de succès
        this.metrics.performance.successRate = this.metrics.totalWorkflows > 0 
            ? Math.round((this.metrics.completedWorkflows / this.metrics.totalWorkflows) * 100)
            : 0;
            
        // Simulation des coûts (à adapter selon votre modèle de coût)
        this.metrics.totalCost = this.metrics.completedTasks * 0.05; // 5 centimes par tâche
        this.metrics.avgCostPerWorkflow = this.metrics.completedWorkflows > 0
            ? this.metrics.totalCost / this.metrics.completedWorkflows
            : 0;
            
        // Projections de coût
        const dailyRate = this.metrics.totalCost / Math.max(1, (now - new Date(this.metrics.startTime)) / (1000 * 60 * 60 * 24));
        this.metrics.costProjections.daily = dailyRate;
        this.metrics.costProjections.monthly = dailyRate * 30;
        this.metrics.costProjections.annual = dailyRate * 365;
        
        // Identifier les goulots d'étranglement
        this.identifyBottlenecks();
        
        // Générer des recommandations
        this.generateRecommendations();
    }
    
    identifyBottlenecks() {
        const agentTaskCounts = {};
        const agentPendingCounts = {};
        
        this.mcpServer.tasks.forEach(task => {
            if (!agentTaskCounts[task.to]) agentTaskCounts[task.to] = 0;
            if (!agentPendingCounts[task.to]) agentPendingCounts[task.to] = 0;
            
            agentTaskCounts[task.to]++;
            if (task.status === 'pending') agentPendingCounts[task.to]++;
        });
        
        this.metrics.bottlenecks = [];
        
        // Identifier l'agent avec le plus de tâches en attente
        let maxPending = 0;
        let bottleneckAgent = null;
        
        Object.entries(agentPendingCounts).forEach(([agent, count]) => {
            if (count > maxPending) {
                maxPending = count;
                bottleneckAgent = agent;
            }
        });
        
        if (maxPending > 2) {
            this.metrics.bottlenecks.push(`Agent ${bottleneckAgent} a ${maxPending} tâches en attente`);
        }
    }
    
    generateRecommendations() {
        this.metrics.recommendations = [];
        
        // Recommandation basée sur les goulots d'étranglement
        if (this.metrics.bottlenecks.length > 0) {
            this.metrics.recommendations.push('Considérer l\'ajout d\'agents supplémentaires ou la parallélisation des tâches');
        }
        
        // Recommandation basée sur le taux de succès
        if (this.metrics.performance.successRate < 90) {
            this.metrics.recommendations.push('Taux de succès inférieur à 90% - analyser les causes d\'échec');
        }
        
        // Recommandation basée sur les coûts
        if (this.metrics.costProjections.monthly > 100) {
            this.metrics.recommendations.push('Coût mensuel projeté élevé - optimiser les workflows');
        }
    }
    
    broadcastUpdate(event) {
        if (this.connectedClients.size === 0) return;
        
        const message = JSON.stringify({
            ...event,
            timestamp: new Date().toISOString()
        });
        
        this.connectedClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                try {
                    client.send(message);
                } catch (error) {
                    console.error('Error sending to client:', error);
                    this.connectedClients.delete(client);
                }
            }
        });
    }
    
    sendToClient(client, event) {
        if (client.readyState === 1) {
            try {
                client.send(JSON.stringify({
                    ...event,
                    timestamp: new Date().toISOString()
                }));
            } catch (error) {
                console.error('Error sending to specific client:', error);
            }
        }
    }
    
    handleWebSocketRequest(client, request) {
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
                
            default:
                console.error('Unknown WebSocket request type:', request.type);
        }
    }
    
    // Méthodes à appeler depuis le serveur MCP principal
    onTaskStatusChanged(taskId, status, agent) {
        this.broadcastUpdate({
            type: 'task_status_changed',
            data: { taskId, status, agent }
        });
    }
    
    onWorkflowStarted(workflowId, workflowName, projectName) {
        this.broadcastUpdate({
            type: 'workflow_started', 
            data: { workflowId, workflowName, projectName }
        });
    }
    
    onWorkflowCompleted(workflowId) {
        this.broadcastUpdate({
            type: 'workflow_completed',
            data: { workflowId }
        });
    }
    
    onAgentStateChanged(agent, status) {
        this.broadcastUpdate({
            type: 'agent_status_changed',
            data: { agent, status }
        });
    }
}

module.exports = { MonitoringExtension };