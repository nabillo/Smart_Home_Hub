const express = require('express');
const router = express.Router();
const { 
  getProfiles, 
  getProfileById, 
  createProfile, 
  updateProfile, 
  deleteProfile 
} = require('../controllers/profile.controller');
const { auth, adminOnly } = require('../middleware/auth');
const { profileCreateValidationRules, validate } = require('../middleware/validator');

// @route   GET /api/v1/profiles
// @desc    Get all profiles
// @access  Public
router.get('/', getProfiles);

// @route   GET /api/v1/profiles/:profileId
// @desc    Get profile by ID
// @access  Public
router.get('/:profileId', getProfileById);

// @route   POST /api/v1/profiles
// @desc    Create a new profile
// @access  Private/Admin
router.post('/', auth, adminOnly, profileCreateValidationRules, validate, createProfile);

// @route   PUT /api/v1/profiles/:profileId
// @desc    Update profile
// @access  Private/Admin
router.put('/:profileId', auth, adminOnly, updateProfile);

// @route   DELETE /api/v1/profiles/:profileId
// @desc    Delete profile
// @access  Private/Admin
router.delete('/:profileId', auth, adminOnly, deleteProfile);

module.exports = router;
