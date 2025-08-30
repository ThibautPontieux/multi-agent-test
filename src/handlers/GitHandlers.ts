import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logService } from '../services/LogService.js';

export interface GitResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  clean: boolean;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
}

export class GitHandlers {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    
    // Ensure workspace directory exists
    if (!existsSync(this.workspaceDir)) {
      mkdirSync(this.workspaceDir, { recursive: true });
    }

    logService.info('git-handlers', `GitHandlers initialized with workspace: ${workspaceDir}`);
  }

  /**
   * Execute git command safely
   */
  private executeGitCommand(command: string, projectPath?: string): GitResult {
    try {
      const workDir = projectPath ? join(this.workspaceDir, projectPath) : this.workspaceDir;
      
      logService.debug('git-handlers', `Executing: git ${command}`, { workDir });

      const output = execSync(`git ${command}`, {
        cwd: workDir,
        encoding: 'utf8',
        timeout: 30000, // 30 second timeout
        stdio: 'pipe'
      });

      return {
        success: true,
        message: output.trim(),
        data: output.trim()
      };
    } catch (error: any) {
      const errorMessage = error.stderr?.toString() || error.message || 'Unknown git error';
      
      logService.error('git-handlers', `Git command failed: git ${command}`, {
        error: errorMessage,
        exitCode: error.status
      });

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Initialize git repository
   */
  gitInit(projectPath?: string): GitResult {
    const result = this.executeGitCommand('init', projectPath);
    
    if (result.success) {
      // Set up initial configuration
      this.executeGitCommand('config user.name "AI Developer"', projectPath);
      this.executeGitCommand('config user.email "ai-dev@mcp-system.local"', projectPath);
      
      logService.info('git-handlers', 'Git repository initialized');
    }

    return result;
  }

  /**
   * Clone repository
   */
  gitClone(url: string, projectName?: string): GitResult {
    const cloneCommand = projectName ? `clone ${url} ${projectName}` : `clone ${url}`;
    const result = this.executeGitCommand(cloneCommand);
    
    if (result.success) {
      logService.info('git-handlers', `Repository cloned: ${url}`, { projectName });
    }

    return result;
  }

  /**
   * Get git status
   */
  gitStatus(projectPath?: string): GitResult {
    const result = this.executeGitCommand('status --porcelain -b', projectPath);
    
    if (!result.success) {
      return result;
    }

    try {
      const lines = result.data.split('\n').filter(line => line.trim());
      const branchLine = lines[0] || '';
      
      // Parse branch info
      let branch = 'main';
      let ahead = 0;
      let behind = 0;
      
      if (branchLine.startsWith('## ')) {
        const branchInfo = branchLine.substring(3);
        if (branchInfo.includes('...')) {
          const [localBranch, trackingInfo] = branchInfo.split('...');
          branch = localBranch;
          
          const aheadMatch = trackingInfo.match(/ahead (\d+)/);
          const behindMatch = trackingInfo.match(/behind (\d+)/);
          
          if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
          if (behindMatch) behind = parseInt(behindMatch[1], 10);
        } else {
          branch = branchInfo;
        }
      }

      // Parse file changes
      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];

      lines.slice(1).forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        }
        if (status[1] !== ' ') {
          if (status[1] === '?') {
            untracked.push(file);
          } else {
            unstaged.push(file);
          }
        }
      });

      const gitStatus: GitStatus = {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0
      };

      return {
        success: true,
        message: `On branch ${branch}`,
        data: gitStatus
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to parse git status: ${error.message}`
      };
    }
  }

  /**
   * Create and checkout new branch
   */
  gitCreateBranch(branchName: string, projectPath?: string): GitResult {
    const result = this.executeGitCommand(`checkout -b ${branchName}`, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Branch created and checked out: ${branchName}`);
    }

    return result;
  }

  /**
   * Checkout existing branch
   */
  gitCheckout(branchName: string, projectPath?: string): GitResult {
    const result = this.executeGitCommand(`checkout ${branchName}`, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Checked out branch: ${branchName}`);
    }

    return result;
  }

  /**
   * Add files to staging area
   */
  gitAdd(files: string | string[], projectPath?: string): GitResult {
    const fileList = Array.isArray(files) ? files.join(' ') : files;
    const result = this.executeGitCommand(`add ${fileList}`, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Files added to staging: ${fileList}`);
    }

    return result;
  }

  /**
   * Commit changes
   */
  gitCommit(message: string, projectPath?: string): GitResult {
    // First add all changes
    this.gitAdd('.', projectPath);
    
    const escapedMessage = message.replace(/"/g, '\\"');
    const result = this.executeGitCommand(`commit -m "${escapedMessage}"`, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Changes committed: ${message}`);
    }

    return result;
  }

  /**
   * Push changes to remote
   */
  gitPush(branch?: string, projectPath?: string): GitResult {
    const pushCommand = branch ? `push origin ${branch}` : 'push';
    const result = this.executeGitCommand(pushCommand, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Changes pushed to remote`, { branch });
    }

    return result;
  }

  /**
   * Pull changes from remote
   */
  gitPull(branch?: string, projectPath?: string): GitResult {
    // Check for uncommitted changes first
    const status = this.gitStatus(projectPath);
    if (status.success && status.data && !status.data.clean) {
      return {
        success: false,
        message: 'Cannot pull with uncommitted changes. Please commit or stash your changes first.'
      };
    }

    const pullCommand = branch ? `pull origin ${branch}` : 'pull';
    const result = this.executeGitCommand(pullCommand, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Changes pulled from remote`, { branch });
    }

    return result;
  }

  /**
   * Fetch changes from remote
   */
  gitFetch(projectPath?: string): GitResult {
    const result = this.executeGitCommand('fetch', projectPath);
    
    if (result.success) {
      logService.info('git-handlers', 'Fetched changes from remote');
    }

    return result;
  }

  /**
   * Merge branch
   */
  gitMerge(sourceBranch: string, projectPath?: string): GitResult {
    const result = this.executeGitCommand(`merge ${sourceBranch}`, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Merged branch: ${sourceBranch}`);
    } else if (result.message.includes('conflict')) {
      const conflictFiles = this.getConflictFiles(projectPath);
      return {
        success: false,
        message: `Merge conflict detected. Resolve conflicts in: ${conflictFiles.join(', ')}`,
        data: { conflictFiles }
      };
    }

    return result;
  }

  /**
   * Get conflict files
   */
  private getConflictFiles(projectPath?: string): string[] {
    const result = this.executeGitCommand('diff --name-only --diff-filter=U', projectPath);
    
    if (result.success && result.data) {
      return result.data.split('\n').filter(file => file.trim());
    }

    return [];
  }

  /**
   * List all branches
   */
  gitListBranches(includeRemote: boolean = true, projectPath?: string): GitResult {
    const command = includeRemote ? 'branch -a' : 'branch';
    const result = this.executeGitCommand(command, projectPath);
    
    if (!result.success) {
      return result;
    }

    try {
      const branches: GitBranch[] = result.data
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('remotes/origin/HEAD'))
        .map(line => {
          const current = line.startsWith('*');
          const name = line.replace('*', '').trim();
          const remote = name.startsWith('remotes/origin/') ? name.replace('remotes/origin/', '') : undefined;
          
          return {
            name: remote || name,
            current,
            remote: remote ? 'origin' : undefined
          };
        });

      return {
        success: true,
        message: `Found ${branches.length} branches`,
        data: branches
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to parse branch list: ${error.message}`
      };
    }
  }

  /**
   * Get current branch name
   */
  getCurrentBranch(projectPath?: string): GitResult {
    const result = this.executeGitCommand('branch --show-current', projectPath);
    
    if (result.success) {
      logService.debug('git-handlers', `Current branch: ${result.data}`);
    }

    return result;
  }

  /**
   * Check if repository exists and is valid
   */
  isGitRepository(projectPath?: string): boolean {
    try {
      const workDir = projectPath ? join(this.workspaceDir, projectPath) : this.workspaceDir;
      const gitDir = join(workDir, '.git');
      return existsSync(gitDir);
    } catch {
      return false;
    }
  }

  /**
   * Get remote URL
   */
  getRemoteUrl(projectPath?: string): GitResult {
    const result = this.executeGitCommand('config --get remote.origin.url', projectPath);
    
    if (result.success) {
      logService.debug('git-handlers', `Remote URL: ${result.data}`);
    }

    return result;
  }

  /**
   * Set remote URL
   */
  setRemoteUrl(url: string, projectPath?: string): GitResult {
    const result = this.executeGitCommand(`remote set-url origin ${url}`, projectPath);
    
    if (result.success) {
      logService.info('git-handlers', `Remote URL set: ${url}`);
    }

    return result;
  }
}
