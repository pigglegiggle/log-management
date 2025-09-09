const express = require('express');
const auth = require('../middleware/auth');
const { getDataSizeInfo, manualCleanup, RETENTION_LOG_DAYS } = require('../services/retentionService');

const router = express.Router();

// ดูข้อมูล retention สถิติ
router.get('/stats', auth, async (req, res) => {
  try {
    const { role } = req.user;
    
    // เฉพาะ admin เท่านั้น
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const stats = await getDataSizeInfo();
    
    return res.json({ 
      success: true, 
      retentionPolicy: {
        logRetentionDays: RETENTION_LOG_DAYS,
        alertRetentionDays: 30
      },
      stats: stats 
    });
  } catch (err) {
    console.error('Error fetching retention stats:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// รัน manual cleanup
router.post('/cleanup', auth, async (req, res) => {
  try {
    const { role } = req.user;
    
    // เฉพาะ admin เท่านั้น
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    console.log(`Manual cleanup requested by admin: ${req.user.username}`);
    
    const beforeStats = await getDataSizeInfo();
    await manualCleanup();
    const afterStats = await getDataSizeInfo();
    
    return res.json({ 
      success: true, 
      message: 'Manual cleanup completed',
      before: beforeStats,
      after: afterStats
    });
  } catch (err) {
    console.error('Error during manual cleanup:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
