const express = require('express');
const connection = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { role, username } = req.user;

    if (role === 'tenant') {
      const tenantQuery = `SELECT id FROM tenants WHERE name = ?`;
      const [tenantResult] = await connection.query(tenantQuery, [username]);
      
      if (tenantResult.length === 0) {
        return res.status(404).json({ success: false, message: 'Tenant not found' });
      }
      
      const tenantId = tenantResult[0].id;

      const logsQuery = `
        SELECT 
          l.*,
          t.name as tenant_name,
          s.name as source_name
        FROM logs l
        LEFT JOIN tenants t ON l.tenant_id = t.id
        LEFT JOIN sources s ON l.source_id = s.id
        WHERE l.tenant_id = ?
        ORDER BY l.timestamp DESC
        LIMIT 1000
      `;

      const [logs] = await connection.query(logsQuery, [tenantId]);

      return res.json({
        success: true,
        logs: logs
      });
    }

    else if (role === 'admin') {
      // ดึงข้อมูลทั้งหมดสำหรับ admin - พร้อม tenant และ source names
      const logsQuery = `
        SELECT 
          l.*,
          t.name as tenant_name,
          s.name as source_name
        FROM logs l
        LEFT JOIN tenants t ON l.tenant_id = t.id
        LEFT JOIN sources s ON l.source_id = s.id
        ORDER BY l.timestamp DESC 
        LIMIT 1000
      `;
      const [logs] = await connection.query(logsQuery, []);

      return res.json({
        success: true,
        logs: logs
      });
    }

    else {
      return res.status(403).json({ success: false, message: 'Forbidden: invalid role' });
    }
  } catch (err) {
    console.error('Error fetching logs:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;