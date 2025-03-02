import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Available logger configurations
const loggerConfigs = {
  // Development configuration
  development: {
    level: 'DEBUG',
    outputs: ['console'],
    format: 'standard',
    colorize: true,
    includeTimestamp: true,
    maskSensitiveData: true
  },
  
  // Production configuration
  production: {
    level: 'INFO',
    outputs: ['console', 'file'],
    logDir: path.join(__dirname, '../../logs'),
    fileOptions: {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      namePattern: 'app-%DATE%.log'
    },
    format: 'json',
    colorize: false,
    includeTimestamp: true,
    maskSensitiveData: true
  },
  
  // Minimal configuration (less verbose)
  minimal: {
    level: 'WARN',
    outputs: ['console'],
    format: 'minimal',
    colorize: true,
    includeTimestamp: false
  },
  
  // Debug configuration (very verbose)
  debug: {
    level: 'TRACE',
    outputs: ['console', 'file'],
    logDir: path.join(__dirname, '../../logs'),
    fileOptions: {
      maxSize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
      namePattern: 'debug-%DATE%.log'
    },
    format: 'standard',
    colorize: true,
    includeTimestamp: true,
    maskSensitiveData: false
  },
  
  // Security-focused configuration
  security: {
    level: 'INFO',
    outputs: ['console', 'file'],
    logDir: path.join(__dirname, '../../logs/security'),
    fileOptions: {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 30,
      namePattern: 'security-%DATE%.log'
    },
    format: 'json',
    colorize: false,
    includeTimestamp: true,
    maskSensitiveData: true,
    sensitiveFields: [
      'password', 'token', 'secret', 'authorization',
      'creditCard', 'ssn', 'email', 'phone', 'address'
    ]
  }
};

// Determine which configuration to use based on environment
const getLoggerConfig = (configName = process.env.NODE_ENV || 'development') => {
  return loggerConfigs[configName] || loggerConfigs.development;
};

export { loggerConfigs, getLoggerConfig };
export default getLoggerConfig();
