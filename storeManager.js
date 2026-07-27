const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('./db');

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

function normalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- Stores ----

async function createStore({ ownerId, slug, config = {} }) {
  const cleanSlug = normalizeSlug(slug);
  if (!SLUG_RE.test(cleanSlug)) {
    throw new Error('Slug must be 3-40 characters: lowercase letters, numbers, and hyphens only.');
  }

  const existing = await db.query('SELECT id FROM stores WHERE slug = $1', [cleanSlug]);
  if (existing.rows.length) {
    const err = new Error(`The link solenex.app/store/${cleanSlug} is already taken.`);
    err.status = 409;
    throw err;
  }

  const id = uuidv4();
  const webhookSecret = crypto.randomBytes(24).toString('hex');
  await db.query(
    `INSERT INTO stores (id, owner_id, slug, config_json, webhook_secret, active)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [id, ownerId, cleanSlug, config, webhookSecret]
  );

  return getStoreById(id);
}

async function getStoreById(id) {
  const result = await db.query('SELECT * FROM stores WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function getStoreBySlug(slug) {
  const result = await db.query('SELECT * FROM stores WHERE slug = $1', [normalizeSlug(slug)]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function listStoresForOwner(ownerId) {
  const result = await db.query('SELECT * FROM stores WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return result.rows.map(row => ({ ...row, config: row.config_json }));
}

async function deleteStore(id, ownerId) {
  const store = await getStoreById(id);
  if (!store || store.owner_id !== ownerId) return false;
  await db.query('DELETE FROM stores WHERE id = $1', [id]);
  return true;
}

// ---- Products ----

async function createProduct({ storeId, name, description, price, currency, imageUrl, deliveryInfo }) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO products (id, store_id, name, description, price, currency, image_url, delivery_info, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
    [id, storeId, name, description || null, price, currency || 'USD', imageUrl || null, deliveryInfo || null]
  );
  return getProductById(id);
}

async function getProductById(id) {
  const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listProductsForStore(storeId) {
  const result = await db.query('SELECT * FROM products WHERE store_id = $1 ORDER BY created_at DESC', [storeId]);
  return result.rows;
}

async function deleteProduct(id, storeId) {
  const result = await db.query('DELETE FROM products WHERE id = $1 AND store_id = $2', [id, storeId]);
  return result.rowCount > 0;
}

async function incrementViews(id) {
  await db.query('UPDATE stores SET views = views + 1 WHERE id = $1', [id]);
}

module.exports = {
  createStore,
  getStoreById,
  getStoreBySlug,
  listStoresForOwner,
  deleteStore,
  createProduct,
  getProductById,
  listProductsForStore,
  deleteProduct,
  normalizeSlug,
  incrementViews,
};
