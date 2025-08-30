import { logService } from './LogService.js';

export interface Task {
  id: string;
  from: 'designer' | 'developer' | 'qa' | 'orchestrator';
  to: 'designer' | 'developer' | 'qa' | 'orchestrator';
  type: 'requirement' | 'code' | 'review' | 'feedback' | 'workflow_trigger';
  title: string;
  description: string;
  data?: any;
  status: 'pending' | 'in_progress' | 'completed';
  created: string;
  updated?: string;
  workflowId?: string;
  priority: 'low' | 'medium' | 'high';
  workflowInfo?: {
    workflowName: string;
    currentStep: number;
    totalSteps: number;
    isAutoTriggered: boolean;
  };
}

export class TaskService {
  private tasks: Map<string, Task> = new Map();
  private agentTasks: Map<string, string[]> = new Map();

  constructor() {
    // Initialize agent task queues
    ['designer', 'developer', 'qa', 'orchestrator'].forEach(agent => {
      this.agentTasks.set(agent, []);
    });
    
    logService.info('task-service', 'TaskService initialized');
  }

  /**
   * Create a new task
   */
  createTask(taskData: Omit<Task, 'id' | 'status' | 'created'>): Task {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: Task = {
      ...taskData,
      id,
      status: 'pending',
      created: new Date().toISOString(),
      priority: taskData.priority || 'medium'
    };

    this.tasks.set(id, task);
    
    // Add to agent's task queue
    const agentQueue = this.agentTasks.get(task.to) || [];
    agentQueue.push(id);
    this.agentTasks.set(task.to, agentQueue);

    logService.info('task-service', `Task created: ${task.title}`, {
      id: task.id,
      from: task.from,
      to: task.to,
      type: task.type
    });

    return task;
  }

  /**
   * Get tasks for specific agent
   */
  getAgentTasks(agent: string): {
    totalTasks: number;
    workflowTasks: number;
    manualTasks: number;
    tasks: Task[];
  } {
    const taskIds = this.agentTasks.get(agent) || [];
    const tasks = taskIds
      .map(id => this.tasks.get(id))
      .filter((task): task is Task => task !== undefined)
      .filter(task => task.status === 'pending' || task.status === 'in_progress')
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(a.created).getTime() - new Date(b.created).getTime();
      });

    const workflowTasks = tasks.filter(task => task.workflowId).length;
    const manualTasks = tasks.filter(task => !task.workflowId).length;

    return {
      totalTasks: tasks.length,
      workflowTasks,
      manualTasks,
      tasks
    };
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: Task['status'], agent: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      logService.error('task-service', `Task not found: ${taskId}`);
      return null;
    }

    if (task.to !== agent) {
      logService.error('task-service', `Agent ${agent} cannot update task assigned to ${task.to}`);
      return null;
    }

    task.status = status;
    task.updated = new Date().toISOString();

    logService.info('task-service', `Task status updated: ${task.title}`, {
      id: taskId,
      status,
      agent
    });

    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tasks (for monitoring)
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by workflow ID
   */
  getWorkflowTasks(workflowId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(task => task.workflowId === workflowId)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
  }

  /**
   * Delete completed tasks older than specified days
   */
  cleanupOldTasks(daysToKeep: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const tasksToDelete: string[] = [];

    this.tasks.forEach((task, id) => {
      if (task.status === 'completed' && new Date(task.created) < cutoffDate) {
        tasksToDelete.push(id);
      }
    });

    // Remove from task map
    tasksToDelete.forEach(id => {
      const task = this.tasks.get(id);
      if (task) {
        this.tasks.delete(id);
        
        // Remove from agent queue
        const agentQueue = this.agentTasks.get(task.to) || [];
        const index = agentQueue.indexOf(id);
        if (index > -1) {
          agentQueue.splice(index, 1);
          this.agentTasks.set(task.to, agentQueue);
        }
      }
    });

    if (tasksToDelete.length > 0) {
      logService.info('task-service', `Cleaned up ${tasksToDelete.length} old completed tasks`);
    }

    return tasksToDelete.length;
  }
}

// Singleton instance
export const taskService = new TaskService();
