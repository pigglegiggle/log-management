const connection = require('../db');

// Data retention policy
const RETENTION_LOG_DAYS = 7;
const RETENTION_ALERT_DAYS = 30;

// helper: แปลงวันที่ย้อนหลัง n วันเป็น string สำหรับ SQL
function getPastDateStr(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ลบ logs/alerts เก่า
async function cleanupOldLogs() {
  try {
    // ลบ logs เก่า
    const logsDateStr = getPastDateStr(RETENTION_LOG_DAYS);
    const [logsResult] = await connection.query(
      'DELETE FROM logs WHERE created_at < ?',
      [logsDateStr]
    );

    // ลบ alerts เก่า (รวมถึง alerts ที่เกี่ยวข้องกับ logs ที่ถูกลบ)
    const alertsDateStr = getPastDateStr(RETENTION_ALERT_DAYS);
    
    // ลบ alerts ที่เก่าเกิน retention period
    const [alertsResult] = await connection.query(
      'DELETE FROM alerts WHERE created_at < ?',
      [alertsDateStr]
    );

    // ลบ alerts ที่เกี่ยวข้องกับ IP ที่ไม่มี logs แล้ว (optional cleanup)
    const [alertsWithoutLogsResult] = await connection.query(`
      DELETE a FROM alerts a
      WHERE a.ip_address IS NOT NULL 
        AND NOT EXISTS (
          SELECT 1 FROM logs l 
          WHERE l.src_ip = a.ip_address 
            OR l.dst_ip = a.ip_address
        )
    `);

    // Optimize tables
    await connection.query('OPTIMIZE TABLE logs');
    await connection.query('OPTIMIZE TABLE alerts');

    console.log(`✅ Cleanup done: ${logsResult.affectedRows} logs, ${alertsResult.affectedRows} alerts removed`);
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  }
}

// ดูขนาดและจำนวนข้อมูลปัจจุบัน
async function getDataSizeInfo() {
  try {
    const [totalLogs] = await connection.query('SELECT COUNT(*) as count FROM logs');
    const [recentLogs] = await connection.query(
      'SELECT COUNT(*) as count FROM logs WHERE created_at >= ?',
      [getPastDateStr(RETENTION_LOG_DAYS)]
    );
    const [totalAlerts] = await connection.query('SELECT COUNT(*) as count FROM alerts');

    const [tableSize] = await connection.query(`
      SELECT table_name AS tableName,
             ROUND((data_length + index_length)/1024/1024, 2) AS sizeMB
      FROM information_schema.TABLES
      WHERE table_schema = 'logdb' AND table_name IN ('logs','alerts')
      ORDER BY (data_length + index_length) DESC
    `);

    const info = {
      totalLogs: totalLogs[0].count,
      recentLogs: recentLogs[0].count,
      oldLogs: totalLogs[0].count - recentLogs[0].count,
      totalAlerts: totalAlerts[0].count,
      tablesSizeMB: tableSize
    };

    console.log('📊 Database stats:', info);
    return info;
  } catch (err) {
    console.error('❌ Error getting data size info:', err);
    return null;
  }
}

// เริ่ม retention service
function startRetentionService() {
  console.log(`🚀 Starting Retention Service - Logs ${RETENTION_LOG_DAYS} days, Alerts ${RETENTION_ALERT_DAYS} days`);

  // รันทันที
  getDataSizeInfo();

  // ตั้ง interval สำหรับ cleanup (demo: ทุก 30 นาที)
  const INTERVAL = 30 * 60 * 1000;
  setInterval(async () => {
    console.log('🕐 Scheduled cleanup...');
    await getDataSizeInfo();
    await cleanupOldLogs();
  }, INTERVAL);
}

// สำหรับรันด้วยมือ
async function manualCleanup() {
  console.log('🔧 Manual cleanup...');
  await getDataSizeInfo();
  await cleanupOldLogs();
  await getDataSizeInfo();
}

module.exports = {
  startRetentionService,
  cleanupOldLogs,
  getDataSizeInfo,
  manualCleanup,
  RETENTION_LOG_DAYS
};
