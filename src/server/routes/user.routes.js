const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  assignProfile
} = require('../controllers/user.controller');
const { auth, adminOnly } = require('../middleware/auth');
const { userCreateValidationRules, validate } = require('../middleware/validator');

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', auth, adminOnly, getUsers);

// @route   GET /api/v1/users/:userId
// @desc    Get user by ID
// @access  Private
router.get('/:userId', auth, getUserById);

// @route   POST /api/v1/users
// @desc    Create a new user
// @access  Private/Admin
router.post('/', auth, adminOnly, userCreateValidationRules, validate, createUser);

// @route   PUT /api/v1/users/:userId
// @desc    Update user
// @access  Private/Admin
router.put('/:userId', auth, adminOnly, updateUser);

// @route   DELETE /api/v1/users/:userId
// @desc    Delete user
// @access  Private/Admin
router.delete('/:userId', auth, adminOnly, deleteUser);

// @route   PUT /api/v1/users/:userId/profile
// @desc    Assign profile to user
// @access  Private/Admin
router.put('/:userId/profile', auth, adminOnly, assignProfile);

module.exports = router;
