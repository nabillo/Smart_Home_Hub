import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class LogAnalyzer {
  constructor(logDir = path.join(__dirname, '../../logs')) {
    this.logDir = logDir;
  }
  
  // Get all log files in the log directory
  async getLogFiles() {
    try {
      const files = await fs.promises.readdir(this.logDir);
      return files
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logDir, file));
    } catch (err) {
      console.error(`Error reading log directory: ${err.message}`);
      return [];
    }
  }
  
  // Parse a log line into a structured object
  parseLine(line) {
    try {
      // Try to parse as JSON first
      return JSON.parse(line);
    } catch (err) {
      // If not JSON, try to parse standard format
      const timestampMatch = line.match(/\[(.*?)\]/);
      const levelMatch = line.match(/\[([A-Z]+)\]/);
      
      if (timestampMatch && levelMatch) {
        const timestamp = timestampMatch[1];
        const level = levelMatch[1];
        const message = line.substring(line.indexOf(']', line.indexOf(level)) + 1).trim();
        
        return {
          timestamp,
          level,
          message
        };
      }
      
      // If all else fails, return the raw line
      return { raw: line };
    }
  }
  
  // Search logs for a specific pattern
  async searchLogs(pattern, options = {}) {
    const {
      maxResults = 100,
      startDate,
      endDate,
      level,
      caseSensitive = false
    } = options;
    
    const results = [];
    const logFiles = await this.getLogFiles();
    
    // Create RegExp from pattern
    const regex = new RegExp(pattern, caseSensitive ? '' : 'i');
    
    for (const file of logFiles) {
      // Skip files outside date range if specified
      if (startDate || endDate) {
        const fileDate = this.extractDateFromFilename(file);
        if (fileDate) {
          if (startDate && fileDate < new Date(startDate)) continue;
          if (endDate && fileDate > new Date(endDate)) continue;
        }
      }
      
      const fileStream = fs.createReadStream(file);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        if (results.length >= maxResults) break;
        
        const parsedLine = this.parseLine(line);
        
        // Apply filters
        if (level && parsedLine.level && parsedLine.level !== level) {
          continue;
        }
        
        // Check if line matches pattern
        const stringToSearch = JSON.stringify(parsedLine);
        if (regex.test(stringToSearch)) {
          results.push({
            file: path.basename(file),
            data: parsedLine
          });
        }
      }
      
      if (results.length >= maxResults) break;
    }
    
    return results;
  }
  
  // Extract date from filename (assuming format like app-2023-05-15.log)
  extractDateFromFilename(filename) {
    const dateMatch = path.basename(filename).match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      return new Date(dateMatch[0]);
    }
    return null;
  }
  
  // Get error statistics
  async getErrorStats(days = 7) {
    const stats = {
      totalErrors: 0,
      errorsByDay: {},
      topErrors: {}
    };
    
    const logFiles = await this.getLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    for (const file of logFiles) {
      const fileDate = this.extractDateFromFilename(file);
      if (fileDate && fileDate < cutoffDate) continue;
      
      const fileStream = fs.createReadStream(file);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        const parsedLine = this.parseLine(line);
        
        if (parsedLine.level === 'ERROR') {
          stats.totalErrors++;
          
          // Group by day
          const day = parsedLine.timestamp 
            ? parsedLine.timestamp.split('T')[0] 
            : 'unknown';
          
          stats.errorsByDay[day] = (stats.errorsByDay[day] || 0) + 1;
          
          // Count error messages
          const errorMessage = parsedLine.message || 'Unknown error';
          stats.topErrors[errorMessage] = (stats.topErrors[errorMessage] || 0) + 1;
        }
      }
    }
    
    // Sort top errors
    stats.topErrors = Object.entries(stats.topErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    
    return stats;
  }
  
  // Generate a summary report
  async generateSummaryReport() {
    const logFiles = await this.getLogFiles();
    const summary = {
      totalLogs: 0,
      byLevel: {},
      byDate: {},
      recentErrors: []
    };
    
    for (const file of logFiles) {
      const fileStream = fs.createReadStream(file);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        summary.totalLogs++;
        
        const parsedLine = this.parseLine(line);
        
        // Count by level
        if (parsedLine.level) {
          summary.byLevel[parsedLine.level] = (summary.byLevel[parsedLine.level] || 0) + 1;
        }
        
        // Group by date
        if (parsedLine.timestamp) {
          const day = parsedLine.timestamp.split('T')[0];
          summary.byDate[day] = (summary.byDate[day] || 0) + 1;
        }
        
        // Collect recent errors
        if (parsedLine.level === 'ERROR' && summary.recentErrors.length < 10) {
          summary.recentErrors.push(parsedLine);
        }
      }
    }
    
    return summary;
  }
}

export default LogAnalyzer;
