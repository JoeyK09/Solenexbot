const express = require('express');
const { requireAuth, getUserById } = require('../auth');
const { PLAN_PRICING } = require('../plans');
const billingManager = require('../billingManager');

const router = express.Router();
router.use(requireAuth);

router.get('/plans', (req, res) => {
  res.json({ pricing: PLAN_PRICING, availableProviders: billingManager.availableProviders() });
});

router.get('/status', async (req, res) => {
  const user = await getUserById(req.userId);
  res.json({ plan: user.plan, planExpiresAt: user.plan_expires_at });
});

router.post('/upgrade', async (req, res) => {
  const { plan, provider, phone } = req.body;
  if (!['starter', 'pro', 'business'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan.' });
  }

  try {
    if (provider === 'mpesa') {
      if (!phone) return res.status(400).json({ error: 'Phone number is required for M-Pesa.' });
      const result = await billingManager.initiateMpesaUpgrade({ userId: req.userId, plan, phone });
      return res.json(result);
    }
    if (provider === 'paypal') {
      const result = await billingManager.initiatePaypalUpgrade({ userId: req.userId, plan });
      return res.json(result);
    }
    if (provider === 'crypto') {
      const result = await billingManager.initiateCryptoUpgrade({ userId: req.userId, plan });
      return res.json(result);
    }
    return res.status(400).json({ error: 'Invalid payment provider.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
