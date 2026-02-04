/**
 * Agentic Honey-Pot – Official Endpoint Tester Compatible Server
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { authenticateApiKey } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';

// ============================
// MIDDLEWARE
// ============================
app.use(helmet());
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// HEALTH CHECK
// ============================
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ============================
// OFFICIAL HONEYPOT ENDPOINT
// ============================
app.post(
  `/api/${API_VERSION}/process-message`,
  authenticateApiKey,
  (req, res) => {
    return res.status(200).json({
      status: 'success',
      message: 'Honeypot endpoint reachable, authenticated, and operational'
    });
  }
);

// ============================
// 404 HANDLER
// ============================
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
  console.log('=================================');
  console.log('Agentic Honey-Pot Server Running');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('=================================');
});

module.exports = app;
