// server.js — This is the heart of your backend
// It creates the Express server and connects everything together

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import the database connection (this also tests the connection)
const pool = require('./config/db');

// Create the Express application
const app = express();

// ============================================
// MIDDLEWARE SETUP
// Middleware = code that runs on EVERY request
// before it reaches your route handlers
// ============================================

// helmet: adds security headers to every response
app.use(helmet());

// cors: allows your React frontend (port 3000) to
// talk to this backend (port 5000)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// morgan: logs every request to the console
// Example log: GET /api/products 200 45ms
app.use(morgan('dev'));

// express.json: reads JSON data from request body
// Without this, req.body would be undefined
app.use(express.json());

// express.urlencoded: reads form data
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================
const authRoutes     = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes  = require('./routes/productRoutes');
const billingRoutes  = require('./routes/billingRoutes');

app.use('/api/auth',       authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers',  supplierRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/billing',    billingRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏪 Hardware Store API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});
// Routes = the URLs your API responds to
// We'll add more routes as we build each module
// ============================================

// Health check route — to test if server is running
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏪 Hardware Store API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ERROR HANDLING
// This catches any errors that happen in routes
// ============================================

// 404 handler — when a route doesn't exist
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler — when something crashes
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ============================================
// START THE SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ================================');
  console.log(`🚀  Server running on port ${PORT}`);
  console.log(`🚀  URL: http://localhost:${PORT}`);
  console.log(`🚀  Mode: ${process.env.NODE_ENV}`);
  console.log('🚀 ================================');
  console.log('');
});