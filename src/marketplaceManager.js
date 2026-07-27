const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('./db');
const nowpayments = require('./payments/nowpayments');

async function createListing({ sellerId, title, description, category, templateType, config, priceUsd, nowpaymentsApiKey }) {
  const id = uuidv4();
  const ipnSecret = crypto.randomBytes(24).toString('hex');
  await db.query(
    `INSERT INTO marketplace_listings
       (id, seller_id, title, description, category, template_type, config_json, price_usd, nowpayments_api_key, ipn_secret, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
    [id, sellerId, title, description || null, category, templateType || null, config || {}, priceUsd || 0, nowpaymentsApiKey || null, ipnSecret]
  );
  return getListingById(id);
}

async function getListingById(id) {
  const result = await db.query('SELECT * FROM marketplace_listings WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function listActiveListings() {
  const result = await db.query(
    `SELECT id, seller_id, title, description, category, template_type, price_usd, created_at
     FROM marketplace_listings WHERE active = TRUE ORDER BY created_at DESC`
  );
  return result.rows;
}

async function listListingsForSeller(sellerId) {
  const result = await db.query('SELECT * FROM marketplace_listings WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]);
  return result.rows;
}

async function deleteListing(id, sellerId) {
  const result = await db.query('DELETE FROM marketplace_listings WHERE id = $1 AND seller_id = $2', [id, sellerId]);
  return result.rowCount > 0;
}

async function hasPurchased(listingId, buyerId) {
  const result = await db.query(
    `SELECT id FROM marketplace_purchases WHERE listing_id = $1 AND buyer_id = $2 AND status = 'completed'`,
    [listingId, buyerId]
  );
  return result.rows.length > 0;
}

async function unlockFree(listingId, buyerId) {
  await db.query(
    `INSERT INTO marketplace_purchases (id, listing_id, buyer_id, provider, status)
     VALUES ($1, $2, $3, 'free', 'completed')
     ON CONFLICT (listing_id, buyer_id) DO NOTHING`,
    [uuidv4(), listingId, buyerId]
  );
}

/**
 * Starts a paid unlock: creates a NOWPayments invoice using the SELLER's
 * own API key (payment goes to them, this platform never touches funds),
 * and records a pending purchase row to reconcile against the webhook.
 */
async function startPaidPurchase(listing, buyerId) {
  const orderId = `mkt_${listing.id}_${buyerId}_${Date.now()}`;
  const invoice = await nowpayments.createInvoice({
    apiKey: listing.nowpayments_api_key,
    amountUSD: listing.price_usd,
    orderId,
    description: listing.title,
    ipnCallbackUrl: `${process.env.BASE_URL}/webhooks/marketplace-nowpayments/${listing.id}`,
    successUrl: `${process.env.BASE_URL}/marketplace-purchase/success`,
    cancelUrl: `${process.env.BASE_URL}/marketplace-purchase/cancel`,
  });

  await db.query(
    `INSERT INTO marketplace_purchases (id, listing_id, buyer_id, provider, external_ref, status)
     VALUES ($1, $2, $3, 'crypto', $4, 'pending')
     ON CONFLICT (listing_id, buyer_id) DO UPDATE SET external_ref = EXCLUDED.external_ref, status = 'pending'`,
    [uuidv4(), listing.id, buyerId, orderId]
  );

  return invoice.invoice_url;
}

async function getPurchaseByExternalRef(externalRef) {
  const result = await db.query('SELECT * FROM marketplace_purchases WHERE external_ref = $1', [externalRef]);
  return result.rows[0] || null;
}

async function markPurchaseCompleted(id) {
  await db.query(`UPDATE marketplace_purchases SET status = 'completed' WHERE id = $1`, [id]);
}

async function listPurchasesForBuyer(buyerId) {
  const result = await db.query(
    `SELECT p.*, l.title, l.category, l.template_type FROM marketplace_purchases p
     JOIN marketplace_listings l ON l.id = p.listing_id
     WHERE p.buyer_id = $1 AND p.status = 'completed'
     ORDER BY p.created_at DESC`,
    [buyerId]
  );
  return result.rows;
}

module.exports = {
  createListing,
  getListingById,
  listActiveListings,
  listListingsForSeller,
  deleteListing,
  hasPurchased,
  unlockFree,
  startPaidPurchase,
  getPurchaseByExternalRef,
  markPurchaseCompleted,
  listPurchasesForBuyer,
};
