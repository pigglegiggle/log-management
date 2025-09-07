const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const connection = require('../db');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const [existingUser] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'มีชื่อผู้ใช้นี้ในระบบแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (username, password, role, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [username, hashedPassword, role || 'tenant']
    );

    res.json({ success: true, message: 'เพิ่มผู้ใช้แล้ว', userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await connection.query(
      'SELECT id, username, password, role FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
    }

    const user = users[0];
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

module.exports = router;
