// authMiddleware.js
// This is the "security guard" for protected routes
// It checks if the request has a valid JWT token
// If valid → allows the request through
// If invalid → blocks with 401 Unauthorized

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
  try {
    let token;

    // Step 1: Check if token exists in request headers
    // Token is sent as: Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract just the token part (remove "Bearer ")
      token = req.headers.authorization.split(' ')[1];
    }

    // Step 2: If no token found, block the request
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login first.'
      });
    }

    // Step 3: Verify the token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 4: Check if user still exists in database
    const userQuery = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userQuery.rows.length === 0 || !userQuery.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is deactivated'
      });
    }

    // Step 5: Attach user info to the request object
    // Now any route that uses this middleware can access req.user
    req.user = userQuery.rows[0];

    // Step 6: Call next() to move to the actual route handler
    next();

  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
};

module.exports = { protect };