// index.ts - Classe principale refactorisée avec architecture modulaire

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync } from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

// Repositories
import { TaskRepository } from './repositories/TaskRepository.js';
import { WorkflowRepository } from './repositories/WorkflowRepository.js';

// Services
import { TaskService } from './services/TaskService.js';
import { WorkflowService } from './services/WorkflowService.js';
import { LogService } from './services/LogService.js';
import { MonitoringService } from './services/MonitoringService.js';

// Handlers
import { TaskHandlers } from './handlers/TaskHandlers.js';
import { WorkflowHandlers } from './handlers/TaskHandlers.js';
import { FileHandlers } from './handlers/GitHandlers.js';
import { GitHandlers } from './handlers/GitHandlers.js';

// Configuration des outils MCP
import { ToolDefinitions } from './config/ToolDefinitions.js';

class MultiAgentMCP {
  private server: Server;
  private workspaceDir: string;

  // Repositories - Couche de données
  private taskRepository: TaskRepository;
  private workflowRepository: WorkflowRepository;

  // Services - Logique métier
  private taskService: TaskService;
  private workflowService: WorkflowService;
  private logService: LogService;
  private monitoringService: MonitoringService;

  // Handlers - Interface MCP
  private taskHandlers: TaskHandlers;
  private workflowHandlers: WorkflowHandlers;
  private fileHandlers: FileHandlers;
  private gitHandlers: GitHandlers;

  constructor() {
    this.server = new Server(
      {
        name: 'multi-agent-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.workspaceDir = process.env.WORKSPACE_DIR || 'E:\\ProjetsDev\\MultiAgentWorkspace';
    
    this.initializeWorkspace();
    this.initializeDependencies();
    this.setupMCPHandlers();
  }

  private initializeWorkspace(): void {
    console.error('Workspace directory:', this.workspaceDir);
    
    if (!existsSync(this.workspaceDir)) {
      mkdirSync(this.workspaceDir, { recursive: true });
    }
  }

  private initializeDependencies(): void {
    // Repositories
    this.taskRepository = new TaskRepository();
    this.workflowRepository = new WorkflowRepository();

    // Services
    this.logService = new LogService();
    this.monitoringService = new MonitoringService(this.taskRepository, this.workflowRepository);
    this.taskService = new TaskService(this.taskRepository, this.logService, this.monitoringService);
    this.workflowService = new WorkflowService(
      this.workflowRepository, 
      this.taskRepository, 
      this.logService, 
      this.monitoringService
    );

    // Handlers
    this.taskHandlers = new TaskHandlers(this.taskService, this.workflowService);
    this.workflowHandlers = new WorkflowHandlers(this.workflowService);
    this.fileHandlers = new FileHandlers(this.workspaceDir, this.logService);
    this.gitHandlers = new GitHandlers(this.workspaceDir, this.logService);
  }

  private setupMCPHandlers(): void {
    // Configuration des outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ToolDefinitions.getAllTools()
      };
    });

    // Router principal pour les appels d'outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return await this.routeToolCall(name, args);
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    });
  }

  private async routeToolCall(toolName: string, args: any) {
    // Task Management
    switch (toolName) {
      case 'create_task':
        return await this.taskHandlers.handleCreateTask(args);
      case 'get_my_tasks':
        return await this.taskHandlers.handleGetMyTasks(args);
      case 'update_task_status':
        return await this.taskHandlers.handleUpdateTaskStatus(args);

      // Workflow Management
      case 'start_workflow':
        return await this.workflowHandlers.handleStartWorkflow(args);
      case 'get_workflows':
        return await this.workflowHandlers.handleGetWorkflows(args);
      case 'execute_workflow_step':
        return await this.workflowHandlers.handleExecuteWorkflowStep(args);
      case 'trigger_agent':
        return await this.workflowHandlers.handleTriggerAgent(args);
      case 'get_pending_agents':
        return await this.workflowHandlers.handleGetPendingAgents(args);

      // File Operations
      case 'write_file':
        return await this.fileHandlers.handleWriteFile(args);
      case 'read_file':
        return await this.fileHandlers.handleReadFile(args);

      // Git Operations
      case 'git_init':
        return await this.gitHandlers.handleGitInit(args);
      case 'git_clone':
        return await this.gitHandlers.handleGitClone(args);
      case 'git_commit':
        return await this.gitHandlers.handleGitCommit(args);
      case 'git_push':
        return await this.gitHandlers.handleGitPush(args);
      case 'git_pull':
        return await this.gitHandlers.handleGitPull(args);
      case 'git_status':
        return await this.gitHandlers.handleGitStatus(args);
      case 'git_create_branch':
        return await this.gitHandlers.handleGitCreateBranch(args);
      case 'git_checkout':
        return await this.gitHandlers.handleGitCheckout(args);
      case 'github_create_pr':
        return await this.gitHandlers.handleCreatePullRequest(args);

      // Communication
      case 'log_message':
        return await this.logService.logMessage(args.agent, args.message);
      case 'get_conversation_log':
        return this.logService.getConversationLog(args?.limit);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Multi-Agent MCP server (v2.0 - Modular Architecture) running on stdio');
    console.error('WebSocket monitoring available on port 8080');
  }

  // Méthodes utilitaires pour accéder aux services (si nécessaire pour des extensions)
  getTaskService(): TaskService {
    return this.taskService;
  }

  getWorkflowService(): WorkflowService {
    return this.workflowService;
  }

  getMonitoringService(): MonitoringService {
    return this.monitoringService;
  }
}

// Point d'entrée principal
console.error('Starting Multi-Agent MCP server (v2.0 - Refactored Architecture)...');
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
  console.error('Received SIGINT, graceful shutdown...');
  process.exit(0);
});