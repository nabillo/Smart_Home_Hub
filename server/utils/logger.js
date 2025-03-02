import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Get log level from environment or default to 'info'
const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
  return LOG_LEVELS[envLevel] !== undefined ? envLevel : 'info';
};

// Current log level
const currentLogLevel = getLogLevel();

// Format timestamp
const timestamp = () => {
  return new Date().toISOString();
};

// Format log message
const formatMessage = (level, message, meta = {}) => {
  return JSON.stringify({
    timestamp: timestamp(),
    level,
    message,
    ...meta,
  });
};

// Write log to file
const writeToFile = (message) => {
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `${date}.log`);
  
  fs.appendFile(logFile, message + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
};

// Logger function
const log = (level, message, meta = {}) => {
  if (LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel]) {
    const formattedMessage = formatMessage(level, message, meta);
    
    // Output to console
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](formattedMessage);
    
    // Write to file
    writeToFile(formattedMessage);
    
    return true;
  }
  return false;
};

// Logger object with methods for each log level
const logger = {
  error: (message, meta = {}) => log('error', message, meta),
  warn: (message, meta = {}) => log('warn', message, meta),
  info: (message, meta = {}) => log('info', message, meta),
  http: (message, meta = {}) => log('http', message, meta),
  debug: (message, meta = {}) => log('debug', message, meta),
};

export default logger;
