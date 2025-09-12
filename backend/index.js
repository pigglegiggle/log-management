require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const { startSecurityMonitoring } = require('./services/securityService');
const { startRetentionService } = require('./services/retentionService');

const PORT = process.env.PORT || 3002;
const app = express();

// CORS configuration สำหรับ EC2
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:80',
    /^http:\/\/.*:3001$/,
    /^http:\/\/.*:80$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const alertsRoutes = require('./routes/alerts');
const retentionRoutes = require('./routes/retention');

// Use routes
app.use('/api', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/retention', retentionRoutes);

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Protected route
app.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'User authenticated',
    tokenPayload: {
      username: req.user.username,
      role: req.user.role
    },
  });
});

// เริ่มต้น security monitoring service
startSecurityMonitoring();

// เริ่มต้น data retention service
startRetentionService();

// เริ่มต้น server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
