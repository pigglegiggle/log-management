const express = require('express');
const connection = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ดึงข้อมูล alerts
router.get('/', auth, async (req, res) => {
  try {
    const [alerts] = await connection.query(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100',
      []
    );

    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// สร้าง alert ใหม่
router.post('/', auth, async (req, res) => {
  try {
    const { alert_type, message, ip_address, details } = req.body;
    
    const [result] = await connection.query(
      'INSERT INTO alerts (alert_type, message, ip_address, details, created_at) VALUES (?, ?, ?, ?, NOW())',
      [alert_type, message, ip_address, JSON.stringify(details)]
    );

    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error creating alert:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
