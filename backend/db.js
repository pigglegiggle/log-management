require('dotenv').config();
const mysql = require('mysql2/promise');

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+00:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = connection;
