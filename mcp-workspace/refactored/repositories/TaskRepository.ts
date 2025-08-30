// repositories/TaskRepository.ts - Gestion des données des tâches

import { Task, Repository } from '../types/index.js';

export class TaskRepository implements Repository {
  private tasks: Task[] = [];

  findById(id: string): Task | undefined {
    return this.tasks.find(task => task.id === id);
  }

  findAll(): Task[] {
    return [...this.tasks];
  }

  findByAgent(agent: string): Task[] {
    return this.tasks.filter(task => task.to === agent);
  }

  findPending(): Task[] {
    return this.tasks.filter(task => task.status === 'pending');
  }

  findByWorkflow(workflowId: string): Task[] {
    return this.tasks.filter(task => task.workflowId === workflowId);
  }

  findByStatus(status: Task['status']): Task[] {
    return this.tasks.filter(task => task.status === status);
  }

  create(task: Omit<Task, 'id'>): Task {
    const newTask: Task = {
      id: Date.now().toString(),
      ...task,
      created: new Date().toISOString()
    };
    
    this.tasks.push(newTask);
    return newTask;
  }

  update(id: string, updates: Partial<Task>): Task | null {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return null;

    this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
    return this.tasks[taskIndex];
  }

  delete(id: string): boolean {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return false;

    this.tasks.splice(taskIndex, 1);
    return true;
  }

  getStats() {
    return {
      total: this.tasks.length,
      pending: this.tasks.filter(t => t.status === 'pending').length,
      inProgress: this.tasks.filter(t => t.status === 'in_progress').length,
      completed: this.tasks.filter(t => t.status === 'completed').length,
      byAgent: this.groupByAgent(),
      byWorkflow: this.groupByWorkflow()
    };
  }

  private groupByAgent() {
    const agentGroups: { [key: string]: number } = {};
    this.tasks.forEach(task => {
      agentGroups[task.to] = (agentGroups[task.to] || 0) + 1;
    });
    return agentGroups;
  }

  private groupByWorkflow() {
    const workflowGroups: { [key: string]: number } = {};
    this.tasks.forEach(task => {
      if (task.workflowId) {
        workflowGroups[task.workflowId] = (workflowGroups[task.workflowId] || 0) + 1;
      }
    });
    return workflowGroups;
  }
}