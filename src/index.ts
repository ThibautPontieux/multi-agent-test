#!/usr/bin/env node

/**
 * MCP Multi-Agent System Server
 * Autonomous AI Development Team using Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Import services
import { logService } from './services/LogService.js';
import { taskService } from './services/TaskService.js';
import { workflowService } from './services/WorkflowService.js';
import { monitoringService } from './services/MonitoringService.js';
import { GitHandlers } from './handlers/GitHandlers.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment configuration
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || join(__dirname, '../../workspace');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Initialize Git handlers
const gitHandlers = new GitHandlers(WORKSPACE_DIR);

/**
 * MCP Server for Multi-Agent AI Development Team
 */
class MultiAgentMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-multi-agent-system',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    logService.info('mcp-server', 'Multi-Agent MCP Server initialized');
  }

  /**
   * Setup all MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Task Management Tools
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

          // Git Operations
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
                projectName: { type: 'string', description: 'Local project name (optional)' },
                agent: { type: 'string' }
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
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['branchName', 'agent']
            }
          },
          {
            name: 'git_checkout',
            description: 'Switch to a different branch',
            inputSchema: {
              type: 'object',
              properties: {
                branchName: { type: 'string' },
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['branchName', 'agent']
            }
          },
          {
            name: 'git_commit',
            description: 'Commit changes with a message',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['message', 'agent']
            }
          },
          {
            name: 'git_push',
            description: 'Push changes to remote repository',
            inputSchema: {
              type: 'object',
              properties: {
                branch: { type: 'string', description: 'Branch to push (optional, defaults to current)' },
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
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
                branch: { type: 'string', description: 'Branch to pull (defaults to current)' },
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
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
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['agent']
            }
          },
          {
            name: 'git_status',
            description: 'Get git status',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['agent']
            }
          },
          {
            name: 'git_merge',
            description: 'Merge another branch into current branch',
            inputSchema: {
              type: 'object',
              properties: {
                sourceBranch: { type: 'string', description: 'Branch to merge from' },
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
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
                includeRemote: { type: 'boolean', description: 'Include remote branches', default: true },
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['agent']
            }
          },

          // GitHub Integration
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
                projectPath: { type: 'string', description: 'Path within workspace (optional)' },
                agent: { type: 'string' }
              },
              required: ['title', 'body', 'head', 'base', 'agent']
            }
          },

          // Workflow Management
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

          // Monitoring and Communication
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
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Record agent activity for monitoring
        if (args.agent) {
          monitoringService.recordAgentActivity(args.agent);
        }

        // Route to appropriate handler
        switch (name) {
          // Task Management
          case 'create_task':
            return this.handleCreateTask(args);
          case 'get_my_tasks':
            return this.handleGetMyTasks(args);
          case 'update_task_status':
            return this.handleUpdateTaskStatus(args);

          // File Operations
          case 'write_file':
            return this.handleWriteFile(args);
          case 'read_file':
            return this.handleReadFile(args);

          // Git Operations
          case 'git_init':
            return this.handleGitInit(args);
          case 'git_clone':
            return this.handleGitClone(args);
          case 'git_create_branch':
            return this.handleGitCreateBranch(args);
          case 'git_checkout':
            return this.handleGitCheckout(args);
          case 'git_commit':
            return this.handleGitCommit(args);
          case 'git_push':
            return this.handleGitPush(args);
          case 'git_pull':
            return this.handleGitPull(args);
          case 'git_fetch':
            return this.handleGitFetch(args);
          case 'git_status':
            return this.handleGitStatus(args);
          case 'git_merge':
            return this.handleGitMerge(args);
          case 'git_list_branches':
            return this.handleGitListBranches(args);

          // GitHub Integration
          case 'github_create_pr':
            return this.handleGitHubCreatePR(args);

          // Workflow Management
          case 'start_workflow':
            return this.handleStartWorkflow(args);
          case 'get_workflows':
            return this.handleGetWorkflows(args);
          case 'execute_workflow_step':
            return this.handleExecuteWorkflowStep(args);

          // Monitoring and Communication
          case 'trigger_agent':
            return this.handleTriggerAgent(args);
          case 'get_pending_agents':
            return this.handleGetPendingAgents(args);
          case 'log_message':
            return this.handleLogMessage(args);
          case 'get_conversation_log':
            return this.handleGetConversationLog(args);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logService.error('mcp-server', `Tool handler error: ${name}`, error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  // Task Management Handlers
  private async handleCreateTask(args: any) {
    const task = taskService.createTask(args);
    return {
      content: [
        {
          type: 'text',
          text: `Task created successfully: ${task.title} (ID: ${task.id})`
        }
      ]
    };
  }

  private async handleGetMyTasks(args: any) {
    const result = taskService.getAgentTasks(args.agent);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleUpdateTaskStatus(args: any) {
    const task = taskService.updateTaskStatus(args.taskId, args.status, args.agent);
    
    if (!task) {
      throw new McpError(ErrorCode.InvalidRequest, 'Task not found or access denied');
    }

    // Auto-trigger workflow progression if task completed
    if (args.status === 'completed' && task.workflowId) {
      const result = workflowService.executeWorkflowStep(task.workflowId);
      const progressMessage = result.success ? ' (workflow will auto-progress)' : '';
      
      return {
        content: [
          {
            type: 'text',
            text: `Task ${args.taskId} status updated to ${args.status}${progressMessage}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.taskId} status updated to ${args.status}`
        }
      ]
    };
  }

  // File Operation Handlers
  private async handleWriteFile(args: any) {
    const filePath = join(WORKSPACE_DIR, args.path);
    const dir = dirname(filePath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    await writeFile(filePath, args.content, 'utf8');
    logService.info(args.agent, `File written: ${args.path}`);

    return {
      content: [
        {
          type: 'text',
          text: `File written successfully: ${args.path}`
        }
      ]
    };
  }

  private async handleReadFile(args: any) {
    const filePath = join(WORKSPACE_DIR, args.path);

    if (!existsSync(filePath)) {
      throw new McpError(ErrorCode.InvalidRequest, `File not found: ${args.path}`);
    }

    const content = await readFile(filePath, 'utf8');
    
    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  // Git Operation Handlers
  private async handleGitInit(args: any) {
    const result = gitHandlers.gitInit();
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? 'Git repository initialized successfully' : result.message
        }
      ]
    };
  }

  private async handleGitClone(args: any) {
    const result = gitHandlers.gitClone(args.url, args.projectName);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? `Repository cloned successfully: ${args.url}` : result.message
        }
      ]
    };
  }

  private async handleGitCreateBranch(args: any) {
    const result = gitHandlers.gitCreateBranch(args.branchName, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? `Branch created: ${args.branchName}` : result.message
        }
      ]
    };
  }

  private async handleGitCheckout(args: any) {
    const result = gitHandlers.gitCheckout(args.branchName, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? `Switched to branch: ${args.branchName}` : result.message
        }
      ]
    };
  }

  private async handleGitCommit(args: any) {
    const result = gitHandlers.gitCommit(args.message, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? `Changes committed: ${args.message}` : result.message
        }
      ]
    };
  }

  private async handleGitPush(args: any) {
    const result = gitHandlers.gitPush(args.branch, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? 'Changes pushed successfully' : result.message
        }
      ]
    };
  }

  private async handleGitPull(args: any) {
    const result = gitHandlers.gitPull(args.branch, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? 'Changes pulled successfully' : result.message
        }
      ]
    };
  }

  private async handleGitFetch(args: any) {
    const result = gitHandlers.gitFetch(args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? 'Remote changes fetched successfully' : result.message
        }
      ]
    };
  }

  private async handleGitStatus(args: any) {
    const result = gitHandlers.gitStatus(args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.data : result.message
        }
      ]
    };
  }

  private async handleGitMerge(args: any) {
    const result = gitHandlers.gitMerge(args.sourceBranch, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? `Successfully merged ${args.sourceBranch}` : result.message
        }
      ]
    };
  }

  private async handleGitListBranches(args: any) {
    const result = gitHandlers.gitListBranches(args.includeRemote, args.projectPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result.success ? JSON.stringify(result.data, null, 2) : result.message
        }
      ]
    };
  }

  // GitHub Integration Handlers
  private async handleGitHubCreatePR(args: any) {
    if (!GITHUB_TOKEN) {
      throw new McpError(ErrorCode.InvalidRequest, 'GitHub token not configured');
    }

    try {
      // Get remote URL to extract repo info
      const remoteResult = gitHandlers.getRemoteUrl(args.projectPath);
      if (!remoteResult.success) {
        throw new Error('Could not determine repository from git remote');
      }

      // Parse GitHub repo from URL (supports both HTTPS and SSH)
      const remoteUrl = remoteResult.data;
      const repoMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
      
      if (!repoMatch) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = repoMatch;

      // Create PR via GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          title: args.title,
          body: args.body,
          head: args.head,
          base: args.base
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message || response.statusText}`);
      }

      const pr = await response.json();
      logService.info(args.agent, `Pull request created: ${pr.html_url}`, { prNumber: pr.number });

      return {
        content: [
          {
            type: 'text',
            text: `Pull request created successfully: ${pr.html_url} (PR #${pr.number})`
          }
        ]
      };
    } catch (error: any) {
      logService.error(args.agent, 'Failed to create GitHub PR', error);
      throw new McpError(ErrorCode.InternalError, `GitHub PR creation failed: ${error.message}`);
    }
  }

  // Workflow Management Handlers
  private async handleStartWorkflow(args: any) {
    const workflow = workflowService.startWorkflow(
      args.workflowType,
      args.projectName,
      args.description || `${args.workflowType} workflow for ${args.projectName}`,
      args.agent
    );

    return {
      content: [
        {
          type: 'text',
          text: `Workflow started: ${workflow.type} for ${workflow.projectName} (ID: ${workflow.id})`
        }
      ]
    };
  }

  private async handleGetWorkflows(args: any) {
    const workflows = workflowService.getAllWorkflows();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(workflows, null, 2)
        }
      ]
    };
  }

  private async handleExecuteWorkflowStep(args: any) {
    const result = workflowService.executeWorkflowStep(args.workflowId);
    
    return {
      content: [
        {
          type: 'text',
          text: result.message
        }
      ]
    };
  }

  // Monitoring and Communication Handlers
  private async handleTriggerAgent(args: any) {
    const task = taskService.createTask({
      from: args.agent,
      to: args.targetAgent,
      type: 'workflow_trigger',
      title: '🔔 Agent Activation',
      description: args.message,
      data: {
        trigger: true,
        from_orchestrator: args.agent === 'orchestrator'
      },
      priority: 'high'
    });

    return {
      content: [
        {
          type: 'text',
          text: `Agent ${args.targetAgent} triggered with message: ${args.message}`
        }
      ]
    };
  }

  private async handleGetPendingAgents(args: any) {
    const agents = monitoringService.getAgentsWithPendingWork();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(agents, null, 2)
        }
      ]
    };
  }

  private async handleLogMessage(args: any) {
    logService.info(args.agent, args.message);
    
    return {
      content: [
        {
          type: 'text',
          text: `Message logged for ${args.agent}: ${args.message}`
        }
      ]
    };
  }

  private async handleGetConversationLog(args: any) {
    const logs = logService.getRecentLogs(args.limit || 10);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(logs, null, 2)
        }
      ]
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logService.info('mcp-server', 'Multi-Agent MCP Server started successfully', {
      workspaceDir: WORKSPACE_DIR,
      githubConfigured: !!GITHUB_TOKEN
    });
  }
}

// Start the server
async function main() {
  const server = new MultiAgentMCPServer();
  await server.start();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logService.info('mcp-server', 'Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logService.info('mcp-server', 'Shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logService.error('mcp-server', 'Failed to start server', error);
  process.exit(1);
});
