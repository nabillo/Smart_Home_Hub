const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const { loginValidationRules, validate } = require('../middleware/validator');

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidationRules, validate, login);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, logout);

module.exports = router;
