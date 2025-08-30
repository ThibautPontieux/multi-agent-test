// handlers/FileHandlers.ts - Handlers pour les opérations de fichiers

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { MCPResponse } from '../types/index.js';
import { LogService } from '../services/LogService.js';

export class FileHandlers {
  constructor(
    private workspaceDir: string,
    private logService: LogService
  ) {}

  async handleWriteFile(args: any): Promise<MCPResponse> {
    const fullPath = join(this.workspaceDir, args.path);
    const dir = dirname(fullPath);
    
    if (dir !== this.workspaceDir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, args.content);
    
    await this.logService.logMessage(args.agent, `Wrote file: ${args.path}`);

    return {
      content: [{
        type: 'text',
        text: `File written successfully: ${args.path}`
      }]
    };
  }

  async handleReadFile(args: any): Promise<MCPResponse> {
    const fullPath = join(this.workspaceDir, args.path);
    
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const content = readFileSync(fullPath, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }
}

// handlers/GitHandlers.ts - Handlers pour les opérations Git
import { execSync } from 'child_process';

export class GitHandlers {
  constructor(
    private workspaceDir: string,
    private logService: LogService
  ) {}

  private getProjectPath(args: any): string {
    return args.projectPath ? join(this.workspaceDir, args.projectPath) : this.workspaceDir;
  }

  async handleGitInit(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      execSync('git init', { cwd: projectPath });
      execSync('git config user.name "Multi-Agent System"', { cwd: projectPath });
      execSync('git config user.email "agents@example.com"', { cwd: projectPath });
      
      await this.logService.logMessage(args.agent, 'Initialized git repository');

      return {
        content: [{
          type: 'text',
          text: 'Git repository initialized successfully'
        }]
      };
    } catch (error) {
      throw new Error(`Git init failed: ${error}`);
    }
  }

  async handleGitClone(args: any): Promise<MCPResponse> {
    try {
      const projectName = args.projectName || args.url.split('/').pop()?.replace('.git', '') || 'cloned-repo';
      execSync(`git clone ${args.url} ${projectName}`, { cwd: this.workspaceDir });
      
      await this.logService.logMessage(args.agent, `Cloned repository ${args.url} to ${projectName}`);

      return {
        content: [{
          type: 'text',
          text: `Repository cloned successfully to ${projectName}`
        }]
      };
    } catch (error) {
      throw new Error(`Git clone failed: ${error}`);
    }
  }

  async handleGitCommit(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      execSync('git add .', { cwd: projectPath });
      execSync(`git commit -m "${args.message}"`, { cwd: projectPath });
      
      await this.logService.logMessage(args.agent, `Committed changes: ${args.message}`);

      return {
        content: [{
          type: 'text',
          text: `Changes committed: ${args.message}`
        }]
      };
    } catch (error) {
      throw new Error(`Git commit failed: ${error}`);
    }
  }

  async handleGitPush(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      
      if (args.branch) {
        execSync(`git push origin ${args.branch}`, { cwd: projectPath });
      } else {
        execSync('git push', { cwd: projectPath });
      }
      
      await this.logService.logMessage(args.agent, 'Pushed changes to remote repository');

      return {
        content: [{
          type: 'text',
          text: 'Changes pushed to remote repository successfully'
        }]
      };
    } catch (error) {
      throw new Error(`Git push failed: ${error}`);
    }
  }

  async handleGitPull(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      
      // Vérifier les modifications non committées
      const status = execSync('git status --porcelain', { 
        cwd: projectPath,
        encoding: 'utf-8'
      });
      
      if (status.trim()) {
        throw new Error('Cannot pull with uncommitted changes. Please commit or stash changes first.');
      }
      
      const pullResult = execSync('git pull', { 
        cwd: projectPath,
        encoding: 'utf-8'
      });
      
      await this.logService.logMessage(args.agent, 'Pulled latest changes from remote repository');

      return {
        content: [{
          type: 'text',
          text: `Pull completed:\n${pullResult}`
        }]
      };
    } catch (error) {
      throw new Error(`Git pull failed: ${error}`);
    }
  }

  async handleGitStatus(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      const status = execSync('git status --porcelain', { 
        cwd: projectPath,
        encoding: 'utf-8'
      });

      return {
        content: [{
          type: 'text',
          text: status || 'Working directory clean'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: 'No git repository found'
        }]
      };
    }
  }

  async handleGitCreateBranch(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      execSync(`git checkout -b ${args.branchName}`, { cwd: projectPath });
      
      await this.logService.logMessage(args.agent, `Created and checked out branch: ${args.branchName}`);

      return {
        content: [{
          type: 'text',
          text: `Branch ${args.branchName} created and checked out`
        }]
      };
    } catch (error) {
      throw new Error(`Git create branch failed: ${error}`);
    }
  }

  async handleGitCheckout(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      const localBranches = execSync('git branch --list', { 
        cwd: projectPath,
        encoding: 'utf-8'
      });
      
      const branchExists = localBranches.includes(args.branchName);
      
      if (!branchExists) {
        try {
          execSync(`git checkout -b ${args.branchName} origin/${args.branchName}`, { cwd: projectPath });
        } catch {
          execSync(`git checkout ${args.branchName}`, { cwd: projectPath });
        }
      } else {
        execSync(`git checkout ${args.branchName}`, { cwd: projectPath });
      }
      
      await this.logService.logMessage(args.agent, `Switched to branch: ${args.branchName}`);

      return {
        content: [{
          type: 'text',
          text: `Switched to branch: ${args.branchName}`
        }]
      };
    } catch (error) {
      throw new Error(`Git checkout failed: ${error}`);
    }
  }

  async handleCreatePullRequest(args: any): Promise<MCPResponse> {
    try {
      const projectPath = this.getProjectPath(args);
      const remoteUrl = execSync('git config --get remote.origin.url', { 
        cwd: projectPath, 
        encoding: 'utf-8' 
      }).trim();
      
      const repoMatch = remoteUrl.match(/github\.com[\/:](.+?)\/(.+?)(?:\.git)?$/);
      if (!repoMatch) {
        throw new Error('Not a GitHub repository or remote not found');
      }
      
      const [, owner, repo] = repoMatch;
      const ghToken = process.env.GITHUB_TOKEN;
      
      if (!ghToken) {
        throw new Error('GITHUB_TOKEN environment variable not set. Please set it in your MCP config.');
      }
      
      const prData = {
        title: args.title,
        body: args.body,
        head: args.head,
        base: args.base
      };
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${error}`);
      }
      
      const pullRequest = await response.json() as any;
      
      await this.logService.logMessage(args.agent, `Created pull request: ${args.title} (#${pullRequest.number})`);

      return {
        content: [{
          type: 'text',
          text: `Pull request created successfully!\nTitle: ${args.title}\nNumber: #${pullRequest.number}\nURL: ${pullRequest.html_url}`
        }]
      };
    } catch (error) {
      throw new Error(`Create PR failed: ${error}`);
    }
  }
}