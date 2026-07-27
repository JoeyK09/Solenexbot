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

  // Stores: each owner can run one or more storefronts, each with its
  // own products and its own payment method configuration.
  await query(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      webhook_secret TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      image_url TEXT,
      delivery_info TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Payments: one row per transaction attempt, across every provider
  // (Stars, M-Pesa, PayPal, crypto) and every source (bot subscriptions,
  // store orders). external_ref holds the provider's own transaction/
  // checkout ID so callbacks can find the right row.
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, -- mpesa | paypal | crypto | stars
      external_ref TEXT,
      telegram_user_id BIGINT,
      telegram_username TEXT,
      amount NUMERIC,
      currency TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
      meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_payments_external_ref ON payments (external_ref);`);

  // Backward-compatible additions for store orders -- ADD COLUMN IF NOT
  // EXISTS so this is safe to run against a payments table that already
  // existed before stores did.
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES stores(id) ON DELETE CASCADE;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id) ON DELETE CASCADE;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS buyer_contact TEXT;`);

  // Booking pages: each owner can run one or more appointment-booking
  // pages, each with its own services and weekly availability (stored
  // as config_json.availability -- see bookingManager.js for shape).
  await query(`
    CREATE TABLE IF NOT EXISTS booking_pages (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      booking_page_id TEXT NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      price NUMERIC,
      currency TEXT DEFAULT 'USD',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_page_id TEXT NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
      service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_page_time ON bookings (booking_page_id, start_time);`);

  // Bot contacts: every unique Telegram user who has ever messaged a
  // given bot, regardless of bot template. This is what broadcasts send
  // to -- bot_subscribers (paid, subscription-only) stays separate.
  await query(`
    CREATE TABLE IF NOT EXISTS bot_contacts (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      telegram_user_id BIGINT NOT NULL,
      telegram_username TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(bot_id, telegram_user_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed
      scheduled_at TIMESTAMPTZ,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
  `);

  // Backward-compatible view counters for analytics, added to whichever
  // of these tables already existed before analytics did.
  await query(`ALTER TABLE sites ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;`);
  await query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;`);
  await query(`ALTER TABLE booking_pages ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;`);

  // AI chatbot conversation history -- gives the model context across a
  // user's messages. Trimmed to recent turns when building each request,
  // not deleted here, so a full transcript is still available if needed.
  await query(`
    CREATE TABLE IF NOT EXISTS bot_conversations (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      telegram_user_id BIGINT NOT NULL,
      role TEXT NOT NULL, -- user | assistant
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_bot_conversations_lookup ON bot_conversations (bot_id, telegram_user_id, created_at);`);

  // Account-level settings (e.g. a shared SMTP config for email marketing,
  // separate from the per-store/per-booking-page SMTP configs).
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS settings_json JSONB NOT NULL DEFAULT '{}'::jsonb;`);

  await query(`
    CREATE TABLE IF NOT EXISTS email_lists (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS email_contacts (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      subscribed BOOLEAN NOT NULL DEFAULT TRUE,
      unsubscribe_token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(list_id, email)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      list_id TEXT NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed
      scheduled_at TIMESTAMPTZ,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
  `);

  // WhatsApp channels: one per Meta WhatsApp Business phone number.
  // A single shared webhook (see server.js) routes inbound messages to
  // the right channel by matching phone_number_id from Meta's payload.
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_channels (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone_number_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Marketplace: sellers list a reusable config (bot/site/store/booking
  // template) as JSON; buyers unlock it for free or by paying the
  // seller directly via the seller's own NOWPayments key.
  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id TEXT PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL, -- bot | site | store | booking
      template_type TEXT,     -- e.g. faq, subscription, ai, linkbio, landing
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      price_usd NUMERIC NOT NULL DEFAULT 0,
      nowpayments_api_key TEXT,
      ipn_secret TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_purchases (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'free', -- free | crypto
      external_ref TEXT,
      status TEXT NOT NULL DEFAULT 'completed', -- pending | completed | failed
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(listing_id, buyer_id)
    );
  `);

  // Platform billing: users paying Solenex itself to upgrade their plan.
  // plan_expires_at drives the downgrade-back-to-free check in server.js.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;`);

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      provider TEXT NOT NULL, -- mpesa | paypal | crypto
      external_ref TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
      amount NUMERIC,
      currency TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_external_ref ON subscriptions (provider, external_ref);`);
}

module.exports = { pool, query, init };
