import logger from '../utils/logger.js';

// Performance logger middleware
export const performanceLogger = (req, res, next) => {
  // Skip for health check endpoints to avoid noise
  if (req.path === '/health') {
    return next();
  }
  
  // Get request start time
  const start = process.hrtime();
  
  // Log when response is finished
  res.on('finish', () => {
    const end = process.hrtime(start);
    const duration = Math.round((end[0] * 1000) + (end[1] / 1000000));
    
    // Only log slow requests (over 1000ms)
    if (duration > 1000) {
      const requestLogger = req.logger || logger;
      
      requestLogger.warn(`Slow request detected: ${req.method} ${req.originalUrl || req.url}`, {
        duration: `${duration}ms`,
        threshold: '1000ms',
        method: req.method,
        url: req.originalUrl || req.url,
        requestId: req.requestId
      });
    }
  });
  
  next();
};
