require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('./db');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ---------------- MIDDLEWARE ----------------
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader)
    return res.status(401).json({ success: false, message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ success: false, message: 'Invalid token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
}

// ---------------- ROUTES ----------------
// Signup
app.post('/api/signup', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'มีชื่อผู้ใช้นี้ในระบบแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || 'tenant',
    });

    res.json({ success: true, message: 'เพิ่มผู้ใช้แล้ว', userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '3d' }
    );

    res.json({ success: true, token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected route
app.get('/', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Decoded token payload',
    tokenPayload: req.user,
  });
});


// สมมติใช้ Express style app.get และ middleware auth ที่ decode token ใส่ req.user มาแล้ว

// API สำหรับดึงข้อมูลจาก table logs ทั้งหมด (สำหรับ admin)
app.get('/api/all-logs', auth, async (req, res) => {
  try {
    const { role, username } = req.user;
    const { limit = 100, offset = 0 } = req.query;

    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // ดึงข้อมูลจาก logs table หลัก (แยกตาม tenant ก่อน แล้วตาม sources)
    const logsQuery = `
      SELECT 
        id,
        timestamp,
        tenant,
        source,
        vendor,
        product,
        event_type,
        event_subtype,
        severity,
        action,
        src_ip,
        src_port,
        dst_ip,
        dst_port,
        protocol,
        user,
        host,
        process,
        url,
        http_method,
        status_code,
        rule_name,
        rule_id,
        cloud,
        raw,
        _tags
      FROM logs 
      ORDER BY 
        CASE 
          WHEN tenant IS NULL THEN 1 
          ELSE 0 
        END,
        tenant ASC,
        source ASC,
        timestamp DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const logs = await sequelize.query(logsQuery, { type: sequelize.QueryTypes.SELECT });

    // ดึงจำนวนทั้งหมด
    const totalResult = await sequelize.query(
      `SELECT COUNT(*) as total FROM logs`,
      { type: sequelize.QueryTypes.SELECT }
    );
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

app.get('/api/logs', auth, async (req, res) => {
  try {
    const { role, username } = req.user;

    if (role === 'tenant') {
      // ดึงข้อมูลจาก tenant-specific table แยกตาม sources
      const tenantTable = `logs_${username}`;
      const logsQuery = `
        SELECT 
          id,
          timestamp,
          source,
          vendor,
          product,
          event_type,
          event_subtype,
          severity,
          action,
          src_ip,
          src_port,
          dst_ip,
          dst_port,
          protocol,
          user,
          host,
          process,
          url,
          http_method,
          status_code,
          rule_name,
          rule_id,
          cloud,
          raw,
          _tags
        FROM ${tenantTable}
        ORDER BY source ASC, timestamp DESC
      `;

      const logs = await sequelize.query(logsQuery, { type: sequelize.QueryTypes.SELECT });

      // จัดกลุ่มตาม source เพื่อให้เข้ากับ format เดิม
      const logsByTenant = { [username]: {} };
      
      logs.forEach(log => {
        const source = log.source || 'unknown';
        if (!logsByTenant[username][source]) {
          logsByTenant[username][source] = [];
        }
        logsByTenant[username][source].push(log);
      });

      console.log(logsByTenant);
      return res.json({
        success: true,
        message: 'Hello Tenant',
        user: username,
        logsByTenant,
        firewallLogs: [],
        networkLogs: [],
      });
    }

    else if (role === 'admin') {
      // ดึงข้อมูลทั้งหมดสำหรับ admin
      const logsQuery = `
        SELECT 
          id,
          timestamp,
          tenant,
          source,
          vendor,
          product,
          event_type,
          event_subtype,
          severity,
          action,
          src_ip,
          src_port,
          dst_ip,
          dst_port,
          protocol,
          user,
          host,
          process,
          url,
          http_method,
          status_code,
          rule_name,
          rule_id,
          cloud,
          raw,
          _tags
        FROM logs
        ORDER BY timestamp DESC
      `;

      const logs = await sequelize.query(logsQuery, { type: sequelize.QueryTypes.SELECT });

      let logsByTenant = {};
      let firewallLogs = [];
      let networkLogs = [];

      logs.forEach(log => {
        if (log.source === 'firewall') {
          firewallLogs.push(log);
        } else if (log.source === 'network') {
          networkLogs.push(log);
        } else if (log.tenant) {
          // Tenant logs
          if (!logsByTenant[log.tenant]) logsByTenant[log.tenant] = {};
          const source = log.source || 'unknown';
          if (!logsByTenant[log.tenant][source]) logsByTenant[log.tenant][source] = [];
          logsByTenant[log.tenant][source].push(log);
        }
      });

      console.log('Admin compiled logsByTenant:', logsByTenant);
      console.log('Admin compiled firewallLogs:', firewallLogs);
      console.log('Admin compiled networkLogs:', networkLogs);
      
      return res.json({
        success: true,
        message: 'Fetched logs',
        logsByTenant,
        firewallLogs,
        networkLogs,
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
app.get('/api/firewall-logs', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logsQuery = `
      SELECT 
        id,
        timestamp,
        source,
        vendor,
        product,
        action,
        src_ip,
        src_port,
        dst_ip,
        dst_port,
        protocol,
        host,
        rule_name,
        rule_id,
        raw,
        _tags
      FROM logs_firewall
      ORDER BY timestamp DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const logs = await sequelize.query(logsQuery, { type: sequelize.QueryTypes.SELECT });

    // ดึงจำนวนทั้งหมด
    const totalResult = await sequelize.query(
      `SELECT COUNT(*) as total FROM logs_firewall`,
      { type: sequelize.QueryTypes.SELECT }
    );
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
app.get('/api/network-logs', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logsQuery = `
      SELECT 
        id,
        timestamp,
        source,
        interface,
        event,
        mac,
        reason,
        host,
        raw,
        _tags
      FROM logs_network
      ORDER BY timestamp DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const logs = await sequelize.query(logsQuery, { type: sequelize.QueryTypes.SELECT });

    // ดึงจำนวนทั้งหมด
    const totalResult = await sequelize.query(
      `SELECT COUNT(*) as total FROM logs_network`,
      { type: sequelize.QueryTypes.SELECT }
    );
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

// ---------------- ALERTS API ----------------

// ดึงข้อมูล alerts
app.get('/api/alerts', auth, async (req, res) => {
  try {
    const alerts = await sequelize.query(`
      SELECT * FROM alerts 
      ORDER BY created_at DESC 
      LIMIT 100
    `, { type: sequelize.QueryTypes.SELECT });

    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// สร้าง alert ใหม่
app.post('/api/alerts', auth, async (req, res) => {
  try {
    const { alert_type, message, ip_address, details } = req.body;
    
    const result = await sequelize.query(`
      INSERT INTO alerts (alert_type, message, ip_address, details, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, {
      replacements: [alert_type, message, ip_address, JSON.stringify(details)],
      type: sequelize.QueryTypes.INSERT
    });

    return res.json({ success: true, id: result[0] });
  } catch (err) {
    console.error('Error creating alert:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ฟังก์ชันตรวจจับล็อกอินล้มเหลวซ้ำๆ
async function checkFailedLoginAttempts() {
  try {
    // หาการล็อกอินล้มเหลวใน 5 นาทีที่ผ่านมา
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const timeStr = fiveMinutesAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    const failedLogins = await sequelize.query(`
      SELECT src_ip as ip, COUNT(*) as attempt_count, GROUP_CONCAT(user) as users
      FROM (
        SELECT src_ip, user, timestamp FROM logs_demoA 
        WHERE (event_type LIKE '%login%fail%' OR event_type LIKE '%LogonFailed%')
        AND timestamp >= '${timeStr}'
        UNION ALL
        SELECT src_ip, user, timestamp FROM logs_demoB 
        WHERE (event_type LIKE '%login%fail%' OR event_type LIKE '%LogonFailed%')
        AND timestamp >= '${timeStr}'
        UNION ALL
        SELECT src_ip, user, timestamp FROM logs 
        WHERE (event_type LIKE '%login%fail%' OR event_type LIKE '%LogonFailed%')
        AND timestamp >= '${timeStr}'
      ) combined_logs
      WHERE src_ip IS NOT NULL
      GROUP BY src_ip
      HAVING attempt_count >= 3
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Checking failed logins since ${timeStr}, found ${failedLogins.length} suspicious IPs`);

    // สร้าง alert สำหรับ IP ที่มีการล็อกอินล้มเหลวมากเกินไป
    for (const login of failedLogins) {
      // เช็คว่ามี alert สำหรับ IP นี้ใน 5 นาทีที่ผ่านมาหรือไม่
      const existingAlert = await sequelize.query(`
        SELECT id FROM alerts 
        WHERE alert_type = 'failed_login_attempts' 
        AND ip_address = '${login.ip}' 
        AND created_at >= '${timeStr}'
      `, { type: sequelize.QueryTypes.SELECT });

      if (existingAlert.length === 0) {
        // สร้าง alert ใหม่
        await sequelize.query(`
          INSERT INTO alerts (alert_type, message, ip_address, details, created_at)
          VALUES ('failed_login_attempts', 'ตรวจพบการล็อกอินล้มเหลว ${login.attempt_count} ครั้งจาก IP ${login.ip} ภายใน 5 นาที', '${login.ip}', '${JSON.stringify({
            attempt_count: login.attempt_count,
            users: login.users,
            time_window: '5 minutes'
          })}', NOW())
        `, { type: sequelize.QueryTypes.INSERT });
        
        console.log(`Alert created: Failed login attempts from ${login.ip} (${login.attempt_count} attempts)`);
      }
    }
  } catch (err) {
    console.error('Error checking failed login attempts:', err);
  }
}

// รันการตรวจสอบทุก 30 วินาที
setInterval(checkFailedLoginAttempts, 30000);

// เริ่มต้น server
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error('DB error:', err);
  }
})();
