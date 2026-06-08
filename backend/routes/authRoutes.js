// authRoutes.js
// Defines all authentication-related API endpoints

const express = require('express');
const router = express.Router();

// Import controller functions
const { login, getMe, changePassword } = require('../controllers/authController');

// Import middleware
const { protect } = require('../middleware/authMiddleware');

// ================================================
// PUBLIC ROUTES (no token needed)
// ================================================

// POST /api/auth/login
// Anyone can call this to login
router.post('/login', login);

// ================================================
// PROTECTED ROUTES (token required)
// 'protect' middleware runs first, then the function
// ================================================

// GET /api/auth/me
// Get current logged-in user info
router.get('/me', protect, getMe);

// PUT /api/auth/change-password
// Change password
router.put('/change-password', protect, changePassword);

module.exports = router;