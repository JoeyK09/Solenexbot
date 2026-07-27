const express = require('express');
const { requireAuth } = require('../auth');
const analyticsManager = require('../analyticsManager');

const router = express.Router();
router.use(requireAuth);

router.get('/overview', async (req, res) => {
  const overview = await analyticsManager.getOverview(req.userId);
  res.json({ overview });
});

module.exports = router;
