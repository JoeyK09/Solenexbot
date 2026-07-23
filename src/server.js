require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const botRoutes = require('./routes/botRoutes');
const botManager = require('./botManager');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);

/**
 * SHARED WEBHOOK ENDPOINT
 * Every tenant bot's Telegram webhook points here, distinguished by :botId.
 * This is the heart of the multi-tenant design: one process, one route,
 * infinite bots -- each request just does a DB lookup to find out how to
 * behave. Telegram also sends a secret token header we verify per-bot,
 * so bot IDs can't be guessed/spoofed to inject fake updates.
 */
app.post('/webhook/:botId', async (req, res) => {
  const { botId } = req.params;
  const secretHeader = req.header('X-Telegram-Bot-Api-Secret-Token');

  const result = await botManager.handleUpdate(botId, secretHeader, req.body);
  res.status(result.status).json(result.body);
});

const PORT = process.env.PORT || 3000;

// Create tables (if they don't exist yet) before accepting traffic.
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Solenex bot engine listening on port ${PORT}`);
      console.log(`Webhook base: ${process.env.BASE_URL || '(set BASE_URL in .env)'}/webhook/:botId`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
