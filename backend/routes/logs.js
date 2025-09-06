const express = require('express');
const router = express.Router();
const { getTenantModel, FirewallLog, NetworkLog } = require('../models/logs');
const authenticate = require('../middleware/auth'); // JWT middleware

/**
 * GET /logs
 * ถ้าเป็น admin → query ทุก tenant + global logs
 * ถ้าเป็น tenant → query เฉพาะ tenant ของตัวเอง
 */
router.get('/', authenticate, async (req, res) => {
  const { role, username } = req.user; // assume JWT decoded แล้วใส่ req.user

  try {
    const results = {};

    if (role === 'admin') {
      // list tenant ของคุณ
      const tenantTables = ['demoA', 'demoB'];

      for (const tenant of tenantTables) {
        const Log = await getTenantModel(tenant);
        results[tenant] = await Log.findAll({
          limit: 100,
          order: [['timestamp', 'DESC']],
        });
      }

      // Global logs
      results['firewall'] = await FirewallLog.findAll({
        limit: 100,
        order: [['timestamp', 'DESC']],
      });
      results['network'] = await NetworkLog.findAll({
        limit: 100,
        order: [['timestamp', 'DESC']],
      });
    } else {
      // tenant query เฉพาะของตัวเอง
      const Log = await getTenantModel(username);
      results[username] = await Log.findAll({
        limit: 100,
        order: [['timestamp', 'DESC']],
      });
    }

    res.json({ success: true, logs: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
