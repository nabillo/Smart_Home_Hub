import express from 'express';
import { auth } from '../middleware/auth.js';
import LogAnalyzer from '../utils/logAnalyzer.js';
import logger, { LOG_LEVELS } from '../utils/logger.js';
import { getLoggerConfig, loggerConfigs } from '../config/logger.config.js';

const router = express.Router();
const logAnalyzer = new LogAnalyzer();

// Get logger configuration
router.get('/config', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      currentConfig: logger.getConfig(),
      availableConfigs: loggerConfigs
    });
  } catch (error) {
    req.logger.error('Error getting logger config', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update logger configuration
router.post('/config', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { configName, customConfig } = req.body;
    
    if (configName && loggerConfigs[configName]) {
      // Use predefined config
      Object.assign(logger, new logger.constructor(loggerConfigs[configName]));
      req.logger.info(`Logger configuration changed to ${configName}`);
      
      return res.json({ 
        message: `Logger configuration changed to ${configName}`,
        config: logger.getConfig()
      });
    } else if (customConfig) {
      // Use custom config
      Object.assign(logger, new logger.constructor(customConfig));
      req.logger.info('Logger configuration updated with custom settings');
      
      return res.json({ 
        message: 'Logger configuration updated with custom settings',
        config: logger.getConfig()
      });
    } else {
      return res.status(400).json({ error: 'Invalid configuration' });
    }
  } catch (error) {
    req.logger.error('Error updating logger config', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Change log level
router.post('/level', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { level } = req.body;
    
    if (!level || !LOG_LEVELS[level]) {
      return res.status(400).json({ 
        error: 'Invalid log level',
        validLevels: Object.keys(LOG_LEVELS)
      });
    }
    
    logger.setLevel(level);
    req.logger.info(`Log level changed to ${level}`);
    
    res.json({ 
      message: `Log level changed to ${level}`,
      currentLevel: level
    });
  } catch (error) {
    req.logger.error('Error changing log level', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Search logs
router.get('/search', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { 
      query, 
      maxResults = 100,
      startDate,
      endDate,
      level,
      caseSensitive
    } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await logAnalyzer.searchLogs(query, {
      maxResults: parseInt(maxResults),
      startDate,
      endDate,
      level,
      caseSensitive: caseSensitive === 'true'
    });
    
    res.json({
      query,
      count: results.length,
      results
    });
  } catch (error) {
    req.logger.error('Error searching logs', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get error statistics
router.get('/errors/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const days = parseInt(req.query.days || 7);
    const stats = await logAnalyzer.getErrorStats(days);
    
    res.json({
      period: `Last ${days} days`,
      stats
    });
  } catch (error) {
    req.logger.error('Error getting error statistics', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate summary report
router.get('/summary', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const summary = await logAnalyzer.generateSummaryReport();
    
    res.json({
      generatedAt: new Date().toISOString(),
      summary
    });
  } catch (error) {
    req.logger.error('Error generating log summary', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Test logging at different levels
router.post('/test', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { message = 'Test log message' } = req.body;
    
    // Log at all levels
    logger.error(`${message} (ERROR)`, { test: true, level: 'error' });
    logger.warn(`${message} (WARN)`, { test: true, level: 'warn' });
    logger.info(`${message} (INFO)`, { test: true, level: 'info' });
    logger.debug(`${message} (DEBUG)`, { test: true, level: 'debug' });
    logger.trace(`${message} (TRACE)`, { test: true, level: 'trace' });
    
    res.json({ 
      message: 'Test logs generated at all levels',
      currentLevel: logger.currentLevel.label
    });
  } catch (error) {
    req.logger.error('Error testing logs', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
