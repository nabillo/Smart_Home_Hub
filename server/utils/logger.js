import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Log levels with numeric values for comparison
const LOG_LEVELS = {
  ERROR: { value: 0, label: 'ERROR' },
  WARN: { value: 1, label: 'WARN' },
  INFO: { value: 2, label: 'INFO' },
  DEBUG: { value: 3, label: 'DEBUG' },
  TRACE: { value: 4, label: 'TRACE' }
};

// ANSI color codes for console output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m'
};

// Default configuration
const DEFAULT_CONFIG = {
  level: 'INFO',
  outputs: ['console'],
  logDir: path.join(__dirname, '../../logs'),
  fileOptions: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    namePattern: 'app-%DATE%.log'
  },
  format: 'standard', // 'standard', 'json', or 'minimal'
  includeTimestamp: true,
  colorize: true,
  maskSensitiveData: true,
  sensitiveFields: ['password', 'token', 'secret', 'authorization']
};

class Logger {
  constructor(customConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.currentLevel = LOG_LEVELS[this.config.level] || LOG_LEVELS.INFO;
    
    // Create log directory if it doesn't exist and file output is enabled
    if (this.config.outputs.includes('file')) {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
    }
    
    // Initialize log files
    this.logFiles = {};
    if (this.config.outputs.includes('file')) {
      this.initLogFiles();
    }
    
    // Bind methods to this instance
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
    this.log = this.log.bind(this);
  }
  
  initLogFiles() {
    // Create a log file for each level
    Object.values(LOG_LEVELS).forEach(level => {
      const filename = this.config.fileOptions.namePattern
        .replace('%DATE%', new Date().toISOString().split('T')[0])
        .replace('%LEVEL%', level.label.toLowerCase());
      
      const filePath = path.join(this.config.logDir, filename);
      this.logFiles[level.label] = filePath;
    });
  }
  
  // Format the log message based on configuration
  formatMessage(level, message, meta = {}) {
    const timestamp = this.config.includeTimestamp 
      ? new Date().toISOString() 
      : '';
    
    // Mask sensitive data if configured
    let metaCopy = { ...meta };
    if (this.config.maskSensitiveData && meta) {
      metaCopy = this.maskSensitiveData(metaCopy);
    }
    
    switch (this.config.format) {
      case 'json':
        return JSON.stringify({
          timestamp,
          level: level.label,
          message,
          ...metaCopy
        });
      
      case 'minimal':
        return `[${level.label}] ${message}`;
      
      case 'standard':
      default:
        const metaStr = Object.keys(metaCopy).length 
          ? ` ${JSON.stringify(metaCopy)}` 
          : '';
        
        return `${timestamp ? `[${timestamp}] ` : ''}[${level.label}] ${message}${metaStr}`;
    }
  }
  
  // Mask sensitive data in objects
  maskSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = { ...obj };
    
    for (const key in result) {
      if (this.config.sensitiveFields.includes(key.toLowerCase())) {
        result[key] = '********';
      } else if (typeof result[key] === 'object') {
        result[key] = this.maskSensitiveData(result[key]);
      }
    }
    
    return result;
  }
  
  // Get color for log level
  getColorForLevel(level) {
    switch (level.label) {
      case 'ERROR': return COLORS.RED;
      case 'WARN': return COLORS.YELLOW;
      case 'INFO': return COLORS.GREEN;
      case 'DEBUG': return COLORS.BLUE;
      case 'TRACE': return COLORS.GRAY;
      default: return COLORS.RESET;
    }
  }
  
  // Write to console with colors if enabled
  writeToConsole(level, formattedMessage) {
    if (this.config.colorize) {
      const color = this.getColorForLevel(level);
      console.log(`${color}${formattedMessage}${COLORS.RESET}`);
    } else {
      console.log(formattedMessage);
    }
  }
  
  // Write to log file
  writeToFile(level, formattedMessage) {
    const filePath = this.logFiles[level.label];
    
    // Append to file with newline
    fs.appendFile(filePath, formattedMessage + '\n', (err) => {
      if (err) {
        console.error(`Failed to write to log file: ${err.message}`);
      }
    });
    
    // Check file size and rotate if needed
    this.checkAndRotateLogFile(filePath, level);
  }
  
  // Check file size and rotate if needed
  checkAndRotateLogFile(filePath, level) {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.size >= this.config.fileOptions.maxSize) {
        this.rotateLogFile(filePath, level);
      }
    } catch (err) {
      // File might not exist yet, ignore
    }
  }
  
  // Rotate log file
  rotateLogFile(filePath, level) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    
    // Find existing rotated files
    const files = fs.readdirSync(dir)
      .filter(file => file.startsWith(base) && file !== path.basename(filePath))
      .sort();
    
    // Remove oldest files if we have too many
    while (files.length >= this.config.fileOptions.maxFiles - 1) {
      fs.unlinkSync(path.join(dir, files.shift()));
    }
    
    // Rotate current file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newPath = path.join(dir, `${base}.${timestamp}${ext}`);
    fs.renameSync(filePath, newPath);
    
    // Create new empty file
    fs.writeFileSync(filePath, '');
    
    // Log rotation event
    const rotationMessage = this.formatMessage(
      LOG_LEVELS.INFO, 
      `Log file rotated to ${newPath}`
    );
    this.writeToConsole(LOG_LEVELS.INFO, rotationMessage);
    this.writeToFile(LOG_LEVELS.INFO, rotationMessage);
  }
  
  // Main logging method
  log(level, message, meta = {}) {
    // Skip if log level is higher than current level
    if (level.value > this.currentLevel.value) {
      return;
    }
    
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Output to configured destinations
    if (this.config.outputs.includes('console')) {
      this.writeToConsole(level, formattedMessage);
    }
    
    if (this.config.outputs.includes('file')) {
      this.writeToFile(level, formattedMessage);
    }
  }
  
  // Convenience methods for different log levels
  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }
  
  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }
  
  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }
  
  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }
  
  trace(message, meta = {}) {
    this.log(LOG_LEVELS.TRACE, message, meta);
  }
  
  // Create a child logger with additional context
  child(context) {
    const childLogger = new Logger(this.config);
    
    // Override log method to include context
    childLogger.log = (level, message, meta = {}) => {
      this.log(level, message, { ...context, ...meta });
    };
    
    return childLogger;
  }
  
  // Change log level dynamically
  setLevel(level) {
    if (LOG_LEVELS[level]) {
      this.currentLevel = LOG_LEVELS[level];
      this.info(`Log level changed to ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }
  
  // Add a custom output destination
  addOutput(output) {
    if (!this.config.outputs.includes(output)) {
      this.config.outputs.push(output);
      
      if (output === 'file' && !fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
        this.initLogFiles();
      }
      
      this.info(`Added log output: ${output}`);
    }
  }
  
  // Remove an output destination
  removeOutput(output) {
    const index = this.config.outputs.indexOf(output);
    if (index !== -1) {
      this.config.outputs.splice(index, 1);
      this.info(`Removed log output: ${output}`);
    }
  }
  
  // Get current logger configuration
  getConfig() {
    return { ...this.config };
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export logger class and default instance
export { Logger, LOG_LEVELS, defaultLogger };
export default defaultLogger;
