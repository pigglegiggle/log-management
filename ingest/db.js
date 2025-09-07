require('dotenv').config();
const mysql = require('mysql2/promise');

// สร้าง connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'logdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// ฟังก์ชันทดสอบการเชื่อมต่อ
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// ฟังก์ชันรอการเชื่อมต่อฐานข้อมูล
async function waitForDatabase() {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await testConnection();
      console.log('Database is ready');
      break;
    } catch (error) {
      console.log(`Waiting for database... (${retries + 1}/${maxRetries})`);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (retries === maxRetries) {
    console.error('Could not connect to database after maximum retries');
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection,
  waitForDatabase
};
