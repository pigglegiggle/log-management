require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const { startSecurityMonitoring } = require('./services/securityService');
const { startRetentionService } = require('./services/retentionService');

const PORT = process.env.PORT || 3002;
const app = express();

app.use(cors({
    origin: ['https://log.sinpw.site', 'http://localhost:3001'],
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
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
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
