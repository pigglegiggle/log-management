const connection = require('../db');

// Data retention policy - เก็บข้อมูล 7 วัน
const RETENTION_DAYS = 7;

// ฟังก์ชันลบข้อมูลเก่า
async function cleanupOldLogs() {
  try {
    // คำนวณวันที่ย้อนหลัง 7 วัน
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);
    const retentionDateStr = retentionDate.toISOString().slice(0, 19).replace('T', ' ');

    // ลบ logs เก่าจาก logs table
    const [logsResult] = await connection.query(`
      DELETE FROM logs 
      WHERE created_at < ?
    `, [retentionDateStr]);
    
    // ลบ alerts เก่าจาก alerts table (เก็บ 30 วัน)
    const alertRetentionDate = new Date();
    alertRetentionDate.setDate(alertRetentionDate.getDate() - 30);
    const alertRetentionDateStr = alertRetentionDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const [alertsResult] = await connection.query(`
      DELETE FROM alerts 
      WHERE created_at < ?
    `, [alertRetentionDateStr]);
    
    console.log(`✅ Cleanup completed:`);
    console.log(`   - Deleted ${logsResult.affectedRows} logs older than ${RETENTION_DAYS} days`);
    console.log(`   - Deleted ${alertsResult.affectedRows} alerts older than 30 days`);
    
    // Optional: OPTIMIZE TABLE เพื่อคืนพื้นที่ disk
    await connection.query('OPTIMIZE TABLE logs');
    await connection.query('OPTIMIZE TABLE alerts');
    console.log(`🔧 Database tables optimized`);
    
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  }
}

// ฟังก์ชันดูขนาดข้อมูลปัจจุบัน
async function getDataSizeInfo() {
  try {
    // นับจำนวน logs ทั้งหมด
    const [totalLogs] = await connection.query('SELECT COUNT(*) as count FROM logs');
    
    // นับจำนวน logs ใน 7 วันล่าสุด
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);
    const retentionDateStr = retentionDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const [recentLogs] = await connection.query(`
      SELECT COUNT(*) as count FROM logs WHERE created_at >= ?
    `, [retentionDateStr]);
    
    const [oldLogs] = await connection.query(`
      SELECT COUNT(*) as count FROM logs WHERE created_at < ?
    `, [retentionDateStr]);
    
    // นับจำนวน alerts
    const [totalAlerts] = await connection.query('SELECT COUNT(*) as count FROM alerts');
    
    // ข้อมูลขนาดตาราง
    const [tableSize] = await connection.query(`
      SELECT 
        table_name as tableName,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) as sizeMB
      FROM information_schema.TABLES 
      WHERE table_schema = 'logdb' 
        AND table_name IN ('logs', 'alerts')
      ORDER BY (data_length + index_length) DESC
    `);
    
    const info = {
      totalLogs: totalLogs[0].count,
      recentLogs: recentLogs[0].count,
      oldLogs: oldLogs[0].count,
      totalAlerts: totalAlerts[0].count,
      retentionDays: RETENTION_DAYS,
      tablesSizeMB: tableSize
    };
    
    console.log('Database Statistics:');
    console.log(`   - Total logs: ${info.totalLogs.toLocaleString()}`);
    console.log(`   - Recent logs (${RETENTION_DAYS} days): ${info.recentLogs.toLocaleString()}`);
    console.log(`   - Old logs (ready for cleanup): ${info.oldLogs.toLocaleString()}`);
    console.log(`   - Total alerts: ${info.totalAlerts.toLocaleString()}`);
    console.log(`   - Tables size:`, info.tablesSizeMB);
    
    return info;
    
  } catch (err) {
    console.error('❌ Error getting data size info:', err);
    return null;
  }
}

// เริ่มต้น retention service
function startRetentionService() {
  // รันทันที
  console.log('🚀 Starting Data Retention Service...');
  getDataSizeInfo();
  
  // รันการทำความสะอาดทุกวันที่ 02:00 น. (7200000 ms = 2 hours)
  // สำหรับ demo ให้รันทุก 30 นาที (1800000 ms)
  const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  
  setInterval(async () => {
    console.log('🕐 Running scheduled cleanup...');
    await getDataSizeInfo();
    await cleanupOldLogs();
  }, CLEANUP_INTERVAL);
  
  console.log(`⏰ Retention service scheduled - cleanup every 30 minutes`);
  console.log(`📝 Retention policy: Keep logs for ${RETENTION_DAYS} days, alerts for 30 days`);
}


async function manualCleanup() {
  console.log('🔧 Manual cleanup initiated...');
  await getDataSizeInfo();
  await cleanupOldLogs();
  await getDataSizeInfo();
}

module.exports = {
  startRetentionService,
  cleanupOldLogs,
  getDataSizeInfo,
  manualCleanup,
  RETENTION_DAYS
};
