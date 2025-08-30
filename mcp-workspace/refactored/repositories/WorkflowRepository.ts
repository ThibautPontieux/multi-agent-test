// repositories/WorkflowRepository.ts

import { Workflow, WorkflowStep, Repository } from '../types/index.js';

export class WorkflowRepository implements Repository {
  private workflows: Workflow[] = [];

  findById(id: string): Workflow | undefined {
    return this.workflows.find(workflow => workflow.id === id);
  }

  findAll(): Workflow[] {
    return [...this.workflows];
  }

  findByStatus(status: Workflow['status']): Workflow[] {
    return this.workflows.filter(workflow => workflow.status === status);
  }

  findActive(): Workflow[] {
    return this.workflows.filter(workflow => workflow.status === 'running');
  }

  create(workflow: Omit<Workflow, 'id'>): Workflow {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      ...workflow,
      created: new Date().toISOString()
    };
    
    this.workflows.push(newWorkflow);
    return newWorkflow;
  }

  update(id: string, updates: Partial<Workflow>): Workflow | null {
    const workflowIndex = this.workflows.findIndex(workflow => workflow.id === id);
    if (workflowIndex === -1) return null;

    this.workflows[workflowIndex] = { ...this.workflows[workflowIndex], ...updates };
    return this.workflows[workflowIndex];
  }

  delete(id: string): boolean {
    const workflowIndex = this.workflows.findIndex(workflow => workflow.id === id);
    if (workflowIndex === -1) return false;

    this.workflows.splice(workflowIndex, 1);
    return true;
  }

  getStats() {
    return {
      total: this.workflows.length,
      pending: this.workflows.filter(w => w.status === 'pending').length,
      running: this.workflows.filter(w => w.status === 'running').length,
      completed: this.workflows.filter(w => w.status === 'completed').length,
      failed: this.workflows.filter(w => w.status === 'failed').length,
      avgStepsPerWorkflow: this.calculateAverageSteps()
    };
  }

  private calculateAverageSteps(): number {
    if (this.workflows.length === 0) return 0;
    const totalSteps = this.workflows.reduce((sum, workflow) => sum + workflow.steps.length, 0);
    return Math.round(totalSteps / this.workflows.length);
  }
}

// templates/WorkflowTemplates.ts
export class WorkflowTemplates {
  static getTemplate(workflowType: string): WorkflowStep[] {
    const templates: Record<string, WorkflowStep[]> = {
      'development-cycle': [
        {
          id: 'sync-main-branch',
          agent: 'developer' as const,
          action: 'sync_with_remote',
          description: 'Sync local main branch with remote to get latest changes',
          autoTrigger: false,
          template: { type: 'code', sync_before_start: true }
        },
        {
          id: 'design-requirements',
          agent: 'designer' as const,
          action: 'create_requirements',
          description: 'Define project requirements and user stories',
          dependencies: ['sync-main-branch'],
          autoTrigger: true,
          template: { type: 'requirement', priority: 'high' }
        },
        {
          id: 'implement-features',
          agent: 'developer' as const,
          action: 'implement_code',
          description: 'Implement features based on design requirements',
          dependencies: ['design-requirements'],
          autoTrigger: true,
          template: { type: 'code', create_branch: true, sync_main_before_branch: true }
        },
        {
          id: 'quality-review',
          agent: 'qa' as const,
          action: 'review_implementation',
          description: 'Review code quality, functionality, and user experience',
          dependencies: ['implement-features'],
          autoTrigger: true,
          template: { type: 'review', run_tests: true }
        },
        {
          id: 'create-pr',
          agent: 'developer' as const,
          action: 'create_pull_request',
          description: 'Sync with main and create pull request after QA approval',
          dependencies: ['quality-review'],
          autoTrigger: true,
          template: { type: 'code', action: 'pr', sync_before_pr: true }
        }
      ],
      'bug-fix': [
        {
          id: 'sync-for-bugfix',
          agent: 'developer' as const,
          action: 'sync_with_remote',
          description: 'Sync with latest main branch to ensure bug still exists',
          autoTrigger: false,
          template: { type: 'code', sync_before_start: true }
        },
        {
          id: 'reproduce-bug',
          agent: 'qa' as const,
          action: 'reproduce_and_document',
          description: 'Reproduce the bug and document steps',
          dependencies: ['sync-for-bugfix'],
          autoTrigger: true,
          template: { type: 'requirement', priority: 'high' }
        },
        {
          id: 'fix-bug',
          agent: 'developer' as const,
          action: 'implement_fix',
          description: 'Fix the identified bug',
          dependencies: ['reproduce-bug'],
          autoTrigger: true,
          template: { type: 'code', create_branch: true, branch_prefix: 'bugfix/', sync_main_before_branch: true }
        },
        {
          id: 'verify-fix',
          agent: 'qa' as const,
          action: 'verify_bug_fix',
          description: 'Verify the bug is fixed and no regressions',
          dependencies: ['fix-bug'],
          autoTrigger: true,
          template: { type: 'review', regression_test: true }
        }
      ],
      'feature-request': [
        {
          id: 'sync-before-feature',
          agent: 'developer' as const,
          action: 'sync_with_remote',
          description: 'Sync with remote main branch before feature development',
          autoTrigger: false,
          template: { type: 'code', sync_before_start: true }
        },
        {
          id: 'analyze-feature',
          agent: 'designer' as const,
          action: 'analyze_feature_request',
          description: 'Analyze feature requirements and create specifications',
          dependencies: ['sync-before-feature'],
          autoTrigger: true,
          template: { type: 'requirement' }
        },
        {
          id: 'implement-feature',
          agent: 'developer' as const,
          action: 'implement_feature',
          description: 'Implement the requested feature',
          dependencies: ['analyze-feature'],
          autoTrigger: true,
          template: { type: 'code', create_branch: true, sync_main_before_branch: true }
        },
        {
          id: 'test-feature',
          agent: 'qa' as const,
          action: 'test_feature',
          description: 'Test the new feature thoroughly',
          dependencies: ['implement-feature'],
          autoTrigger: true,
          template: { type: 'review' }
        }
      ]
    };
    
    return templates[workflowType] || [];
  }
}