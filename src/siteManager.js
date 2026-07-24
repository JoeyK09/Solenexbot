const { v4: uuidv4 } = require('uuid');
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

async function createSite({ ownerId, slug, siteType, config = {} }) {
  const cleanSlug = normalizeSlug(slug);
  if (!SLUG_RE.test(cleanSlug)) {
    throw new Error('Slug must be 3-40 characters: lowercase letters, numbers, and hyphens only.');
  }

  const existing = await db.query('SELECT id FROM sites WHERE slug = $1', [cleanSlug]);
  if (existing.rows.length) {
    const err = new Error(`The link solenex.app/s/${cleanSlug} is already taken.`);
    err.status = 409;
    throw err;
  }

  const id = uuidv4();
  await db.query(
    `INSERT INTO sites (id, owner_id, slug, site_type, config_json, active)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [id, ownerId, cleanSlug, siteType || 'linkbio', config]
  );

  return getSiteById(id);
}

async function getSiteById(id) {
  const result = await db.query('SELECT * FROM sites WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function getSiteBySlug(slug) {
  const result = await db.query('SELECT * FROM sites WHERE slug = $1', [normalizeSlug(slug)]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function listSitesForOwner(ownerId) {
  const result = await db.query('SELECT * FROM sites WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return result.rows.map(row => ({ ...row, config: row.config_json }));
}

async function updateSiteConfig(id, ownerId, config) {
  const site = await getSiteById(id);
  if (!site || site.owner_id !== ownerId) return null;
  await db.query('UPDATE sites SET config_json = $1 WHERE id = $2', [config, id]);
  return getSiteById(id);
}

async function deleteSite(id, ownerId) {
  const site = await getSiteById(id);
  if (!site || site.owner_id !== ownerId) return false;
  await db.query('DELETE FROM sites WHERE id = $1', [id]);
  return true;
}

module.exports = {
  createSite,
  getSiteById,
  getSiteBySlug,
  listSitesForOwner,
  updateSiteConfig,
  deleteSite,
  normalizeSlug,
};
