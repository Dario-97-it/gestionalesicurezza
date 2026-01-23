/**
 * Sistema di Logging Strutturato per SecurityTools
 * 
 * Fornisce logging consistente con livelli, timestamp e contesto.
 * In produzione, può essere integrato con servizi esterni come Sentry.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default configuration
let config: LoggerConfig = {
  minLevel: import.meta.env.PROD ? 'info' : 'debug',
  enableConsole: true,
  enableRemote: import.meta.env.PROD,
  remoteEndpoint: undefined,
};

// Log buffer for batch sending
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Configure the logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>) {
  config = { ...config, ...newConfig };
}

/**
 * Format log entry for console output
 */
function formatForConsole(entry: LogEntry): string {
  const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
  const errorStr = entry.error ? ` | Error: ${entry.error.message}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${errorStr}`;
}

/**
 * Send logs to remote endpoint (if configured)
 */
async function sendToRemote(entries: LogEntry[]) {
  if (!config.enableRemote || !config.remoteEndpoint) return;

  try {
    await fetch(config.remoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: entries }),
    });
  } catch (err) {
    // Silently fail to avoid infinite loops
    console.error('Failed to send logs to remote:', err);
  }
}

/**
 * Flush the log buffer
 */
export function flushLogs() {
  if (logBuffer.length === 0) return;
  
  const entries = [...logBuffer];
  logBuffer.length = 0;
  sendToRemote(entries);
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
  if (LOG_LEVELS[level] < LOG_LEVELS[config.minLevel]) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    error,
  };

  // Console output
  if (config.enableConsole) {
    const formatted = formatForConsole(entry);
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
        console.error(formatted, error);
        break;
    }
  }

  // Buffer for remote sending
  if (config.enableRemote) {
    logBuffer.push(entry);
    if (logBuffer.length >= MAX_BUFFER_SIZE) {
      flushLogs();
    }
  }
}

/**
 * Logger API
 */
export const logger = {
  debug: (message: string, context?: Record<string, any>) => log('debug', message, context),
  info: (message: string, context?: Record<string, any>) => log('info', message, context),
  warn: (message: string, context?: Record<string, any>) => log('warn', message, context),
  error: (message: string, error?: Error, context?: Record<string, any>) => log('error', message, context, error),
  
  /**
   * Log API request
   */
  apiRequest: (method: string, url: string, status?: number, duration?: number) => {
    log('info', `API ${method} ${url}`, { status, duration });
  },
  
  /**
   * Log user action
   */
  userAction: (action: string, details?: Record<string, any>) => {
    log('info', `User action: ${action}`, details);
  },
  
  /**
   * Log page view
   */
  pageView: (path: string) => {
    log('info', `Page view: ${path}`, { path });
  },
  
  /**
   * Log performance metric
   */
  performance: (metric: string, value: number, unit: string = 'ms') => {
    log('debug', `Performance: ${metric}`, { value, unit });
  },
  
  /**
   * Log authentication event
   */
  auth: (event: 'login' | 'logout' | 'refresh' | 'error', userId?: number) => {
    log('info', `Auth: ${event}`, { userId });
  },
  
  /**
   * Log database operation
   */
  db: (operation: string, table: string, recordId?: number, duration?: number) => {
    log('debug', `DB ${operation} on ${table}`, { recordId, duration });
  },
  
  /**
   * Log email operation
   */
  email: (operation: 'send' | 'fail', recipient: string, subject?: string, error?: string) => {
    if (operation === 'fail') {
      log('error', `Email failed to ${recipient}`, { subject, error });
    } else {
      log('info', `Email sent to ${recipient}`, { subject });
    }
  },
};

// Flush logs on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushLogs);
  
  // Periodic flush every 30 seconds
  setInterval(flushLogs, 30000);
}

export default logger;
