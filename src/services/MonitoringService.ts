import { logService } from './LogService.js';
import { taskService } from './TaskService.js';
import { workflowService } from './WorkflowService.js';

export interface AgentStatus {
  agent: string;
  status: 'idle' | 'busy' | 'offline';
  lastActivity: string;
  currentTask?: string;
  taskCount: number;
  completedTasks: number;
}

export interface SystemMetrics {
  timestamp: string;
  activeWorkflows: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  agents: AgentStatus[];
  performanceMetrics: {
    avgTaskCompletionTime: number;
    workflowCompletionRate: number;
    systemUptime: number;
  };
}

export class MonitoringService {
  private startTime: Date;
  private agentActivity: Map<string, Date> = new Map();
  private taskCompletionTimes: number[] = [];
  private maxMetricsHistory = 100;

  constructor() {
    this.startTime = new Date();
    
    // Initialize agent activity tracking
    ['designer', 'developer', 'qa', 'orchestrator'].forEach(agent => {
      this.agentActivity.set(agent, new Date());
    });

    logService.info('monitoring-service', 'MonitoringService initialized');
  }

  /**
   * Record agent activity
   */
  recordAgentActivity(agent: string): void {
    this.agentActivity.set(agent, new Date());
    logService.debug('monitoring-service', `Agent activity recorded: ${agent}`);
  }

  /**
   * Record task completion time
   */
  recordTaskCompletion(startTime: string, endTime: string): void {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const completionTime = end.getTime() - start.getTime();
    
    this.taskCompletionTimes.push(completionTime);
    
    // Keep only recent completion times
    if (this.taskCompletionTimes.length > this.maxMetricsHistory) {
      this.taskCompletionTimes = this.taskCompletionTimes.slice(-this.maxMetricsHistory);
    }

    logService.debug('monitoring-service', `Task completion recorded: ${completionTime}ms`);
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const allTasks = taskService.getAllTasks();
    const activeWorkflows = workflowService.getActiveWorkflows();
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = allTasks.filter(t => t.status === 'pending').length;

    const agents: AgentStatus[] = ['designer', 'developer', 'qa', 'orchestrator'].map(agent => {
      const agentTasks = taskService.getAgentTasks(agent);
      const lastActivity = this.agentActivity.get(agent) || this.startTime;
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
      
      let status: AgentStatus['status'] = 'idle';
      if (now.getTime() - lastActivity.getTime() > inactiveThreshold) {
        status = 'offline';
      } else if (agentTasks.tasks.some(t => t.status === 'in_progress')) {
        status = 'busy';
      }

      const completedTasksForAgent = allTasks.filter(
        t => t.to === agent && t.status === 'completed'
      ).length;

      return {
        agent,
        status,
        lastActivity: lastActivity.toISOString(),
        currentTask: agentTasks.tasks.find(t => t.status === 'in_progress')?.title,
        taskCount: agentTasks.totalTasks,
        completedTasks: completedTasksForAgent
      };
    });

    const avgTaskCompletionTime = this.taskCompletionTimes.length > 0
      ? this.taskCompletionTimes.reduce((a, b) => a + b, 0) / this.taskCompletionTimes.length
      : 0;

    const allWorkflows = workflowService.getAllWorkflows();
    const completedWorkflows = allWorkflows.filter(w => w.status === 'completed').length;
    const workflowCompletionRate = allWorkflows.length > 0
      ? (completedWorkflows / allWorkflows.length) * 100
      : 0;

    const systemUptime = Date.now() - this.startTime.getTime();

    return {
      timestamp: new Date().toISOString(),
      activeWorkflows: activeWorkflows.length,
      totalTasks,
      completedTasks,
      pendingTasks,
      agents,
      performanceMetrics: {
        avgTaskCompletionTime,
        workflowCompletionRate,
        systemUptime
      }
    };
  }

