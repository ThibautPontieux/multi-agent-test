/**
 * Logging service for the MCP Multi-Agent System
 */

export interface LogEntry {
  timestamp: Date;
  agent: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export class LogService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  /**
   * Log an informational message
   */
  info(agent: string, message: string, data?: any): void {
    this.addLog('info', agent, message, data);
  }

  /**
   * Log a warning message
   */
  warn(agent: string, message: string, data?: any): void {
    this.addLog('warn', agent, message, data);
  }

  /**
   * Log an error message
   */
  error(agent: string, message: string, data?: any): void {
    this.addLog('error', agent, message, data);
  }

  /**
   * Log a debug message
   */
  debug(agent: string, message: string, data?: any): void {
    this.addLog('debug', agent, message, data);
  }

  /**
   * Add a log entry
   */
  private addLog(level: LogEntry['level'], agent: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      agent,
      level,
      message,
      data
    };

    this.logs.push(entry);

    // Keep only the last N logs to prevent memory leaks
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for immediate visibility
    const timestamp = entry.timestamp.toISOString();
    const logMessage = `[${timestamp}] ${agent.toUpperCase()} ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'debug':
        console.debug(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(limit: number = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs for specific agent
   */
  getAgentLogs(agent: string, limit: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.agent === agent)
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// Singleton instance
export const logService = new LogService();
