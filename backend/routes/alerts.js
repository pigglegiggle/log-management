const express = require('express');
const connection = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ดึงข้อมูล alerts
router.get('/', auth, async (req, res) => {
  try {
    const { role, username } = req.user;

    let query = '';
    let params = [];

    if (role === 'admin') {
      // admin: เห็นทุก alert
      query = 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100';
    } else if (role === 'tenant') {
      // tenant: เห็นแค่ alert ของตัวเอง
      // ต้อง join กับ tenants table เพื่อ filter ตาม tenant name
      query = `
        SELECT a.* 
        FROM alerts a
        LEFT JOIN tenants t ON a.details->>'$.tenant' = t.name
        WHERE t.name = ?
        ORDER BY a.created_at DESC
        LIMIT 100
      `;
      params = [username];
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden: invalid role' });
    }

    const [alerts] = await connection.query(query, params);

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
