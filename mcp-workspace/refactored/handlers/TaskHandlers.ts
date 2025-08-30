// handlers/TaskHandlers.ts - Handlers spécialisés pour les outils de tâches

import { TaskService } from '../services/TaskService.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { MCPResponse } from '../types/index.js';

export class TaskHandlers {
  constructor(
    private taskService: TaskService,
    private workflowService: WorkflowService
  ) {}

  async handleCreateTask(args: any): Promise<MCPResponse> {
    return await this.taskService.createTask(args);
  }

  async handleGetMyTasks(args: any): Promise<MCPResponse> {
    return await this.taskService.getTasksForAgent(args.agent);
  }

  async handleUpdateTaskStatus(args: any): Promise<MCPResponse> {
    const { updatedTask, response } = await this.taskService.updateTaskStatus(args);
    
    // Auto-progression du workflow si la tâche est terminée et fait partie d'un workflow
    if (args.status === 'completed' && updatedTask?.workflowId) {
      setTimeout(async () => {
        await this.workflowService.executeWorkflowStep({ 
          workflowId: updatedTask.workflowId!, 
          agent: 'orchestrator' 
        });
      }, 1000);
    }

    return response;
  }
}

// handlers/WorkflowHandlers.ts - Handlers pour les workflows
export class WorkflowHandlers {
  constructor(private workflowService: WorkflowService) {}

  async handleStartWorkflow(args: any): Promise<MCPResponse> {
    return await this.workflowService.startWorkflow(args);
  }

  async handleGetWorkflows(args: any): Promise<MCPResponse> {
    return await this.workflowService.getActiveWorkflows();
  }

  async handleExecuteWorkflowStep(args: any): Promise<MCPResponse> {
    return await this.workflowService.executeWorkflowStep(args);
  }

  async handleTriggerAgent(args: any): Promise<MCPResponse> {
    // Cette logique pourrait être déplacée vers un service séparé
    // Pour l'instant, on garde la logique simple
    return {
      content: [{
        type: 'text',
        text: `Agent ${args.targetAgent} has been notified and triggered`
      }]
    };
  }

  async handleGetPendingAgents(args: any): Promise<MCPResponse> {
    // Cette logique utiliserait le TaskService pour obtenir les statistiques
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalPendingTasks: 0,
          agentWorkload: []
        }, null, 2)
      }]
    };
  }
}