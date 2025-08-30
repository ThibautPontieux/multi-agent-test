// services/WorkflowService.ts - Service de gestion des workflows

import { WorkflowRepository, WorkflowTemplates } from '../repositories/WorkflowRepository.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { Workflow, Task, MCPResponse } from '../types/index.js';
import { LogService } from './LogService.js';
import { MonitoringService } from './MonitoringService.js';

export class WorkflowService {
  constructor(
    private workflowRepository: WorkflowRepository,
    private taskRepository: TaskRepository,
    private logService: LogService,
    private monitoringService: MonitoringService
  ) {}

  async startWorkflow(params: {
    workflowType: string;
    projectName: string;
    description?: string;
    agent: string;
  }): Promise<MCPResponse> {
    const steps = WorkflowTemplates.getTemplate(params.workflowType);
    
    if (steps.length === 0) {
      throw new Error(`Unknown workflow type: ${params.workflowType}`);
    }

    const workflow = this.workflowRepository.create({
      name: params.workflowType,
      description: params.description || `Automated ${params.workflowType} workflow for ${params.projectName}`,
      steps,
      status: 'running',
      currentStep: 0
    });

    // Créer la tâche initiale
    const firstStep = workflow.steps[0];
    const initialTask = this.taskRepository.create({
      from: 'orchestrator',
      to: firstStep.agent,
      type: firstStep.template?.type || 'requirement',
      title: `${params.projectName}: ${firstStep.description}`,
      description: `Workflow: ${workflow.name}\nStep: ${firstStep.description}\nProject: ${params.projectName}`,
      data: { 
        workflowId: workflow.id, 
        stepId: firstStep.id, 
        projectName: params.projectName,
        ...firstStep.template 
      },
      status: 'pending',
      workflowId: workflow.id,
      priority: firstStep.template?.priority || 'medium'
    });

    // Broadcaster le démarrage du workflow
    this.monitoringService.broadcastUpdate({
      type: 'workflow_started',
      data: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        projectName: params.projectName,
        totalSteps: workflow.steps.length
      }
    });

    await this.logService.logMessage(params.agent, `Started workflow "${workflow.name}" for project "${params.projectName}"`);

    return {
      content: [{
        type: 'text',
        text: `Workflow started successfully!\nID: ${workflow.id}\nName: ${workflow.name}\nFirst task assigned to: ${firstStep.agent}\n\nWorkflow Steps:\n${workflow.steps.map((step, i) => `${i + 1}. ${step.agent}: ${step.description}`).join('\n')}`
      }]
    };
  }

  async getActiveWorkflows(): Promise<MCPResponse> {
    const activeWorkflows = this.workflowRepository.findActive();
    
    return {
      content: [{
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
      }]
    };
  }

  async executeWorkflowStep(params: {
    workflowId: string;
    agent: string;
  }): Promise<MCPResponse> {
    const workflow = this.workflowRepository.findById(params.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${params.workflowId} not found`);
    }

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep) {
      // Workflow terminé
      this.workflowRepository.update(params.workflowId, { status: 'completed' });
      
      this.monitoringService.broadcastUpdate({
        type: 'workflow_completed',
        data: {
          workflowId: workflow.id,
          workflowName: workflow.name
        }
      });
      
      await this.logService.logMessage(params.agent, `Workflow "${workflow.name}" completed successfully`);
      
      return {
        content: [{
          type: 'text',
          text: `Workflow "${workflow.name}" has been completed!`
        }]
      };
    }

    // Vérifier si l'étape actuelle est terminée
    const stepTasks = this.taskRepository.findByWorkflow(workflow.id)
      .filter(t => t.data?.stepId === currentStep.id);
    
    const isStepCompleted = stepTasks.some(t => t.status === 'completed');
    
    if (isStepCompleted) {
      // Passer à l'étape suivante
      const updatedWorkflow = this.workflowRepository.update(params.workflowId, {
        currentStep: workflow.currentStep + 1
      });
      
      if (!updatedWorkflow) return { content: [{ type: 'text', text: 'Failed to update workflow' }] };
      
      const nextStep = workflow.steps[updatedWorkflow.currentStep];
      if (nextStep && nextStep.autoTrigger) {
        // Créer la tâche suivante
        const nextTask = this.taskRepository.create({
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
          workflowId: workflow.id
        });

        this.monitoringService.broadcastUpdate({
          type: 'workflow_step_progressed',
          data: {
            workflowId: workflow.id,
            currentStep: updatedWorkflow.currentStep + 1,
            totalSteps: workflow.steps.length,
            nextAgent: nextStep.agent
          }
        });
        
        await this.logService.logMessage(params.agent, `Auto-triggered next step: ${nextStep.agent} - ${nextStep.description}`);
      }
      
      return {
        content: [{
          type: 'text',
          text: `Workflow progressed to step ${updatedWorkflow.currentStep + 1}/${workflow.steps.length}\nNext: ${nextStep?.agent || 'N/A'} - ${nextStep?.description || 'Completed'}\n${nextStep?.autoTrigger ? 'Task auto-assigned' : 'Manual trigger required'}`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `Current step "${currentStep.description}" is still pending completion by ${currentStep.agent}`
        }]
      };
    }
  }

  getWorkflowStats() {
    return this.workflowRepository.getStats();
  }

  enrichTaskWithWorkflowInfo(task: Task): Task & { workflowInfo?: any } {
    if (!task.workflowId) return task;
    
    const workflow = this.workflowRepository.findById(task.workflowId);
    if (!workflow) return task;
    
    return {
      ...task,
      workflowInfo: {
        workflowName: workflow.name,
        currentStep: workflow.currentStep + 1,
        totalSteps: workflow.steps.length,
        isAutoTriggered: task.data?.autoTriggered || false
      }
    };
  }
}

// services/LogService.ts - Service de logging centralisé
export class LogService {
  private conversationLog: Array<{ agent: string; message: string; timestamp: string }> = [];

  async logMessage(agent: string, message: string): Promise<MCPResponse> {
    const logEntry = {
      agent,
      message,
      timestamp: new Date().toISOString()
    };

    this.conversationLog.push(logEntry);
    
    // Garder seulement les 100 derniers messages
    if (this.conversationLog.length > 100) {
      this.conversationLog = this.conversationLog.slice(-100);
    }

    return {
      content: [{
        type: 'text',
        text: 'Message logged'
      }]
    };
  }

  getConversationLog(limit: number = 10): MCPResponse {
    const recentLogs = this.conversationLog.slice(-limit);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(recentLogs, null, 2)
      }]
    };
  }

  getAllLogs(): Array<{ agent: string; message: string; timestamp: string }> {
    return [...this.conversationLog];
  }
}