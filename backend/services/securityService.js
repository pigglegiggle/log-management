const connection = require('../db');

// ฟังก์ชันตรวจจับล็อกอินล้มเหลวซ้ำๆ (Updated for Simplified Schema + No Duplicate Alerts)
async function checkFailedLoginAttempts() {
  try {
    // หาการล็อกอินล้มเหลวใน 5 นาทีที่ผ่านมา
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const timeStr = fiveMinutesAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    // ใช้ simplified schema - query เดียวจาก logs table
    const [failedLogins] = await connection.query(`
      SELECT 
        l.src_ip as ip, 
        COUNT(*) as attempt_count, 
        GROUP_CONCAT(DISTINCT l.user) as users,
        t.name as tenant_name
      FROM logs l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      WHERE (l.event_type LIKE '%login%fail%' OR l.event_type LIKE '%LogonFailed%' OR l.event_type LIKE '%app_login_failed%')
        AND l.timestamp >= ?
        AND l.src_ip IS NOT NULL
      GROUP BY l.src_ip, t.name
      HAVING attempt_count >= 3
    `, [timeStr]);

    console.log(`🔍 Checking failed logins since ${timeStr}, found ${failedLogins.length} suspicious IPs`);
    
    if (failedLogins.length > 0) {
      let newAlertsCount = 0;
      
      for (const login of failedLogins) {
        try {
          // ตรวจสอบว่ามี alert สำหรับ IP นี้ในช่วง 1 ชั่วโมงที่ผ่านมาหรือไม่
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
            // ไม่มี alert สำหรับ IP นี้ในช่วง 1 ชั่วโมง - สร้างใหม่
            await connection.query(`
              INSERT INTO alerts (alert_type, message, ip_address, details, created_at) 
              VALUES (?, ?, ?, ?, NOW())
            `, [
              'failed_login_attempts',
              `ตรวจพบการล็อกอินล้มเหลว ${login.attempt_count} ครั้งจาก IP ${login.ip} (${login.tenant_name || 'Unknown'}) ภายใน 5 นาที`,
              login.ip,
              JSON.stringify({
                attempt_count: login.attempt_count,
                users: login.users,
                tenant: login.tenant_name,
                time_window: '5 minutes',
                timestamp: new Date().toISOString()
              })
            ]);
            
            newAlertsCount++;
            console.log(`🚨 NEW alert created for IP ${login.ip} (${login.attempt_count} attempts)`);
          } else {
            console.log(`⏸️  Alert for IP ${login.ip} already exists within 1 hour, skipping...`);
          }
        } catch (insertErr) {
          console.error(`❌ Error creating alert for IP ${login.ip}:`, insertErr);
        }
      }
      
      if (newAlertsCount > 0) {
        console.log(`✅ ${newAlertsCount} NEW alerts created (${failedLogins.length - newAlertsCount} skipped as duplicates)`);
      } else {
        console.log(`✅ No new alerts needed (all ${failedLogins.length} IPs already have recent alerts)`);
      }
    } else {
      console.log('✅ No suspicious failed login activity detected');
    }
  } catch (err) {
    console.error('❌ Error checking failed login attempts:', err);
  }
}

// เริ่มต้น background service
function startSecurityMonitoring() {
  // รันการตรวจสอบทุก 5 วินาที (เร็วขึ้น)
  setInterval(checkFailedLoginAttempts, 5000);
  console.log('Security monitoring service started - checking every 5 seconds');
}


module.exports = {
  checkFailedLoginAttempts,
  startSecurityMonitoring
};
