// This file creates a connection "pool" to PostgreSQL
// A pool = multiple connections ready to handle requests at the same time

const { Pool } = require('pg');
require('dotenv').config();

// Create the connection pool using settings from .env file
const pool = new Pool({
  host: process.env.DB_HOST,       // localhost
  port: process.env.DB_PORT,       // 5432
  database: process.env.DB_NAME,   // hardware_store
  user: process.env.DB_USER,       // postgres
  password: process.env.DB_PASSWORD, // your password
  max: 20,          // maximum 20 connections at once
  idleTimeoutMillis: 30000,        // close idle connections after 30 seconds
  connectionTimeoutMillis: 2000,   // fail if can't connect in 2 seconds
});

// Test the connection when this file is first loaded
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully!');
    release(); // release the test connection back to pool
  }
});

// Export the pool so other files can use it
module.exports = pool;