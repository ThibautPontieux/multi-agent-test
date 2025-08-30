import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { WebSocketServer, WebSocket } from 'ws';

interface Task {
    id: string;
    from: string;
    to: string;
    type: string;
    title: string;
    description: string;
    data?: any;
    status: 'pending' | 'in_progress' | 'completed';
    created: string;
    workflowId?: string;
    priority?: 'low' | 'medium' | 'high';
}

interface Workflow {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    status: 'running' | 'completed' | 'failed';
    currentStep: number;
    created: string;
}

interface WorkflowStep {
    id: string;
    agent: string;
    action: string;
    description: string;
    dependencies?: string[];
    autoTrigger: boolean;
    template: any;
}

interface AgentState {
    status: 'idle' | 'active' | 'notified';
    lastActive: string;
}

interface MonitoringMetrics {
    startTime: string;
    totalWorkflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    totalTasks: number;
    completedTasks: number;
    avgWorkflowDuration: number;
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

interface LogEntry {
    agent: string;
    message: string;
    timestamp: string;
}

class MultiAgentMCP {
    private server: Server;
    private tasks: Task[] = [];
    private workflows: Workflow[] = [];
    private workspaceDir: string;
    private conversationLog: LogEntry[] = [];
    private agentStates = new Map<string, AgentState>();
    
    // Monitoring properties
    private wsServer: WebSocketServer | null = null;
    private connectedClients = new Set<WebSocket>();
    private metrics: MonitoringMetrics;
    private startTime: Date = new Date();
    
    constructor() {
        this.server = new Server({
            name: 'multi-agent-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        
        this.workspaceDir = process.env.WORKSPACE_DIR || 'E:\\ProjetsDev\\MultiAgentWorkspace';
        console.error('Workspace directory:', this.workspaceDir);
        
        if (!existsSync(this.workspaceDir)) {
            mkdirSync(this.workspaceDir, { recursive: true });
        }
        
        this.metrics = this.initializeMetrics();
        this.setupToolHandlers();
        this.setupRequestHandlers();
        this.initializeMonitoring();
    }
    
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
        
        this.wsServer.on('connection', (ws: WebSocket, req) => {
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
                console.error('Dashboard client disconnected');
                this.connectedClients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket client error:', error);
                this.connectedClients.delete(ws);
            });
        });
        
        this.wsServer.on('error', (error) => {
            console.error('WebSocket server error:', error);
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
    
    private getCurrentState(): any {
        const activeWorkflows = this.workflows
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
            
        const agentStates = Array.from(this.agentStates.entries()).map(([agent, state]) => ({
            agent,
            status: state.status || 'idle',
            lastActive: state.lastActive || 'never',
            currentTask: this.getCurrentTaskForAgent(agent)
        }));
        
        const pendingTasks = this.tasks
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
                uptime: this.calculateDuration(this.startTime.toISOString()),
                connectedClients: this.connectedClients.size
            }
        };
    }
    
