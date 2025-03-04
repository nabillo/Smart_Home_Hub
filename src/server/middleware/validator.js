const { validationResult, check } = require('express-validator');

/**
 * Middleware to validate request data
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const userCreateValidationRules = [
  check('login')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  check('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one symbol'),
  
  check('profile')
    .isIn(['admin', 'standard', 'kids', 'monitor'])
    .withMessage('Invalid profile type')
];

/**
 * Validation rules for user login
 */
const loginValidationRules = [
  check('login')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  
  check('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for profile creation
 */
const profileCreateValidationRules = [
  check('name')
    .trim()
    .notEmpty()
    .withMessage('Profile name is required')
    .isIn(['admin', 'standard', 'kids', 'monitor'])
    .withMessage('Invalid profile type'),
  
  check('roles')
    .isArray()
    .withMessage('Roles must be an array')
];

module.exports = {
  validate,
  userCreateValidationRules,
  loginValidationRules,
  profileCreateValidationRules
};
