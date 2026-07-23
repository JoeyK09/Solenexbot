const express = require('express');
const { requireAuth, getUserById } = require('../auth');
const { limitsFor } = require('../plans');
const botManager = require('../botManager');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const bots = await botManager.listBotsForOwner(req.userId);
  res.json({ bots });
});

router.post('/', async (req, res) => {
  const { name, telegramToken, templateType, config } = req.body;
  if (!name || !telegramToken || !templateType) {
    return res.status(400).json({ error: 'name, telegramToken, and templateType are required.' });
  }

  const user = await getUserById(req.userId);
  const limits = limitsFor(user.plan);
  const currentBots = await botManager.listBotsForOwner(req.userId);
  if (currentBots.length >= limits.maxBots) {
    return res.status(403).json({
      error: `Your ${user.plan} plan allows up to ${limits.maxBots} bot(s). Upgrade to add more.`,
    });
  }

  try {
    const bot = await botManager.createBot({
      ownerId: req.userId,
      name,
      telegramToken,
      templateType,
      config: config || {},
    });
    res.status(201).json({ bot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const ok = await botManager.deleteBot(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Bot not found.' });
  res.json({ ok: true });
});

module.exports = router;