  /**
   * Get agents with pending work
   */
  getAgentsWithPendingWork(): string[] {
    const agentsWithWork: string[] = [];

    ['designer', 'developer', 'qa'].forEach(agent => {
      const agentTasks = taskService.getAgentTasks(agent);
      if (agentTasks.totalTasks > 0) {
        agentsWithWork.push(agent);
      }
    });

    return agentsWithWork;
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for offline agents
    const offlineAgents = metrics.agents.filter(a => a.status === 'offline');
    if (offlineAgents.length > 0) {
      issues.push(`${offlineAgents.length} agent(s) offline: ${offlineAgents.map(a => a.agent).join(', ')}`);
      recommendations.push('Check agent connectivity and restart if necessary');
    }

    // Check for task backlog
    if (metrics.pendingTasks > 10) {
      issues.push(`High task backlog: ${metrics.pendingTasks} pending tasks`);
      recommendations.push('Consider adding more agents or optimizing task distribution');
    }

    // Check for stalled workflows
    const activeWorkflows = workflowService.getActiveWorkflows();
    const stalledWorkflows = activeWorkflows.filter(w => {
      const created = new Date(w.updated);
      const now = new Date();
      const stalledThreshold = 30 * 60 * 1000; // 30 minutes
      return now.getTime() - created.getTime() > stalledThreshold;
    });

    if (stalledWorkflows.length > 0) {
      issues.push(`${stalledWorkflows.length} stalled workflow(s) detected`);
      recommendations.push('Review workflow progress and resolve any blockers');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = offlineAgents.length > 1 || stalledWorkflows.length > 2 ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      recommendations
    };
  }

  /**
   * Generate system report
   */
  generateSystemReport(): string {
    const metrics = this.getSystemMetrics();
    const health = this.getSystemHealth();
    const uptime = Math.round(metrics.performanceMetrics.systemUptime / (1000 * 60)); // minutes

    let report = `# System Monitoring Report\n\n`;
    report += `**Generated:** ${metrics.timestamp}\n`;
    report += `**System Status:** ${health.status.toUpperCase()}\n`;
    report += `**Uptime:** ${uptime} minutes\n\n`;

    report += `## Overview\n`;
    report += `- Active Workflows: ${metrics.activeWorkflows}\n`;
    report += `- Total Tasks: ${metrics.totalTasks}\n`;
    report += `- Completed Tasks: ${metrics.completedTasks}\n`;
    report += `- Pending Tasks: ${metrics.pendingTasks}\n`;
    report += `- Avg Task Completion: ${Math.round(metrics.performanceMetrics.avgTaskCompletionTime)}ms\n`;
    report += `- Workflow Completion Rate: ${Math.round(metrics.performanceMetrics.workflowCompletionRate)}%\n\n`;

    report += `## Agent Status\n`;
    metrics.agents.forEach(agent => {
      const statusIcon = agent.status === 'busy' ? '🟢' : agent.status === 'idle' ? '🟡' : '🔴';
      report += `- ${statusIcon} **${agent.agent}**: ${agent.status} (${agent.taskCount} tasks, ${agent.completedTasks} completed)\n`;
      if (agent.currentTask) {
        report += `  Current: ${agent.currentTask}\n`;
      }
    });

    if (health.issues.length > 0) {
      report += `\n## Issues\n`;
      health.issues.forEach(issue => {
        report += `- ⚠️ ${issue}\n`;
      });
    }

    if (health.recommendations.length > 0) {
      report += `\n## Recommendations\n`;
      health.recommendations.forEach(rec => {
        report += `- 💡 ${rec}\n`;
      });
    }

    return report;
  }

  /**
   * Get workflow summary
   */
  getWorkflowSummary(): {
    total: number;
    active: number;
    completed: number;
    byType: Record<string, number>;
  } {
    const allWorkflows = workflowService.getAllWorkflows();
    const activeWorkflows = allWorkflows.filter(w => w.status === 'active');
    const completedWorkflows = allWorkflows.filter(w => w.status === 'completed');

    const byType: Record<string, number> = {};
    allWorkflows.forEach(w => {
      byType[w.type] = (byType[w.type] || 0) + 1;
    });

    return {
      total: allWorkflows.length,
      active: activeWorkflows.length,
      completed: completedWorkflows.length,
      byType
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.taskCompletionTimes = [];
    this.agentActivity.clear();
    ['designer', 'developer', 'qa', 'orchestrator'].forEach(agent => {
      this.agentActivity.set(agent, new Date());
    });

    logService.info('monitoring-service', 'Metrics reset');
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();