    private getCurrentTaskForAgent(agent: string): any {
        const currentTask = this.tasks.find(t => 
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
    
    private updateMetrics(): void {
        const now = new Date();
        const workflows = this.workflows;
        const tasks = this.tasks;
        
        this.metrics.totalWorkflows = workflows.length;
        this.metrics.activeWorkflows = workflows.filter(w => w.status === 'running').length;
        this.metrics.completedWorkflows = workflows.filter(w => w.status === 'completed').length;
        this.metrics.failedWorkflows = workflows.filter(w => w.status === 'failed').length;
        
        this.metrics.totalTasks = tasks.length;
        this.metrics.completedTasks = tasks.filter(t => t.status === 'completed').length;
        
        this.metrics.performance.successRate = this.metrics.totalWorkflows > 0 
            ? Math.round((this.metrics.completedWorkflows / this.metrics.totalWorkflows) * 100)
            : 0;
            
        const costPerTask = 0.05;
        const costPerWorkflow = 0.25;
        this.metrics.totalCost = (this.metrics.completedTasks * costPerTask) + 
                                 (this.metrics.completedWorkflows * costPerWorkflow);
        this.metrics.avgCostPerWorkflow = this.metrics.completedWorkflows > 0
            ? this.metrics.totalCost / this.metrics.completedWorkflows
            : 0;
            
        const uptimeHours = (now.getTime() - new Date(this.metrics.startTime).getTime()) / (1000 * 60 * 60);
        const dailyRate = uptimeHours > 0 ? (this.metrics.totalCost / uptimeHours) * 24 : 0;
        this.metrics.costProjections.daily = dailyRate;
        this.metrics.costProjections.monthly = dailyRate * 30;
        this.metrics.costProjections.annual = dailyRate * 365;
        
        this.identifyBottlenecks();
        this.generateRecommendations();
    }
    
    private identifyBottlenecks(): void {
        const agentPendingCounts: Record<string, number> = {};
        
        this.tasks.forEach(task => {
            if (!agentPendingCounts[task.to]) agentPendingCounts[task.to] = 0;
            if (task.status === 'pending') agentPendingCounts[task.to]++;
        });
        
        this.metrics.bottlenecks = [];
        
        let maxPending = 0;
        let bottleneckAgent: string | null = null;
        
        Object.entries(agentPendingCounts).forEach(([agent, count]) => {
            if (count > maxPending) {
                maxPending = count;
                bottleneckAgent = agent;
            }
        });
        
        if (maxPending > 2) {
            this.metrics.bottlenecks.push(`Agent ${bottleneckAgent} a ${maxPending} tâches en attente`);
        }
        
        const blockedWorkflows = this.workflows.filter(w => {
            if (w.status !== 'running') return false;
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
            this.metrics.recommendations.push('Projection mensuelle >$50 - optimiser les workflows pour réduire les coûts');
        }
        
        const idleAgents = Array.from(this.agentStates.entries())
            .filter(([agent, state]) => state.status === 'idle').length;
        
        if (idleAgents === this.agentStates.size && this.metrics.activeWorkflows > 0) {
            this.metrics.recommendations.push('Agents inactifs malgré workflows actifs - vérifier la distribution des tâches');
        }
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
                console.error('Error sending to specific client:', error);
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
                
            default:
                console.error('Unknown WebSocket request type:', request.type);
        }
    }

    setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    // Task Management
                    {
                        name: 'create_task',
                        description: 'Create a new task for another agent',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                to: { type: 'string', enum: ['designer', 'developer', 'qa'] },
                                from: { type: 'string', enum: ['designer', 'developer', 'qa'] },
                                type: { type: 'string', enum: ['requirement', 'code', 'review', 'feedback'] },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                data: { type: 'object' }
                            },
                            required: ['to', 'from', 'type', 'title', 'description']
                        }
                    },
                    {
                        name: 'get_my_tasks',
                        description: 'Get tasks assigned to me',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string', enum: ['designer', 'developer', 'qa'] }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'update_task_status',
                        description: 'Update task status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                taskId: { type: 'string' },
                                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                                agent: { type: 'string' }
                            },
                            required: ['taskId', 'status', 'agent']
                        }
                    },
                    // File Operations
                    {
                        name: 'write_file',
                        description: 'Write content to a file in the workspace',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' },
                                content: { type: 'string' },
                                agent: { type: 'string' }
                            },
                            required: ['path', 'content', 'agent']
                        }
                    },
                    {
                        name: 'read_file',
                        description: 'Read file content from workspace',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' }
                            },
                            required: ['path']
                        }
                    },
                    // Git Operations (keeping essential ones, truncated for brevity)
                    {
                        name: 'git_init',
                        description: 'Initialize git repository in workspace',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' }
                            },
                            required: ['agent']
                        }
                    },
                    // ... (autres outils git - même implémentation qu'avant)
                    
                    // Orchestration Tools
                    {
                        name: 'start_workflow',
                        description: 'Start a predefined workflow (development, bug-fix, feature)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workflowType: { type: 'string', enum: ['development-cycle', 'bug-fix', 'feature-request', 'code-review'] },
                                projectName: { type: 'string' },
                                description: { type: 'string' },
                                agent: { type: 'string' }
                            },
                            required: ['workflowType', 'projectName', 'agent']
                        }
                    },
                    // Communication
                    {
                        name: 'log_message',
                        description: 'Log a message to the conversation log',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                message: { type: 'string' }
                            },
                            required: ['agent', 'message']
                        }
                    }
                    // ... (autres outils - même structure qu'avant)
                ],
            };
        });
    }

    setupRequestHandlers(): void {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'create_task':
                        return await this.createTask(args);
                    case 'get_my_tasks':
                        return await this.getMyTasks(args);
                    case 'update_task_status':
                        return await this.updateTaskStatus(args);
                    // ... (autres handlers)
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`
                        }
                    ]
                };
            }
        });
    }

    // Task Management Methods avec monitoring intégré
    async createTask(args: any) {
        const task: Task = {
            id: Date.now().toString(),
            from: args.from,
            to: args.to,
            type: args.type,
            title: args.title,
            description: args.description,
            data: args.data,
            status: 'pending',
            created: new Date().toISOString()
        };
        this.tasks.push(task);
        
        this.broadcastUpdate({
            type: 'task_created',
            data: {
                taskId: task.id,
                agent: task.to,
                title: task.title,
                workflowId: task.workflowId
            }
        });
        
        await this.logMessage({
            agent: args.from,
            message: `Created task "${task.title}" for ${task.to}`
        });
        
        return {
            content: [
                {
                    type: 'text',
                    text: `Task created successfully. ID: ${task.id}`
                }
            ]
        };
    }

    async updateTaskStatus(args: any) {
        const task = this.tasks.find(t => t.id === args.taskId);
        if (!task) {
            throw new Error(`Task ${args.taskId} not found`);
        }
        task.status = args.status;
        
        this.agentStates.set(args.agent, {
            status: args.status === 'completed' ? 'idle' : 'active',
            lastActive: new Date().toISOString()
        });
        
        this.broadcastUpdate({
            type: 'task_status_changed',
            data: {
                taskId: args.taskId,
                status: args.status,
                agent: args.agent,
                workflowId: task.workflowId
            }
        });
        
        if (args.status === 'completed' && task.workflowId) {
            setTimeout(async () => {
                await this.executeWorkflowStep({
                    workflowId: task.workflowId,
                    agent: 'orchestrator'
                });
            }, 1000);
        }
        
        return {
            content: [
                {
                    type: 'text',
                    text: `Task ${args.taskId} status updated to ${args.status}${task.workflowId ? ' (workflow will auto-progress)' : ''}`
                }
            ]
        };
    }

    // ... (autres méthodes - même implémentation qu'avant mais avec types TypeScript appropriés)

    async run(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Multi-Agent MCP server with monitoring running on stdio');
        console.error('WebSocket monitoring available on port 8080');
    }
}

console.error('Starting Multi-Agent MCP server with integrated monitoring...');
const server = new MultiAgentMCP();
server.run().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.error('Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.error('Received SIGINT, closing WebSocket server...');
    process.exit(0);
});