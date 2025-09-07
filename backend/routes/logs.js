const express = require('express');
const connection = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// API สำหรับดึงข้อมูลจาก table logs ทั้งหมด (สำหรับ admin)
router.get('/all-logs', auth, async (req, res) => {
  try {
    const { role, username } = req.user;
    const { limit = 100, offset = 0 } = req.query;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const logsQuery = `
      SELECT 
        l.id,
        l.timestamp,
        l.log_type,
        l.event_type,
        l.severity,
        l.message,
        l.src_ip,
        l.dst_ip,
        l.user,
        l.host,
        l.raw_data,
        t.name as tenant_name,
        s.name as source_name
      FROM logs l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      LEFT JOIN sources s ON l.source_id = s.id
      ORDER BY l.timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    const [logs] = await connection.query(logsQuery, [parseInt(limit), parseInt(offset)]);

    // ดึงจำนวนทั้งหมด
    const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM logs', []);
    const total = totalResult[0].total;

    return res.json({
      success: true,
      logs: logs,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (err) {
    console.error('Error fetching all logs:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API สำหรับดึงข้อมูล logs ตาม role (SIMPLE VERSION)
router.get('/', auth, async (req, res) => {
  try {
    const { role, username } = req.user;

    if (role === 'tenant') {
      // ดึงข้อมูลของ tenant เฉพาะ - SIMPLE
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

// API สำหรับ firewall logs (แยกต่างหาก)
router.get('/firewall-logs', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logsQuery = `
      SELECT 
        l.id,
        l.timestamp,
        l.event_type,
        l.severity,
        l.message,
        l.src_ip,
        l.src_port,
        l.dst_ip,
        l.dst_port,
        l.protocol,
        l.action,
        l.rule_name,
        l.rule_id,
        l.host,
        l.raw_data,
        s.name as source_name
      FROM logs l
      LEFT JOIN sources s ON l.source_id = s.id
      WHERE l.log_type = 'firewall'
      ORDER BY l.timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    const [logs] = await connection.query(logsQuery, [parseInt(limit), parseInt(offset)]);

    // ดึงจำนวนทั้งหมด
    const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM logs WHERE log_type = "firewall"', []);
    const total = totalResult[0].total;

    return res.json({
      success: true,
      logs: logs,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      type: 'firewall'
    });

  } catch (err) {
    console.error('Error fetching firewall logs:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API สำหรับ network logs (แยกต่างหาก)
router.get('/network-logs', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logsQuery = `
      SELECT 
        l.id,
        l.timestamp,
        l.event_type,
        l.severity,
        l.message,
        l.interface,
        l.mac,
        l.host,
        l.raw_data,
        s.name as source_name
      FROM logs l
      LEFT JOIN sources s ON l.source_id = s.id
      WHERE l.log_type = 'network'
      ORDER BY l.timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    const [logs] = await connection.query(logsQuery, [parseInt(limit), parseInt(offset)]);

    // ดึงจำนวนทั้งหมด
    const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM logs WHERE log_type = "network"', []);
    const total = totalResult[0].total;

    return res.json({
      success: true,
      logs: logs,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      type: 'network'
    });

  } catch (err) {
    console.error('Error fetching network logs:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API สำหรับดึงรายชื่อ tenants ทั้งหมด
router.get('/tenants', auth, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tenantsQuery = `
      SELECT 
        id,
        name,
        created_at
      FROM tenants 
      ORDER BY name ASC
    `;

    const [results] = await connection.query(tenantsQuery, []);

    return res.json({ 
      success: true, 
      tenants: results || []
    });

  } catch (err) {
    console.error('Error fetching tenants:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API สำหรับดึงข้อมูล logs ของ tenant เฉพาะ
router.get('/tenant/:id', auth, async (req, res) => {
  try {
    const { role } = req.user;
    const { id } = req.params;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // ดึงข้อมูล tenant ก่อน
    const tenantQuery = `SELECT * FROM tenants WHERE id = ?`;
    const [tenantResults] = await connection.query(tenantQuery, [id]);

    if (tenantResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const tenant = tenantResults[0];

    // ดึง logs ของ tenant นี้จาก logs table หลัก
    const logsQuery = `
      SELECT 
        l.id,
        l.timestamp,
        l.event_type,
        l.severity,
        l.message,
        l.src_ip,
        l.dst_ip,
        l.user,
        l.host,
        l.raw_data,
        s.name as source_name
      FROM logs l
      LEFT JOIN sources s ON l.source_id = s.id
      WHERE l.tenant_id = ?
      ORDER BY l.timestamp DESC 
      LIMIT 1000
    `;

    const [logs] = await connection.query(logsQuery, [id]);

    // จัดกลุ่มตาม source
    const logsBySource = {};
    logs.forEach(log => {
      const source = log.source_name || 'unknown';
      if (!logsBySource[source]) {
        logsBySource[source] = [];
      }
      logsBySource[source].push(log);
    });

    return res.json({
      success: true,
      tenant: tenant,
      logsBySource: logsBySource
    });

  } catch (err) {
    console.error('Error fetching tenant logs:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API สำหรับดึงรายชื่อ sources ทั้งหมด
router.get('/sources', auth, async (req, res) => {
  try {
    const sourcesQuery = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        COUNT(l.id) as log_count
      FROM sources s
      LEFT JOIN logs l ON s.id = l.source_id
      GROUP BY s.id, s.name, s.description, s.created_at
      ORDER BY s.name
    `;

    const [results] = await connection.query(sourcesQuery, []);

    res.json({
      success: true,
      sources: results
    });

  } catch (err) {
    console.error('Error fetching sources:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
