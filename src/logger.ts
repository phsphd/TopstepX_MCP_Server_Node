/**
 * Logger utility for TopstepX MCP Server
 */

export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

const LOG_LEVEL = process.env.LOG_LEVEL ? 
  LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] || LOG_LEVELS.INFO : 
  LOG_LEVELS.INFO;

function formatMessage(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  let output = `[${timestamp}] [${level}] ${message}`;
  
  if (data !== undefined) {
    if (typeof data === 'object') {
      try {
        output += ` ${JSON.stringify(data, null, 2)}`;
      } catch {
        output += ` [Circular or unserializable data]`;
      }
    } else {
      output += ` ${data}`;
    }
  }
  
  return output;
}

export function debug(message: string, data?: any): void {
  if (LOG_LEVEL <= LOG_LEVELS.DEBUG) {
    console.error(formatMessage('DEBUG', message, data));
  }
}

export function info(message: string, data?: any): void {
  if (LOG_LEVEL <= LOG_LEVELS.INFO) {
    console.error(formatMessage('INFO', message, data));
  }
}

export function warn(message: string, data?: any): void {
  if (LOG_LEVEL <= LOG_LEVELS.WARN) {
    console.error(formatMessage('WARN', message, data));
  }
}

export function error(message: string, data?: any): void {
  if (LOG_LEVEL <= LOG_LEVELS.ERROR) {
    console.error(formatMessage('ERROR', message, data));
  }
}