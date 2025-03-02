import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Request logger middleware
export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // Get request start time
  const startTime = Date.now();
  
  // Create request-specific logger
  const requestLogger = logger.child({ requestId });
  req.logger = requestLogger;
  
  // Log request details
  const requestInfo = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer || req.headers.referrer
  };
  
  // Add user info if authenticated
  if (req.user) {
    requestInfo.userId = req.user.id;
    requestInfo.username = req.user.username;
    requestInfo.role = req.user.role;
  }
  
  requestLogger.info(`Request received: ${req.method} ${req.originalUrl || req.url}`, requestInfo);
  
  // Log request body for non-GET requests (excluding sensitive routes)
  if (req.method !== 'GET' && !req.originalUrl.includes('/auth/login')) {
    requestLogger.debug('Request body:', { body: req.body });
  }
  
  // Capture response data
  const originalSend = res.send;
  res.send = function(body) {
    res.responseBody = body;
    return originalSend.apply(res, arguments);
  };
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const responseInfo = {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };
    
    // Determine log level based on status code
    let logLevel = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    }
    
    // Log response details
    requestLogger[logLevel](
      `Request completed: ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms)`,
      responseInfo
    );
    
    // Log response body for errors (excluding sensitive data)
    if (res.statusCode >= 400 && res.responseBody) {
      try {
        let responseBody = res.responseBody;
        if (typeof responseBody === 'string') {
          responseBody = JSON.parse(responseBody);
        }
        requestLogger.debug('Response body:', { body: responseBody });
      } catch (err) {
        // If we can't parse the response body, just log it as is
        requestLogger.debug('Response body:', { body: String(res.responseBody).substring(0, 500) });
      }
    }
  });
  
  next();
};

// Error logger middleware
export const errorLogger = (err, req, res, next) => {
  const logger = req.logger || logger;
  
  // Log error details
  logger.error(`Error processing request: ${err.message}`, {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    },
    request: {
      method: req.method,
      url: req.originalUrl || req.url,
      requestId: req.requestId
    }
  });
  
  // Pass to next error handler
  next(err);
};
