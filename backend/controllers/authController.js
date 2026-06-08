// authController.js
// This file handles everything related to authentication
// Login, getting current user info, etc.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ================================================
// FUNCTION 1: LOGIN
// Route: POST /api/auth/login
// What it does: Checks email/password, returns token
// ================================================
const login = async (req, res) => {
  try {
    // Step 1: Get email and password from request body
    const { email, password } = req.body;

    // Step 2: Validate — make sure both fields are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Step 3: Check if user exists in database
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // If no user found with that email
    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Step 4: Get the user from query result
    const user = userQuery.rows[0];

    // Step 5: Compare entered password with encrypted password in DB
    // bcrypt.compare() returns true if they match
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Step 6: Create JWT Token
    // This token proves the user is logged in
    // It expires after 7 days (set in .env)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Step 7: Send success response with token
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// ================================================
// FUNCTION 2: GET CURRENT USER
// Route: GET /api/auth/me
// What it does: Returns info about logged-in user
// Requires: Valid JWT token in request header
// ================================================
const getMe = async (req, res) => {
  try {
    // req.user is set by the authMiddleware (we'll create it next)
    const userQuery = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: userQuery.rows[0]
    });

  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ================================================
// FUNCTION 3: CHANGE PASSWORD
// Route: PUT /api/auth/change-password
// ================================================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user from database
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userQuery.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Encrypt new password
    // bcrypt.hash() encrypts the password with 10 rounds of hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update in database
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Export all functions so routes can use them
module.exports = { login, getMe, changePassword };