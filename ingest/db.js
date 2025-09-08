require('dotenv').config();
const mysql = require('mysql2/promise');

// สร้าง connection pool
const connection = mysql.createPool({
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


module.exports = {
  connection,
};
