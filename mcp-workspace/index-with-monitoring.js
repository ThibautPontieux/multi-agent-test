import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { WebSocketServer } from 'ws';

class MultiAgentMCP {
    server;
    tasks = [];
    workflows = [];
    workspaceDir;
    conversationLog = [];
    agentStates = new Map();
    
    // Nouvelles propriétés pour monitoring
    wsServer = null;
    connectedClients = new Set();
    metrics = null;
    startTime = new Date();
    
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
    
    // Nouvelle méthode: Initialize monitoring WebSocket
    initializeMonitoring() {
        try {
            this.setupWebSocketServer();
            this.setupMetricsCollection();
            console.error('Monitoring WebSocket server initialized on port 8080');
        } catch (error) {
            console.error('Failed to initialize monitoring:', error);
        }
    }
    
    // Nouvelle méthode: Setup WebSocket server
    setupWebSocketServer() {
        this.wsServer = new WebSocketServer({ port: 8080 });
        
        this.wsServer.on('connection', (ws, req) => {
            console.error('Dashboard client connected');
            this.connectedClients.add(ws);
            
            // Envoyer l'état initial au nouveau client
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
    
    // Nouvelle méthode: Setup metrics collection
    setupMetricsCollection() {
        // Collecter les métriques toutes les 10 secondes
        setInterval(() => {
            this.updateMetrics();
            this.broadcastUpdate({
                type: 'metrics_update',
                data: this.metrics
            });
        }, 10000);
    }
    
    // Nouvelle méthode: Initialize metrics
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
    
    // Nouvelle méthode: Get current state for dashboard
    getCurrentState() {
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
                uptime: this.calculateDuration(this.startTime),
                connectedClients: this.connectedClients.size
            }
        };
    }
    
    // Nouvelle méthode: Get current task for agent
    getCurrentTaskForAgent(agent) {
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
    
    // Nouvelle méthode: Calculate duration
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
    
    // Nouvelle méthode: Update metrics
    updateMetrics() {
        const now = new Date();
        const workflows = this.workflows;
        const tasks = this.tasks;
        
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
            
        // Simulation des coûts (adapter selon votre modèle)
        const costPerTask = 0.05; // 5 centimes par tâche
        const costPerWorkflow = 0.25; // 25 centimes par workflow
        this.metrics.totalCost = (this.metrics.completedTasks * costPerTask) + 
                                 (this.metrics.completedWorkflows * costPerWorkflow);
        this.metrics.avgCostPerWorkflow = this.metrics.completedWorkflows > 0
            ? this.metrics.totalCost / this.metrics.completedWorkflows
            : 0;
            
        // Projections de coût
        const uptimeHours = (now - new Date(this.metrics.startTime)) / (1000 * 60 * 60);
        const dailyRate = uptimeHours > 0 ? (this.metrics.totalCost / uptimeHours) * 24 : 0;
        this.metrics.costProjections.daily = dailyRate;
        this.metrics.costProjections.monthly = dailyRate * 30;
        this.metrics.costProjections.annual = dailyRate * 365;
        
        // Identifier les goulots d'étranglement
        this.identifyBottlenecks();
        
        // Générer des recommandations
        this.generateRecommendations();
    }
    
    // Nouvelle méthode: Identify bottlenecks
    identifyBottlenecks() {
        const agentTaskCounts = {};
        const agentPendingCounts = {};
        
        this.tasks.forEach(task => {
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
        
        // Workflows bloqués
        const blockedWorkflows = this.workflows.filter(w => {
            if (w.status !== 'running') return false;
            const startTime = new Date(w.created);
            const duration = (new Date() - startTime) / (1000 * 60); // en minutes
            return duration > 60; // Bloqué si >1h
        });
        
        if (blockedWorkflows.length > 0) {
            this.metrics.bottlenecks.push(`${blockedWorkflows.length} workflow(s) bloqué(s) depuis >1h`);
        }
    }
    
    // Nouvelle méthode: Generate recommendations
    generateRecommendations() {
        this.metrics.recommendations = [];
        
        // Recommandation basée sur les goulots d'étranglement
        if (this.metrics.bottlenecks.length > 0) {
            this.metrics.recommendations.push('Goulots d\'étranglement détectés - considérer l\'ajout d\'agents ou parallélisation');
        }
        
        // Recommandation basée sur le taux de succès
        if (this.metrics.performance.successRate < 90) {
            this.metrics.recommendations.push('Taux de succès <90% - analyser les causes d\'échec');
        }
        
        // Recommandation basée sur les coûts
        if (this.metrics.costProjections.monthly > 50) {
            this.metrics.recommendations.push('Projection mensuelle >$50 - optimiser les workflows pour réduire les coûts');
        }
        
        // Recommandation sur l'utilisation des agents
        const idleAgents = Array.from(this.agentStates.entries())
            .filter(([agent, state]) => state.status === 'idle').length;
        
        if (idleAgents === this.agentStates.size && this.metrics.activeWorkflows > 0) {
            this.metrics.recommendations.push('Agents inactifs malgré workflows actifs - vérifier la distribution des tâches');
        }
    }
    
    // Nouvelle méthode: Broadcast update
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
                    console.error('Error broadcasting to client:', error);
                    this.connectedClients.delete(client);
                }
            }
        });
    }
    
    // Nouvelle méthode: Send to specific client
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
    
    // Nouvelle méthode: Handle WebSocket requests
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

    setupToolHandlers() {
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
                    // Git Operations (keeping all existing ones...)
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
                    {
                        name: 'git_clone',
                        description: 'Clone a repository from GitHub',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                url: { type: 'string', description: 'GitHub repository URL' },
                                agent: { type: 'string' },
                                projectName: { type: 'string', description: 'Local project name (optional)' }
                            },
                            required: ['url', 'agent']
                        }
                    },
                    {
                        name: 'git_create_branch',
                        description: 'Create and checkout a new branch',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                branchName: { type: 'string' },
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['branchName', 'agent']
                        }
                    },
                    {
                        name: 'git_push',
                        description: 'Push changes to remote repository',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                                branch: { type: 'string', description: 'Branch to push (optional, defaults to current)' }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'git_commit',
                        description: 'Commit changes with a message',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string' },
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['message', 'agent']
                        }
                    },
                    {
                        name: 'git_status',
                        description: 'Get git status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'git_pull',
                        description: 'Pull latest changes from remote repository',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                                branch: { type: 'string', description: 'Branch to pull (defaults to current)' }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'git_fetch',
                        description: 'Fetch remote changes without merging',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'git_checkout',
                        description: 'Switch to a different branch',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                branchName: { type: 'string' },
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['branchName', 'agent']
                        }
                    },
                    {
                        name: 'git_merge',
                        description: 'Merge another branch into current branch',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                sourceBranch: { type: 'string', description: 'Branch to merge from' },
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['sourceBranch', 'agent']
                        }
                    },
                    {
                        name: 'git_list_branches',
                        description: 'List all local and remote branches',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                                includeRemote: { type: 'boolean', description: 'Include remote branches', default: true }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'github_create_pr',
                        description: 'Create a pull request on GitHub',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                body: { type: 'string' },
                                head: { type: 'string', description: 'Source branch' },
                                base: { type: 'string', description: 'Target branch (usually main)' },
                                agent: { type: 'string' },
                                projectPath: { type: 'string', description: 'Path within workspace (optional)' }
                            },
                            required: ['title', 'body', 'head', 'base', 'agent']
                        }
                    },
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
                    {
                        name: 'get_workflows',
                        description: 'Get active workflows and their status',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'trigger_agent',
                        description: 'Trigger a specific agent to check for work (orchestrator only)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                targetAgent: { type: 'string', enum: ['designer', 'developer', 'qa'] },
                                message: { type: 'string' },
                                agent: { type: 'string' }
                            },
                            required: ['targetAgent', 'message', 'agent']
                        }
                    },
                    {
                        name: 'get_pending_agents',
                        description: 'Get agents that have pending work',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' }
                            },
                            required: ['agent']
                        }
                    },
                    {
                        name: 'execute_workflow_step',
                        description: 'Execute the next step in a workflow (orchestrator)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                workflowId: { type: 'string' },
                                agent: { type: 'string' }
                            },
                            required: ['workflowId', 'agent']
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
                    },
                    {
                        name: 'get_conversation_log',
                        description: 'Get recent conversation history',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                limit: { type: 'number', default: 10 }
                            }
                        }
                    }
                ],
            };
        });
    }

    setupRequestHandlers() {
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
                    case 'write_file':
                        return await this.writeFile(args);
                    case 'read_file':
                        return await this.readFile(args);
                    case 'git_init':
                        return await this.gitInit(args);
                    case 'git_clone':
                        return await this.gitClone(args);
                    case 'git_create_branch':
                        return await this.gitCreateBranch(args);
                    case 'git_push':
                        return await this.gitPush(args);
                    case 'git_pull':
                        return await this.gitPull(args);
                    case 'git_fetch':
                        return await this.gitFetch(args);
                    case 'git_checkout':
                        return await this.gitCheckout(args);
                    case 'git_merge':
                        return await this.gitMerge(args);
                    case 'git_list_branches':
                        return await this.gitListBranches(args);
                    case 'git_commit':
                        return await this.gitCommit(args);
                    case 'git_status':
                        return await this.gitStatus(args);
                    case 'github_create_pr':
                        return await this.createPullRequest(args);
                    case 'start_workflow':
                        return await this.startWorkflow(args);
                    case 'get_workflows':
                        return await this.getWorkflows(args);
                    case 'trigger_agent':
                        return await this.triggerAgent(args);
                    case 'get_pending_agents':
                        return await this.getPendingAgents(args);
                    case 'execute_workflow_step':
                        return await this.executeWorkflowStep(args);
                    case 'log_message':
                        return await this.logMessage(args);
                    case 'get_conversation_log':
                        return await this.getConversationLog(args);
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

    // Task Management Methods
    async createTask(args) {
        const task = {
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
        
        // Nouveau: Broadcast task creation
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

    async getMyTasks(args) {
        const myTasks = this.tasks.filter(task => task.to === args.agent && task.status !== 'completed').sort((a, b) => {
            // Prioritize workflow tasks and by priority level
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority || 'medium'];
            const bPriority = priorityOrder[b.priority || 'medium'];
            if (a.workflowId && !b.workflowId)
                return -1;
            if (!a.workflowId && b.workflowId)
                return 1;
            return bPriority - aPriority;
        });
        // Add workflow context to tasks
        const enrichedTasks = myTasks.map(task => {
            if (task.workflowId) {
                const workflow = this.workflows.find(w => w.id === task.workflowId);
                return {
                    ...task,
                    workflowInfo: workflow ? {
                        workflowName: workflow.name,
                        currentStep: workflow.currentStep + 1,
                        totalSteps: workflow.steps.length,
                        isAutoTriggered: task.data?.autoTriggered || false
                    } : null
                };
            }
            return task;
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        totalTasks: myTasks.length,
                        workflowTasks: myTasks.filter(t => t.workflowId).length,
                        manualTasks: myTasks.filter(t => !t.workflowId).length,
                        tasks: enrichedTasks
                    }, null, 2)
                }
            ]
        };
    }

    async updateTaskStatus(args) {
        const task = this.tasks.find(t => t.id === args.taskId);
        if (!task) {
            throw new Error(`Task ${args.taskId} not found`);
        }
        task.status = args.status;
        // Update agent state
        this.agentStates.set(args.agent, {
            status: args.status === 'completed' ? 'idle' : 'active',
            lastActive: new Date().toISOString()
        });
        
        // Nouveau: Broadcast task status change
        this.broadcastUpdate({
            type: 'task_status_changed',
            data: {
                taskId: args.taskId,
                status: args.status,
                agent: args.agent,
                workflowId: task.workflowId
            }
        });
        
        await this.logMessage({
            agent: args.agent,
            message: `Updated task "${task.title}" status to ${args.status}`
        });
        // Auto-progress workflow if task is completed and part of a workflow
        if (args.status === 'completed' && task.workflowId) {
            setTimeout(async () => {
                await this.executeWorkflowStep({
                    workflowId: task.workflowId,
                    agent: 'orchestrator'
                });
            }, 1000); // Small delay to ensure consistency
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

    // File Operations
    async writeFile(args) {
        const fullPath = join(this.workspaceDir, args.path);
        // Use path.dirname to properly get directory
        const { dirname } = await import('path');
        const dir = dirname(fullPath);
        // Only create directory if it's different from workspace root and doesn't exist
        if (dir !== this.workspaceDir && !existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, args.content);
        await this.logMessage({
            agent: args.agent,
            message: `Wrote file: ${args.path}`
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `File written successfully: ${args.path}`
                }
            ]
        };
    }

    async readFile(args) {
        const fullPath = join(this.workspaceDir, args.path);
        if (!existsSync(fullPath)) {
            throw new Error(`File not found: ${args.path}`);
        }
        const content = readFileSync(fullPath, 'utf-8');
        return {
            content: [
                {
                    type: 'text',
                    text: content
                }
            ]
        };
    }

    // Git Operations (toutes les méthodes existantes...)
    getProjectPath(args) {
        return args.projectPath ? join(this.workspaceDir, args.projectPath) : this.workspaceDir;
    }

    async gitInit(args) {
        try {
            const projectPath = this.getProjectPath(args);
            execSync('git init', { cwd: projectPath });
            execSync('git config user.name "Multi-Agent System"', { cwd: projectPath });
            execSync('git config user.email "agents@example.com"', { cwd: projectPath });
            await this.logMessage({
                agent: args.agent,
                message: 'Initialized git repository'
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Git repository initialized successfully'
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git init failed: ${error}`);
        }
    }

    async gitClone(args) {
        try {
            const projectName = args.projectName || args.url.split('/').pop()?.replace('.git', '') || 'cloned-repo';
            const targetPath = join(this.workspaceDir, projectName);
            execSync(`git clone ${args.url} ${projectName}`, { cwd: this.workspaceDir });
            await this.logMessage({
                agent: args.agent,
                message: `Cloned repository ${args.url} to ${projectName}`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Repository cloned successfully to ${projectName}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git clone failed: ${error}`);
        }
    }

    async gitCreateBranch(args) {
        try {
            const projectPath = this.getProjectPath(args);
            execSync(`git checkout -b ${args.branchName}`, { cwd: projectPath });
            await this.logMessage({
                agent: args.agent,
                message: `Created and checked out branch: ${args.branchName}`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Branch ${args.branchName} created and checked out`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git create branch failed: ${error}`);
        }
    }

    async gitPush(args) {
        try {
            const projectPath = this.getProjectPath(args);
            if (args.branch) {
                execSync(`git push origin ${args.branch}`, { cwd: projectPath });
            }
            else {
                execSync('git push', { cwd: projectPath });
            }
            await this.logMessage({
                agent: args.agent,
                message: `Pushed changes to remote repository`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Changes pushed to remote repository successfully'
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git push failed: ${error}`);
        }
    }

    async gitCommit(args) {
        try {
            const projectPath = this.getProjectPath(args);
            execSync('git add .', { cwd: projectPath });
            execSync(`git commit -m "${args.message}"`, { cwd: projectPath });
            await this.logMessage({
                agent: args.agent,
                message: `Committed changes: ${args.message}`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Changes committed: ${args.message}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git commit failed: ${error}`);
        }
    }

    async gitStatus(args) {
        try {
            const projectPath = this.getProjectPath(args);
            const status = execSync('git status --porcelain', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: status || 'Working directory clean'
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No git repository found'
                    }
                ]
            };
        }
    }

    async gitPull(args) {
        try {
            const projectPath = this.getProjectPath(args);
            // Check if there are uncommitted changes
            const status = execSync('git status --porcelain', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            if (status.trim()) {
                throw new Error('Cannot pull with uncommitted changes. Please commit or stash changes first.');
            }
            const pullResult = execSync('git pull', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            await this.logMessage({
                agent: args.agent,
                message: `Pulled latest changes from remote repository`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Pull completed:\n${pullResult}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git pull failed: ${error}`);
        }
    }

    async gitFetch(args) {
        try {
            const projectPath = this.getProjectPath(args);
            const fetchResult = execSync('git fetch --all', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            // Check what's new
            const behindStatus = execSync('git status -uno', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            await this.logMessage({
                agent: args.agent,
                message: `Fetched remote changes`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Fetch completed. Status:\n${behindStatus}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git fetch failed: ${error}`);
        }
    }

    async gitCheckout(args) {
        try {
            const projectPath = this.getProjectPath(args);
            // Check if branch exists locally
            const localBranches = execSync('git branch --list', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            const branchExists = localBranches.includes(args.branchName);
            if (!branchExists) {
                // Try to checkout from remote
                try {
                    execSync(`git checkout -b ${args.branchName} origin/${args.branchName}`, { cwd: projectPath });
                }
                catch {
                    // If remote doesn't exist either, just switch to existing branch
                    execSync(`git checkout ${args.branchName}`, { cwd: projectPath });
                }
            }
            else {
                execSync(`git checkout ${args.branchName}`, { cwd: projectPath });
            }
            await this.logMessage({
                agent: args.agent,
                message: `Switched to branch: ${args.branchName}`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Switched to branch: ${args.branchName}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git checkout failed: ${error}`);
        }
    }

    async gitMerge(args) {
        try {
            const projectPath = this.getProjectPath(args);
            // Check for merge conflicts
            try {
                const mergeResult = execSync(`git merge ${args.sourceBranch}`, {
                    cwd: projectPath,
                    encoding: 'utf-8'
                });
                await this.logMessage({
                    agent: args.agent,
                    message: `Merged ${args.sourceBranch} into current branch`
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Merge completed:\n${mergeResult}`
                        }
                    ]
                };
            }
            catch (error) {
                // Check if it's a merge conflict
                const conflictFiles = execSync('git diff --name-only --diff-filter=U', {
                    cwd: projectPath,
                    encoding: 'utf-8'
                }).trim();
                if (conflictFiles) {
                    throw new Error(`Merge conflict detected in files: ${conflictFiles}\nPlease resolve conflicts manually and commit.`);
                }
                else {
                    throw error;
                }
            }
        }
        catch (error) {
            throw new Error(`Git merge failed: ${error}`);
        }
    }

    async gitListBranches(args) {
        try {
            const projectPath = this.getProjectPath(args);
            const localBranches = execSync('git branch', {
                cwd: projectPath,
                encoding: 'utf-8'
            });
            let remoteBranches = '';
            if (args.includeRemote !== false) {
                try {
                    remoteBranches = execSync('git branch -r', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    });
                }
                catch {
                    // Remote might not be configured
                    remoteBranches = 'No remote branches found';
                }
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Local branches:\n${localBranches}\n${args.includeRemote !== false ? `\nRemote branches:\n${remoteBranches}` : ''}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Git list branches failed: ${error}`);
        }
    }

    // GitHub Operations
    async createPullRequest(args) {
        try {
            const projectPath = this.getProjectPath(args);
            // Get repository info from git remote
            const remoteUrl = execSync('git config --get remote.origin.url', {
                cwd: projectPath,
                encoding: 'utf-8'
            }).trim();
            // Parse GitHub repo info from URL
            const repoMatch = remoteUrl.match(/github\.com[\/:](.+?)\/(.+?)(?:\.git)?$/);
            if (!repoMatch) {
                throw new Error('Not a GitHub repository or remote not found');
            }
            const [, owner, repo] = repoMatch;
            // Create PR using GitHub CLI (if available) or direct API call
            const ghToken = process.env.GITHUB_TOKEN;
            if (!ghToken) {
                throw new Error('GITHUB_TOKEN environment variable not set. Please set it in your MCP config.');
            }
            const prData = {
                title: args.title,
                body: args.body,
                head: args.head,
                base: args.base
            };
            // Use GitHub API to create PR
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${ghToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prData)
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`GitHub API error: ${response.status} - ${error}`);
            }
            const pullRequest = await response.json();
            await this.logMessage({
                agent: args.agent,
                message: `Created pull request: ${args.title} (#${pullRequest.number})`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Pull request created successfully!\nTitle: ${args.title}\nNumber: #${pullRequest.number}\nURL: ${pullRequest.html_url}`
                    }
                ]
            };
        }
        catch (error) {
            throw new Error(`Create PR failed: ${error}`);
        }
    }

    // Orchestration Methods
    getWorkflowTemplate(workflowType) {
        const templates = {
            'development-cycle': [
                {
                    id: 'sync-main-branch',
                    agent: 'developer',
                    action: 'sync_with_remote',
                    description: 'Sync local main branch with remote to get latest changes',
                    autoTrigger: false,
                    template: { type: 'code', sync_before_start: true }
                },
                {
                    id: 'design-requirements',
                    agent: 'designer',
                    action: 'create_requirements',
                    description: 'Define project requirements and user stories',
                    dependencies: ['sync-main-branch'],
                    autoTrigger: true,
                    template: { type: 'requirement', priority: 'high' }
                },
                {
                    id: 'implement-features',
                    agent: 'developer',
                    action: 'implement_code',
                    description: 'Implement features based on design requirements',
                    dependencies: ['design-requirements'],
                    autoTrigger: true,
                    template: { type: 'code', create_branch: true, sync_main_before_branch: true }
                },
                {
                    id: 'quality-review',
                    agent: 'qa',
                    action: 'review_implementation',
                    description: 'Review code quality, functionality, and user experience',
                    dependencies: ['implement-features'],
                    autoTrigger: true,
                    template: { type: 'review', run_tests: true }
                },
                {
                    id: 'create-pr',
                    agent: 'developer',
                    action: 'create_pull_request',
                    description: 'Sync with main and create pull request after QA approval',
                    dependencies: ['quality-review'],
                    autoTrigger: true,
                    template: { type: 'code', action: 'pr', sync_before_pr: true }
                }
            ],
            'feature-request': [
                {
                    id: 'sync-before-feature',
                    agent: 'developer',
                    action: 'sync_with_remote',
                    description: 'Sync with remote main branch before feature development',
                    autoTrigger: false,
                    template: { type: 'code', sync_before_start: true }
                },
                {
                    id: 'analyze-feature',
                    agent: 'designer',
                    action: 'analyze_feature_request',
                    description: 'Analyze feature requirements and create specifications',
                    dependencies: ['sync-before-feature'],
                    autoTrigger: true,
                    template: { type: 'requirement' }
                },
                {
                    id: 'implement-feature',
                    agent: 'developer',
                    action: 'implement_feature',
                    description: 'Implement the requested feature',
                    dependencies: ['analyze-feature'],
                    autoTrigger: true,
                    template: { type: 'code', create_branch: true, sync_main_before_branch: true }
                },
                {
                    id: 'test-feature',
                    agent: 'qa',
                    action: 'test_feature',
                    description: 'Test the new feature thoroughly',
                    dependencies: ['implement-feature'],
                    autoTrigger: true,
                    template: { type: 'review' }
                }
            ],
            'bug-fix': [
                {
                    id: 'sync-for-bugfix',
                    agent: 'developer',
                    action: 'sync_with_remote',
                    description: 'Sync with latest main branch to ensure bug still exists',
                    autoTrigger: false,
                    template: { type: 'code', sync_before_start: true }
                },
                {
                    id: 'reproduce-bug',
                    agent: 'qa',
                    action: 'reproduce_and_document',
                    description: 'Reproduce the bug and document steps',
                    dependencies: ['sync-for-bugfix'],
                    autoTrigger: true,
                    template: { type: 'requirement', priority: 'high' }
                },
                {
                    id: 'fix-bug',
                    agent: 'developer',
                    action: 'implement_fix',
                    description: 'Fix the identified bug',
                    dependencies: ['reproduce-bug'],
                    autoTrigger: true,
                    template: { type: 'code', create_branch: true, branch_prefix: 'bugfix/', sync_main_before_branch: true }
                },
                {
                    id: 'verify-fix',
                    agent: 'qa',
                    action: 'verify_bug_fix',
                    description: 'Verify the bug is fixed and no regressions',
                    dependencies: ['fix-bug'],
                    autoTrigger: true,
                    template: { type: 'review', regression_test: true }
                }
            ]
        };
        return templates[workflowType] || [];
    }

    async startWorkflow(args) {
        const workflow = {
            id: Date.now().toString(),
            name: args.workflowType,
            description: args.description || `Automated ${args.workflowType} workflow for ${args.projectName}`,
            steps: this.getWorkflowTemplate(args.workflowType),
            status: 'running',
            currentStep: 0,
            created: new Date().toISOString()
        };
        if (workflow.steps.length === 0) {
            throw new Error(`Unknown workflow type: ${args.workflowType}`);
        }
        this.workflows.push(workflow);
        // Create initial task for first step
        const firstStep = workflow.steps[0];
        const initialTask = {
            id: `${workflow.id}-step-0`,
            from: 'orchestrator',
            to: firstStep.agent,
            type: firstStep.template?.type || 'requirement',
            title: `${args.projectName}: ${firstStep.description}`,
            description: `Workflow: ${workflow.name}\nStep: ${firstStep.description}\nProject: ${args.projectName}`,
            data: {
                workflowId: workflow.id,
                stepId: firstStep.id,
                projectName: args.projectName,
                ...firstStep.template
            },
            status: 'pending',
            created: new Date().toISOString(),
            workflowId: workflow.id,
            priority: firstStep.template?.priority || 'medium'
        };
        this.tasks.push(initialTask);
        
        // Nouveau: Broadcast workflow start
        this.broadcastUpdate({
            type: 'workflow_started',
            data: {
                workflowId: workflow.id,
                workflowName: workflow.name,
                projectName: args.projectName,
                totalSteps: workflow.steps.length
            }
        });
        
        await this.logMessage({
            agent: args.agent,
            message: `Started workflow "${workflow.name}" for project "${args.projectName}"`
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Workflow started successfully!\nID: ${workflow.id}\nName: ${workflow.name}\nFirst task assigned to: ${firstStep.agent}\n\nWorkflow Steps:\n${workflow.steps.map((step, i) => `${i + 1}. ${step.agent}: ${step.description}`).join('\n')}`
                }
            ],
            workflowId: workflow.id
        };
    }

    async getWorkflows(args) {
        const activeWorkflows = this.workflows.filter(w => w.status === 'running');
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        active: activeWorkflows.length,
                        workflows: activeWorkflows.map(w => ({
                            id: w.id,
                            name: w.name,
                            currentStep: w.currentStep + 1,
                            totalSteps: w.steps.length,
                            currentAgent: w.steps[w.currentStep]?.agent,
                            status: w.status
                        }))
                    }, null, 2)
                }
            ]
        };
    }

    async triggerAgent(args) {
        // Create a notification task for the target agent
        const triggerTask = {
            id: Date.now().toString(),
            from: 'orchestrator',
            to: args.targetAgent,
            type: 'workflow_trigger',
            title: `Agent Activation`,
            description: args.message,
            data: { trigger: true, from_orchestrator: true },
            status: 'pending',
            created: new Date().toISOString()
        };
        this.tasks.push(triggerTask);
        this.agentStates.set(args.targetAgent, {
            status: 'notified',
            lastActive: new Date().toISOString()
        });
        await this.logMessage({
            agent: args.agent,
            message: `Triggered agent ${args.targetAgent}: ${args.message}`
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Agent ${args.targetAgent} has been notified and triggered`
                }
            ]
        };
    }

    async getPendingAgents(args) {
        const pendingWork = new Map();
        this.tasks
            .filter(task => task.status === 'pending')
            .forEach(task => {
            const current = pendingWork.get(task.to) || 0;
            pendingWork.set(task.to, current + 1);
        });
        const agentWorkload = Array.from(pendingWork.entries()).map(([agent, count]) => ({
            agent,
            pendingTasks: count,
            lastActive: this.agentStates.get(agent)?.lastActive || 'never',
            status: this.agentStates.get(agent)?.status || 'idle'
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        totalPendingTasks: Array.from(pendingWork.values()).reduce((a, b) => a + b, 0),
                        agentWorkload
                    }, null, 2)
                }
            ]
        };
    }

    async executeWorkflowStep(args) {
        const workflow = this.workflows.find(w => w.id === args.workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${args.workflowId} not found`);
        }
        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep) {
            workflow.status = 'completed';
            
            // Nouveau: Broadcast workflow completion
            this.broadcastUpdate({
                type: 'workflow_completed',
                data: {
                    workflowId: workflow.id,
                    workflowName: workflow.name
                }
            });
            
            await this.logMessage({
                agent: args.agent,
                message: `Workflow "${workflow.name}" completed successfully`
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Workflow "${workflow.name}" has been completed!`
                    }
                ]
            };
        }
        // Check if current step is completed
        const stepTasks = this.tasks.filter(t => t.workflowId === workflow.id &&
            t.data?.stepId === currentStep.id);
        const isStepCompleted = stepTasks.some(t => t.status === 'completed');
        if (isStepCompleted) {
            // Move to next step
            workflow.currentStep++;
            const nextStep = workflow.steps[workflow.currentStep];
            if (nextStep) {
                // Create task for next step if auto-trigger is enabled
                if (nextStep.autoTrigger) {
                    const nextTask = {
                        id: `${workflow.id}-step-${workflow.currentStep}`,
                        from: 'orchestrator',
                        to: nextStep.agent,
                        type: nextStep.template?.type || 'requirement',
                        title: `Auto-triggered: ${nextStep.description}`,
                        description: `Workflow step auto-triggered\nPrevious step completed by: ${currentStep.agent}\nNext action: ${nextStep.description}`,
                        data: {
                            workflowId: workflow.id,
                            stepId: nextStep.id,
                            autoTriggered: true,
                            ...nextStep.template
                        },
                        status: 'pending',
                        created: new Date().toISOString(),
                        workflowId: workflow.id
                    };
                    this.tasks.push(nextTask);
                    
                    // Nouveau: Broadcast workflow progression
                    this.broadcastUpdate({
                        type: 'workflow_step_progressed',
                        data: {
                            workflowId: workflow.id,
                            currentStep: workflow.currentStep + 1,
                            totalSteps: workflow.steps.length,
                            nextAgent: nextStep.agent
                        }
                    });
                    
                    await this.logMessage({
                        agent: args.agent,
                        message: `Auto-triggered next step: ${nextStep.agent} - ${nextStep.description}`
                    });
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Workflow progressed to step ${workflow.currentStep + 1}/${workflow.steps.length}\nNext: ${nextStep.agent} - ${nextStep.description}\n${nextStep.autoTrigger ? 'Task auto-assigned' : 'Manual trigger required'}`
                        }
                    ]
                };
            }
        }
        else {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Current step "${currentStep.description}" is still pending completion by ${currentStep.agent}`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: 'Workflow step execution completed'
                }
            ]
        };
    }

    // Communication
    async logMessage(args) {
        const logEntry = {
            agent: args.agent,
            message: args.message,
            timestamp: new Date().toISOString()
        };
        this.conversationLog.push(logEntry);
        // Keep only last 100 messages
        if (this.conversationLog.length > 100) {
            this.conversationLog = this.conversationLog.slice(-100);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: 'Message logged'
                }
            ]
        };
    }

    async getConversationLog(args) {
        const limit = args?.limit || 10;
        const recentLogs = this.conversationLog.slice(-limit);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(recentLogs, null, 2)
                }
            ]
        };
    }

    async run() {
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

// Handle graceful WebSocket shutdown
process.on('SIGINT', () => {
    console.error('Received SIGINT, closing WebSocket server...');
    if (server.wsServer) {
        server.wsServer.close(() => {
            console.error('WebSocket server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});