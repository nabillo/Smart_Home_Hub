const aesjs = require('aes-js');
const crypto = require('crypto');

// Encryption key from environment variable (must be 32 bytes/256 bits)
const key = process.env.ENCRYPTION_KEY ? 
  Buffer.from(process.env.ENCRYPTION_KEY) : 
  crypto.randomBytes(32); // Fallback for development

/**
 * Encrypts data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text as hex string with IV and auth tag
 */
const encrypt = (text) => {
  if (!text) return null;
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return IV + encrypted data + auth tag
  return iv.toString('hex') + ':' + encrypted + ':' + authTag;
};

/**
 * Decrypts data using AES-256-GCM
 * @param {string} encryptedText - Encrypted text (IV:ciphertext:authTag)
 * @returns {string} - Decrypted text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  
  // Split the encrypted text into IV, ciphertext, and auth tag
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted text format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const ciphertext = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt the ciphertext
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

module.exports = {
  encrypt,
  decrypt
};
