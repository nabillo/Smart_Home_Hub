import logger from './logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a specialized logger for security audit events
const auditLogger = logger.child({
  module: 'AUDIT',
  logType: 'security'
});

// Audit log directory
const auditLogDir = path.join(__dirname, '../../logs/audit');

// Ensure audit log directory exists
if (!fs.existsSync(auditLogDir)) {
  fs.mkdirSync(auditLogDir, { recursive: true });
}

// Audit log file path
const auditLogFile = path.join(auditLogDir, `audit-${new Date().toISOString().split('T')[0]}.log`);

// Log security events
const logSecurityEvent = async (event, user, details = {}) => {
  const eventData = {
    timestamp: new Date().toISOString(),
    event,
    user: user ? {
      id: user.id,
      login: user.login,
      profile: user.profile
    } : 'anonymous',
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    ...details
  };
  
  // Log to console and main log file
  auditLogger.info(`Security event: ${event}`, eventData);
  
  // Also write to dedicated audit log file
  fs.appendFile(
    auditLogFile,
    JSON.stringify(eventData) + '\n',
    (err) => {
      if (err) {
        auditLogger.error(`Failed to write to audit log: ${err.message}`);
      }
    }
  );
  
  // Store in database if possible
  try {
    await pool.query(
      'INSERT INTO audit_logs (event_type, user_id, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5)',
      [
        event,
        user ? user.id : null,
        details.ip || 'unknown',
        details.userAgent || 'unknown',
        JSON.stringify(details)
      ]
    );
  } catch (error) {
    auditLogger.error(`Failed to store audit log in database: ${error.message}`);
  }
  
  return eventData;
};

// Predefined security event types
const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  PERMISSION_CHANGED: 'PERMISSION_CHANGED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
};

export { logSecurityEvent, SECURITY_EVENTS };
export default { logSecurityEvent, SECURITY_EVENTS };
