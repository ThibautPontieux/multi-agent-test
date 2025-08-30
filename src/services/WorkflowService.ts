import { logService } from './LogService.js';
import { taskService, Task } from './TaskService.js';

export interface WorkflowStep {
  id: string;
  agent: 'designer' | 'developer' | 'qa';
  template: {
    type: Task['type'];
    title: string;
    description: string;
  };
  autoTrigger: boolean;
  completed: boolean;
  completedAt?: string;
}

export interface Workflow {
  id: string;
  type: 'development-cycle' | 'bug-fix' | 'feature-request' | 'code-review';
  projectName: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  currentStep: number;
  steps: WorkflowStep[];
  created: string;
  updated: string;
  initiatedBy: string;
}

interface WorkflowTemplate {
  type: Workflow['type'];
  steps: Omit<WorkflowStep, 'id' | 'completed' | 'completedAt'>[];
}

export class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();
  private templates: WorkflowTemplate[] = [
    {
      type: 'development-cycle',
      steps: [
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Sync with latest main branch to ensure clean starting point',
            description: 'Workflow: development-cycle\nStep: Sync with latest main branch to ensure clean starting point\nProject: {projectName}'
          },
          autoTrigger: false
        },
        {
          agent: 'designer',
          template: {
            type: 'requirement',
            title: '{projectName}: Create comprehensive requirements and user stories',
            description: 'Workflow: development-cycle\nStep: Create comprehensive requirements and user stories\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Sync main, create feature branch, and implement requirements',
            description: 'Workflow: development-cycle\nStep: Sync main, create feature branch, and implement requirements\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'qa',
          template: {
            type: 'review',
            title: '{projectName}: Review implementation and provide quality assessment',
            description: 'Workflow: development-cycle\nStep: Review implementation and provide quality assessment\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Sync main, merge changes, and create GitHub PR',
            description: 'Workflow: development-cycle\nStep: Sync main, merge changes, and create GitHub PR\nProject: {projectName}'
          },
          autoTrigger: true
        }
      ]
    },
    {
      type: 'bug-fix',
      steps: [
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Sync with latest main branch to ensure bug still exists',
            description: 'Workflow: bug-fix\nStep: Sync with latest main branch to ensure bug still exists\nProject: {projectName}'
          },
          autoTrigger: false
        },
        {
          agent: 'qa',
          template: {
            type: 'review',
            title: '{projectName}: Reproduce and document the bug with detailed steps',
            description: 'Workflow: bug-fix\nStep: Reproduce and document the bug with detailed steps\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Sync main, create bugfix branch, and implement fix',
            description: 'Workflow: bug-fix\nStep: Sync main, create bugfix branch, and implement fix\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'qa',
          template: {
            type: 'review',
            title: '{projectName}: Verify fix and run regression tests',
            description: 'Workflow: bug-fix\nStep: Verify fix and run regression tests\nProject: {projectName}'
          },
          autoTrigger: true
        }
      ]
    },
    {
      type: 'feature-request',
      steps: [
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Sync with latest main branch',
            description: 'Workflow: feature-request\nStep: Sync with latest main branch\nProject: {projectName}'
          },
          autoTrigger: false
        },
        {
          agent: 'designer',
          template: {
            type: 'requirement',
            title: '{projectName}: Analyze feature request and create detailed specifications',
            description: 'Workflow: feature-request\nStep: Analyze feature request and create detailed specifications\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Implement feature according to specifications',
            description: 'Workflow: feature-request\nStep: Implement feature according to specifications\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'qa',
          template: {
            type: 'review',
            title: '{projectName}: Test new feature and provide feedback',
            description: 'Workflow: feature-request\nStep: Test new feature and provide feedback\nProject: {projectName}'
          },
          autoTrigger: true
        }
      ]
    },
    {
      type: 'code-review',
      steps: [
        {
          agent: 'qa',
          template: {
            type: 'review',
            title: '{projectName}: Initial code review and quality assessment',
            description: 'Workflow: code-review\nStep: Initial code review and quality assessment\nProject: {projectName}'
          },
          autoTrigger: false
        },
        {
          agent: 'developer',
          template: {
            type: 'code',
            title: '{projectName}: Address review feedback and make improvements',
            description: 'Workflow: code-review\nStep: Address review feedback and make improvements\nProject: {projectName}'
          },
          autoTrigger: true
        },
        {
          agent: 'qa',
          template: {
            type: 'review',
            title: '{projectName}: Final review and approval',
            description: 'Workflow: code-review\nStep: Final review and approval\nProject: {projectName}'
          },
          autoTrigger: true
        }
      ]
    }
  ];

  constructor() {
    logService.info('workflow-service', 'WorkflowService initialized with templates', {
      templateCount: this.templates.length
    });
  }

  /**
   * Start a new workflow
   */
  startWorkflow(
    type: Workflow['type'],
    projectName: string,
    description: string,
    initiatedBy: string
  ): Workflow {
    const template = this.templates.find(t => t.type === type);
    if (!template) {
      throw new Error(`Workflow template not found: ${type}`);
    }

    const workflowId = Date.now().toString();
    const now = new Date().toISOString();

    // Create workflow steps with unique IDs
    const steps: WorkflowStep[] = template.steps.map((step, index) => ({
      ...step,
      id: `${workflowId}-step-${index}`,
      template: {
        ...step.template,
        title: step.template.title.replace('{projectName}', projectName),
        description: step.template.description.replace('{projectName}', projectName)
      },
      completed: false
    }));

    const workflow: Workflow = {
      id: workflowId,
      type,
      projectName,
      description,
      status: 'active',
      currentStep: 0,
      steps,
      created: now,
      updated: now,
      initiatedBy
    };

    this.workflows.set(workflowId, workflow);

    // Create the first task
    this.createTaskForStep(workflow, 0);

    logService.info('workflow-service', `Workflow started: ${type}`, {
      workflowId,
      projectName,
      stepsCount: steps.length
    });

    return workflow;
  }

  /**
   * Execute next workflow step
   */
  executeWorkflowStep(workflowId: string): { success: boolean; message: string } {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return { success: false, message: 'Workflow not found' };
    }

    if (workflow.status !== 'active') {
      return { success: false, message: 'Workflow is not active' };
    }

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep) {
      return { success: false, message: 'No current step found' };
    }

    // Mark current step as completed
    currentStep.completed = true;
    currentStep.completedAt = new Date().toISOString();

    // Move to next step
    workflow.currentStep++;
    workflow.updated = new Date().toISOString();

    // Check if workflow is complete
    if (workflow.currentStep >= workflow.steps.length) {
      workflow.status = 'completed';
      logService.info('workflow-service', `Workflow completed: ${workflow.projectName}`, {
        workflowId: workflow.id,
        type: workflow.type
      });
      return { success: true, message: 'Workflow completed successfully' };
    }

    // Create task for next step if it has auto-trigger
    const nextStep = workflow.steps[workflow.currentStep];
    if (nextStep && nextStep.autoTrigger) {
      this.createTaskForStep(workflow, workflow.currentStep);
    }

    return { success: true, message: 'Workflow step executed successfully' };
  }

  /**
   * Create task for workflow step
   */
  private createTaskForStep(workflow: Workflow, stepIndex: number): void {
    const step = workflow.steps[stepIndex];
    if (!step) return;

    const task = taskService.createTask({
      from: 'orchestrator',
      to: step.agent,
      type: step.template.type,
      title: step.template.title,
      description: step.template.description,
      data: {
        workflowId: workflow.id,
        stepId: step.id,
        projectName: workflow.projectName,
        type: step.template.type,
        sync_before_start: stepIndex === 0 && (workflow.type === 'development-cycle' || workflow.type === 'bug-fix')
      },
      workflowId: workflow.id,
      priority: 'medium',
      workflowInfo: {
        workflowName: workflow.type,
        currentStep: stepIndex + 1,
        totalSteps: workflow.steps.length,
        isAutoTriggered: step.autoTrigger
      }
    });

    logService.info('workflow-service', `Task created for workflow step`, {
      workflowId: workflow.id,
      stepId: step.id,
      taskId: task.id,
      agent: step.agent
    });
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | null {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
      .filter(w => w.status === 'active')
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }

  /**
   * Pause workflow
   */
  pauseWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'active') {
      return false;
    }

    workflow.status = 'paused';
    workflow.updated = new Date().toISOString();

    logService.info('workflow-service', `Workflow paused: ${workflow.projectName}`, {
      workflowId
    });

    return true;
  }

  /**
   * Resume workflow
   */
  resumeWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'paused') {
      return false;
    }

    workflow.status = 'active';
    workflow.updated = new Date().toISOString();

    logService.info('workflow-service', `Workflow resumed: ${workflow.projectName}`, {
      workflowId
    });

    return true;
  }

  /**
   * Check if workflow can progress (current step is completed)
   */
  canWorkflowProgress(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'active') {
      return false;
    }

    const currentStep = workflow.steps[workflow.currentStep];
    return currentStep ? currentStep.completed : false;
  }

  /**
   * Get workflow progress summary
   */
  getWorkflowProgress(workflowId: string): {
    completed: number;
    total: number;
    percentage: number;
    currentStep: string;
  } | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const completed = workflow.steps.filter(s => s.completed).length;
    const total = workflow.steps.length;
    const percentage = Math.round((completed / total) * 100);
    const currentStep = workflow.steps[workflow.currentStep]?.template.title || 'Completed';

    return {
      completed,
      total,
      percentage,
      currentStep
    };
  }
}

// Singleton instance
export const workflowService = new WorkflowService();
