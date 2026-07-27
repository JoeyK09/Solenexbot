const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const mpesa = require('./payments/mpesa');
const paypal = require('./payments/paypal');
const nowpayments = require('./payments/nowpayments');
const { PLAN_PRICING } = require('./plans');

const UPGRADE_DURATION_DAYS = 30;

/**
 * Reads Solenex's own payment credentials from environment variables.
 * Each provider is only considered "available" if fully configured --
 * lets the dashboard hide payment methods you haven't set up yet.
 */
function getPlatformConfig() {
  const mpesaReady = process.env.PLATFORM_MPESA_SHORTCODE && process.env.PLATFORM_MPESA_PASSKEY
    && process.env.PLATFORM_MPESA_CONSUMER_KEY && process.env.PLATFORM_MPESA_CONSUMER_SECRET;
  const paypalReady = process.env.PLATFORM_PAYPAL_CLIENT_ID && process.env.PLATFORM_PAYPAL_CLIENT_SECRET;
  const cryptoReady = process.env.PLATFORM_NOWPAYMENTS_API_KEY && process.env.PLATFORM_NOWPAYMENTS_IPN_SECRET;

  return {
    mpesa: mpesaReady ? {
      shortcode: process.env.PLATFORM_MPESA_SHORTCODE,
      passkey: process.env.PLATFORM_MPESA_PASSKEY,
      consumerKey: process.env.PLATFORM_MPESA_CONSUMER_KEY,
      consumerSecret: process.env.PLATFORM_MPESA_CONSUMER_SECRET,
      environment: process.env.PLATFORM_MPESA_ENVIRONMENT || 'sandbox',
    } : null,
    paypal: paypalReady ? {
      clientId: process.env.PLATFORM_PAYPAL_CLIENT_ID,
      clientSecret: process.env.PLATFORM_PAYPAL_CLIENT_SECRET,
      environment: process.env.PLATFORM_PAYPAL_ENVIRONMENT || 'sandbox',
    } : null,
    crypto: cryptoReady ? {
      apiKey: process.env.PLATFORM_NOWPAYMENTS_API_KEY,
      ipnSecret: process.env.PLATFORM_NOWPAYMENTS_IPN_SECRET,
    } : null,
  };
}

function availableProviders() {
  const config = getPlatformConfig();
  return {
    mpesa: !!config.mpesa,
    paypal: !!config.paypal,
    crypto: !!config.crypto,
  };
}

async function createSubscriptionRecord({ userId, plan, provider, externalRef, amount, currency }) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO subscriptions (id, user_id, plan, provider, external_ref, amount, currency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [id, userId, plan, provider, externalRef, amount, currency]
  );
  return id;
}

async function getSubscriptionByExternalRef(provider, externalRef) {
  const result = await db.query(
    'SELECT * FROM subscriptions WHERE provider = $1 AND external_ref = $2 ORDER BY created_at DESC LIMIT 1',
    [provider, externalRef]
  );
  return result.rows[0] || null;
}

/**
 * Marks a subscription payment completed and actually upgrades the
 * user's plan for the next 30 days. This is the one place a user's
 * `plan` column changes as a result of payment.
 */
async function completeSubscription(subscriptionId) {
  const result = await db.query('SELECT * FROM subscriptions WHERE id = $1', [subscriptionId]);
  const sub = result.rows[0];
  if (!sub || sub.status === 'completed') return;

  await db.query(`UPDATE subscriptions SET status = 'completed', completed_at = NOW() WHERE id = $1`, [subscriptionId]);
  await db.query(
    `UPDATE users SET plan = $1, plan_expires_at = NOW() + INTERVAL '${UPGRADE_DURATION_DAYS} days' WHERE id = $2`,
    [sub.plan, sub.user_id]
  );
}

async function failSubscription(subscriptionId) {
  await db.query(`UPDATE subscriptions SET status = 'failed' WHERE id = $1`, [subscriptionId]);
}

/**
 * Downgrades anyone whose paid plan has lapsed back to free. Meant to be
 * called periodically (see the scheduler in server.js).
 */
async function downgradeExpiredPlans() {
  await db.query(
    `UPDATE users SET plan = 'free', plan_expires_at = NULL
     WHERE plan != 'free' AND plan_expires_at IS NOT NULL AND plan_expires_at < NOW()`
  );
}

async function initiateMpesaUpgrade({ userId, plan, phone }) {
  const config = getPlatformConfig().mpesa;
  if (!config) throw new Error('M-Pesa is not configured for platform billing yet.');
  const amount = PLAN_PRICING[plan]?.kes;
  if (!amount) throw new Error('Unknown plan.');

  const callbackUrl = `${process.env.BASE_URL}/webhooks/platform-mpesa?key=${process.env.PLATFORM_WEBHOOK_SECRET}`;
  const result = await mpesa.stkPush({
    ...config,
    phone,
    amount,
    accountReference: `upg-${plan}`.slice(0, 12),
    transactionDesc: `Solenex ${plan} plan`,
    callbackUrl,
  });

  await createSubscriptionRecord({ userId, plan, provider: 'mpesa', externalRef: result.CheckoutRequestID, amount, currency: 'KES' });
  return { message: 'Check your phone to complete payment.' };
}

async function initiatePaypalUpgrade({ userId, plan }) {
  const config = getPlatformConfig().paypal;
  if (!config) throw new Error('PayPal is not configured for platform billing yet.');
  const amount = PLAN_PRICING[plan]?.usd;
  if (!amount) throw new Error('Unknown plan.');

  const { orderId, approveLink } = await paypal.createOrder({
    ...config,
    amount,
    currency: 'USD',
    customId: `${userId}:${plan}`,
    returnUrl: `${process.env.BASE_URL}/billing/paypal/return`,
    cancelUrl: `${process.env.BASE_URL}/billing/paypal/cancel`,
  });

  await createSubscriptionRecord({ userId, plan, provider: 'paypal', externalRef: orderId, amount, currency: 'USD' });
  return { approveLink };
}

async function initiateCryptoUpgrade({ userId, plan }) {
  const config = getPlatformConfig().crypto;
  if (!config) throw new Error('Crypto is not configured for platform billing yet.');
  const amount = PLAN_PRICING[plan]?.usd;
  if (!amount) throw new Error('Unknown plan.');

  const orderId = `upg_${userId}_${plan}_${Date.now()}`;
  const invoice = await nowpayments.createInvoice({
    apiKey: config.apiKey,
    amountUSD: amount,
    orderId,
    description: `Solenex ${plan} plan`,
    ipnCallbackUrl: `${process.env.BASE_URL}/webhooks/platform-nowpayments`,
    successUrl: `${process.env.BASE_URL}/billing/crypto/success`,
    cancelUrl: `${process.env.BASE_URL}/billing/crypto/cancel`,
  });

  await createSubscriptionRecord({ userId, plan, provider: 'crypto', externalRef: orderId, amount, currency: 'USD' });
  return { invoiceUrl: invoice.invoice_url };
}

module.exports = {
  availableProviders,
  getPlatformConfig,
  getSubscriptionByExternalRef,
  completeSubscription,
  failSubscription,
  downgradeExpiredPlans,
  initiateMpesaUpgrade,
  initiatePaypalUpgrade,
  initiateCryptoUpgrade,
};
