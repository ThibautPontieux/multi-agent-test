// services/TaskService.ts - Logique métier des tâches

import { TaskRepository } from '../repositories/TaskRepository.js';
import { Task, MCPResponse } from '../types/index.js';
import { LogService } from './LogService.js';
import { MonitoringService } from './MonitoringService.js';

export class TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private logService: LogService,
    private monitoringService: MonitoringService
  ) {}

  async createTask(params: {
    from: string;
    to: string;
    type: string;
    title: string;
    description: string;
    data?: any;
  }): Promise<MCPResponse> {
    const task = this.taskRepository.create({
      from: params.from as any,
      to: params.to as any,
      type: params.type as any,
      title: params.title,
      description: params.description,
      data: params.data,
      status: 'pending'
    });

    // Broadcaster la création de tâche
    this.monitoringService.broadcastUpdate({
      type: 'task_created',
      data: {
        taskId: task.id,
        agent: task.to,
        title: task.title,
        workflowId: task.workflowId
      }
    });

    await this.logService.logMessage(params.from, `Created task "${task.title}" for ${task.to}`);

    return {
      content: [{
        type: 'text',
        text: `Task created successfully. ID: ${task.id}`
      }]
    };
  }

  async getTasksForAgent(agent: string): Promise<MCPResponse> {
    const myTasks = this.taskRepository
      .findByAgent(agent)
      .filter(task => task.status !== 'completed')
      .sort(this.prioritizeTasksSort);

    const enrichedTasks = myTasks.map(task => this.enrichTaskWithWorkflowInfo(task));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalTasks: myTasks.length,
          workflowTasks: myTasks.filter(t => t.workflowId).length,
          manualTasks: myTasks.filter(t => !t.workflowId).length,
          tasks: enrichedTasks
        }, null, 2)
      }]
    };
  }

  async updateTaskStatus(params: {
    taskId: string;
    status: Task['status'];
    agent: string;
  }): Promise<{ updatedTask: Task | null; response: MCPResponse }> {
    const task = this.taskRepository.findById(params.taskId);
    if (!task) {
      throw new Error(`Task ${params.taskId} not found`);
    }

    const updatedTask = this.taskRepository.update(params.taskId, { 
      status: params.status 
    });

    // Broadcaster le changement de statut
    this.monitoringService.broadcastUpdate({
      type: 'task_status_changed',
      data: {
        taskId: params.taskId,
        status: params.status,
        agent: params.agent,
        workflowId: task.workflowId
      }
    });

    await this.logService.logMessage(
      params.agent, 
      `Updated task "${task.title}" status to ${params.status}`
    );

    return {
      updatedTask,
      response: {
        content: [{
          type: 'text',
          text: `Task ${params.taskId} status updated to ${params.status}${task.workflowId ? ' (workflow will auto-progress)' : ''}`
        }]
      }
    };
  }

  getTaskStats() {
    return this.taskRepository.getStats();
  }

  getTasksByWorkflow(workflowId: string): Task[] {
    return this.taskRepository.findByWorkflow(workflowId);
  }

  private prioritizeTasksSort(a: Task, b: Task): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority || 'medium'];
    const bPriority = priorityOrder[b.priority || 'medium'];
    
    if (a.workflowId && !b.workflowId) return -1;
    if (!a.workflowId && b.workflowId) return 1;
    return bPriority - aPriority;
  }

  private enrichTaskWithWorkflowInfo(task: Task): Task & { workflowInfo?: any } {
    if (!task.workflowId) return task;

    // Cette logique sera déplacée vers WorkflowService plus tard
    return {
      ...task,
      workflowInfo: {
        workflowName: 'Unknown',
        isAutoTriggered: task.data?.autoTriggered || false
      }
    };
  }
}