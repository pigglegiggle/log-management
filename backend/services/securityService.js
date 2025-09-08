const connection = require('../db');

// ตรวจสอบล็อกอินล้มเหลวซ้ำ ๆ และสร้าง alert ถ้าไม่มีใน 1 ชั่วโมง
async function checkFailedLoginAttempts() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const timeStr = fiveMinutesAgo.toISOString().slice(0, 19).replace('T', ' ');

    // query logs ล็อกอินล้มเหลวใน 5 นาทีที่ผ่านมา
    const [failedLogins] = await connection.query(`
      SELECT 
        l.src_ip as ip, 
        COUNT(*) as attempt_count, 
        GROUP_CONCAT(DISTINCT l.user) as users,
        t.name as tenant_name
      FROM logs l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      WHERE (l.event_type LIKE '%login%fail%' 
             OR l.event_type LIKE '%LogonFailed%' 
             OR l.event_type LIKE '%app_login_failed%')
        AND l.timestamp >= ?
        AND l.src_ip IS NOT NULL
      GROUP BY l.src_ip, t.name
      HAVING attempt_count >= 3
    `, [timeStr]);

    // ถ้ามีล็อกอินล้มเหลวหลายครั้ง
    for (const login of failedLogins) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneHourTimeStr = oneHourAgo.toISOString().slice(0, 19).replace('T', ' ');

      const [existingAlerts] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM alerts 
        WHERE alert_type = 'failed_login_attempts' 
          AND ip_address = ? 
          AND created_at >= ?
      `, [login.ip, oneHourTimeStr]);

      if (existingAlerts[0].count === 0) {
        // สร้าง alert ใหม่ถ้ายังไม่มี
        await connection.query(`
          INSERT INTO alerts (alert_type, message, ip_address, details, created_at) 
          VALUES (?, ?, ?, ?, NOW())
        `, [
          'failed_login_attempts',
          `Detected ${login.attempt_count} failed logins from IP ${login.ip} (${login.tenant_name || 'Unknown'})`,
          login.ip,
          JSON.stringify({
            attempt_count: login.attempt_count,
            users: login.users,
            tenant: login.tenant_name,
            time_window: '5 minutes',
            timestamp: new Date().toISOString()
          })
        ]);
      }
    }
  } catch (err) {
    // แค่ log error จริง ๆ
    console.error('Error checking failed login attempts:', err);
  }
}

// เริ่ม background service
function startSecurityMonitoring() {
  setInterval(checkFailedLoginAttempts, 5000); // ทุก 5 วินาที
}

module.exports = {
  checkFailedLoginAttempts,
  startSecurityMonitoring
};
