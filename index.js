const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

function query(text, params) {
  return pool.query(text, params);
}

/**
 * Creates all tables if they don't exist yet. Call this once on server startup.
 * Safe to run every boot -- IF NOT EXISTS makes it a no-op after the first run.
 */
async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free', -- free | starter | pro | business
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Bots: each row is one Telegram bot owned by a user.
  // This is the core multi-tenant table -- one server process
  // handles every bot by looking up its config here at request time.
  await query(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,               -- public bot id used in webhook URL, e.g. uuid
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      telegram_token TEXT NOT NULL,      -- token from BotFather (encrypt at rest in real prod)
      telegram_bot_username TEXT,
      template_type TEXT NOT NULL,       -- faq | subscription | order | custom
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      webhook_secret TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Bot subscribers: end-users who talk to / pay a given bot
  // (used by the subscription template to gate channel access)
  await query(`
    CREATE TABLE IF NOT EXISTS bot_subscribers (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      telegram_user_id BIGINT NOT NULL,
      telegram_username TEXT,
      status TEXT NOT NULL DEFAULT 'free', -- free | active | expired
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(bot_id, telegram_user_id)
    );
  `);

  // Simple event log for analytics (messages, payments, etc.)
  await query(`
    CREATE TABLE IF NOT EXISTS bot_events (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL, -- message_in | payment | subscribe | error
      meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Sites: link-in-bio pages and (later) landing pages.
  // slug is globally unique -- it's the public path at /s/:slug
  await query(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      site_type TEXT NOT NULL DEFAULT 'linkbio', -- linkbio | landing
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = { pool, query, init };
