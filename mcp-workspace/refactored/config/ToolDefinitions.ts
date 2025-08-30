// config/ToolDefinitions.ts - Définitions centralisées des outils MCP

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ToolDefinitions {
  static getAllTools(): Tool[] {
    return [
      ...this.getTaskManagementTools(),
      ...this.getFileOperationTools(), 
      ...this.getGitOperationTools(),
      ...this.getWorkflowTools(),
      ...this.getCommunicationTools()
    ];
  }

  private static getTaskManagementTools(): Tool[] {
    return [
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
      }
    ];
  }

  private static getFileOperationTools(): Tool[] {
    return [
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
      }
    ];
  }

  private static getGitOperationTools(): Tool[] {
    return [
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
      }
    ];
  }

  private static getWorkflowTools(): Tool[] {
    return [
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
      }
    ];
  }

  private static getCommunicationTools(): Tool[] {
    return [
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
    ];
  }
}