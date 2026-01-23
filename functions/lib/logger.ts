/**
 * Server-side Logger per Cloudflare Workers
 * 
 * Logging strutturato per le API backend.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  clientId?: number;
  userId?: number;
  path?: string;
  method?: string;
  status?: number;
  duration?: number;
  context?: Record<string, any>;
  error?: string;
  stack?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level (can be configured via env)
const MIN_LEVEL: LogLevel = 'info';

/**
 * Format log entry as JSON for structured logging
 */
function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: Partial<LogEntry>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const formatted = formatLog(entry);
  
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Server Logger API
 */
export const serverLogger = {
  debug: (message: string, context?: Partial<LogEntry>) => log('debug', message, context),
  info: (message: string, context?: Partial<LogEntry>) => log('info', message, context),
  warn: (message: string, context?: Partial<LogEntry>) => log('warn', message, context),
  error: (message: string, error?: Error, context?: Partial<LogEntry>) => {
    log('error', message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });
  },
  
  /**
   * Log incoming request
   */
  request: (method: string, path: string, requestId: string, clientId?: number, userId?: number) => {
    log('info', `Incoming request: ${method} ${path}`, {
      requestId,
      method,
      path,
      clientId,
      userId,
    });
  },
  
  /**
   * Log response
   */
  response: (method: string, path: string, status: number, duration: number, requestId: string) => {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    log(level, `Response: ${method} ${path} ${status} (${duration}ms)`, {
      requestId,
      method,
      path,
      status,
      duration,
    });
  },
  
  /**
   * Log database query
   */
  dbQuery: (operation: string, table: string, duration?: number, requestId?: string) => {
    log('debug', `DB: ${operation} on ${table}`, {
      requestId,
      duration,
      context: { operation, table },
    });
  },
  
  /**
   * Log authentication event
   */
  auth: (event: string, userId?: number, clientId?: number, requestId?: string) => {
    log('info', `Auth: ${event}`, {
      requestId,
      userId,
      clientId,
    });
  },
  
  /**
   * Log email operation
   */
  email: (operation: string, recipient: string, success: boolean, requestId?: string, error?: string) => {
    if (success) {
      log('info', `Email: ${operation} to ${recipient}`, { requestId });
    } else {
      log('error', `Email failed: ${operation} to ${recipient}`, {
        requestId,
        error,
      });
    }
  },
  
  /**
   * Log security event
   */
  security: (event: string, details: Record<string, any>, requestId?: string) => {
    log('warn', `Security: ${event}`, {
      requestId,
      context: details,
    });
  },
};

/**
 * Request timing helper
 */
export function createRequestTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}

export default serverLogger;
