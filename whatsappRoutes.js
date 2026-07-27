const express = require('express');
const { requireAuth } = require('../auth');
const { limitsFor } = require('../plans');
const { getUserById } = require('../auth');
const whatsappManager = require('../whatsappManager');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const channels = await whatsappManager.listChannelsForOwner(req.userId);
  res.json({ channels });
});

router.post('/', async (req, res) => {
  const { name, phoneNumberId, accessToken, config } = req.body;
  if (!name || !phoneNumberId || !accessToken) {
    return res.status(400).json({ error: 'name, phoneNumberId, and accessToken are required.' });
  }

  const user = await getUserById(req.userId);
  const limits = limitsFor(user.plan);
  const current = await whatsappManager.listChannelsForOwner(req.userId);
  const max = limits.maxWhatsappChannels ?? limits.maxBots;
  if (current.length >= max) {
    return res.status(403).json({ error: `Your ${user.plan} plan allows up to ${max} WhatsApp channel(s). Upgrade to add more.` });
  }

  try {
    const channel = await whatsappManager.createChannel({
      ownerId: req.userId, name, phoneNumberId, accessToken, config: config || {},
    });
    res.status(201).json({ channel });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const ok = await whatsappManager.deleteChannel(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Channel not found.' });
  res.json({ ok: true });
});

module.exports = router;
