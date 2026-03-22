type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  path?: string;
  method?: string;
  email?: string;
  statusCode?: number;
  reason?: string;
  detail?: string;
  service?: string;
  durationMs?: number;
  error?: string;
}

function writeLog(level: LogLevel, event: string, context: LogContext = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...context,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, context?: LogContext): void {
  writeLog('info', event, context);
}

export function logWarn(event: string, context?: LogContext): void {
  writeLog('warn', event, context);
}

export function logError(event: string, context?: LogContext): void {
  writeLog('error', event, context);
}