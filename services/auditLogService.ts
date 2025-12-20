
import { AuditEntry } from '../types';

class AuditLogService {
  private logs: AuditEntry[] = [];
  private readonly MAX_LOGS = 5000;

  public log(source: string, type: AuditEntry['type'], message: string, user: string = 'SYSTEM', payload?: any) {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      source,
      user,
      type,
      message,
      payload
    };

    this.logs.push(entry);
    
    // Keep internal buffer clean
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Persist critical events
    if (type === 'TRADE' || type === 'RISK' || type === 'COMMAND') {
      console.warn(`[AUDIT] [${type}] [USER: ${user}] ${message}`, payload);
    }
  }

  public getLogs(): AuditEntry[] {
    return this.logs;
  }
}

export default new AuditLogService();
