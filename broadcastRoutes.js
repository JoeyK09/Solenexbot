const express = require('express');
const { requireAuth } = require('../auth');
const botManager = require('../botManager');
const broadcastManager = require('../broadcastManager');

const router = express.Router();
router.use(requireAuth);

async function assertOwnedBot(req, res) {
  const bot = await botManager.getBotById(req.params.botId);
  if (!bot || bot.owner_id !== req.userId) {
    res.status(404).json({ error: 'Bot not found.' });
    return null;
  }
  return bot;
}

router.get('/:botId/contacts/count', async (req, res) => {
  const bot = await assertOwnedBot(req, res);
  if (!bot) return;
  const count = await broadcastManager.countContactsForBot(bot.id);
  res.json({ count });
});

router.get('/:botId/broadcasts', async (req, res) => {
  const bot = await assertOwnedBot(req, res);
  if (!bot) return;
  const broadcasts = await broadcastManager.listBroadcastsForBot(bot.id);
  res.json({ broadcasts });
});

router.post('/:botId/broadcasts', async (req, res) => {
  const bot = await assertOwnedBot(req, res);
  if (!bot) return;

  const { message, scheduledAt } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'message is required.' });

  const broadcast = await broadcastManager.createBroadcast({ botId: bot.id, message: message.trim(), scheduledAt });

  // Immediate (non-scheduled) broadcasts start sending right away in the
  // background -- the request returns before sending finishes.
  if (broadcast.status === 'sending') {
    broadcastManager.sendBroadcastNow(broadcast.id).catch(err => console.error('Broadcast send error:', err));
  }

  res.status(201).json({ broadcast });
});

module.exports = router;
