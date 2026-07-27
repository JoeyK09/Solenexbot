const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('./db');
const { sendDeliveryEmail } = require('./email');

// ---- Account-level SMTP settings ----

async function getSmtpSettings(ownerId) {
  const result = await db.query('SELECT settings_json FROM users WHERE id = $1', [ownerId]);
  return result.rows[0]?.settings_json?.smtp || null;
}

async function setSmtpSettings(ownerId, smtp) {
  await db.query(
    `UPDATE users SET settings_json = jsonb_set(settings_json, '{smtp}', $1::jsonb, true) WHERE id = $2`,
    [JSON.stringify(smtp), ownerId]
  );
}

// ---- Lists ----

async function createList({ ownerId, name }) {
  const id = uuidv4();
  await db.query('INSERT INTO email_lists (id, owner_id, name) VALUES ($1, $2, $3)', [id, ownerId, name]);
  return getListById(id);
}

async function getListById(id) {
  const result = await db.query('SELECT * FROM email_lists WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listListsForOwner(ownerId) {
  const result = await db.query('SELECT * FROM email_lists WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return result.rows;
}

async function deleteList(id, ownerId) {
  const list = await getListById(id);
  if (!list || list.owner_id !== ownerId) return false;
  await db.query('DELETE FROM email_lists WHERE id = $1', [id]);
  return true;
}

// ---- Contacts ----

async function addContact({ listId, email, name }) {
  const id = uuidv4();
  const token = crypto.randomBytes(16).toString('hex');
  await db.query(
    `INSERT INTO email_contacts (id, list_id, email, name, subscribed, unsubscribe_token)
     VALUES ($1, $2, $3, $4, TRUE, $5)
     ON CONFLICT (list_id, email) DO UPDATE SET name = EXCLUDED.name`,
    [id, listId, email.toLowerCase().trim(), name || null, token]
  );
  return true;
}

/**
 * Adds many contacts at once from pasted text, one per line, formatted
 * as "email" or "email, name". Skips blank lines and lines without an
 * email-shaped string. Returns how many were added.
 */
async function addContactsBulk({ listId, rawText }) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let added = 0;
  for (const line of lines) {
    const [emailPart, ...nameParts] = line.split(',');
    const email = (emailPart || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    await addContact({ listId, email, name: nameParts.join(',').trim() || null });
    added++;
  }
  return added;
}

async function listContactsForList(listId) {
  const result = await db.query('SELECT * FROM email_contacts WHERE list_id = $1 ORDER BY created_at DESC', [listId]);
  return result.rows;
}

async function countSubscribedContacts(listId) {
  const result = await db.query(
    'SELECT COUNT(*)::int AS count FROM email_contacts WHERE list_id = $1 AND subscribed = TRUE',
    [listId]
  );
  return result.rows[0].count;
}

async function deleteContact(id, listId) {
  const result = await db.query('DELETE FROM email_contacts WHERE id = $1 AND list_id = $2', [id, listId]);
  return result.rowCount > 0;
}

async function unsubscribeContact(contactId, token) {
  const result = await db.query(
    `UPDATE email_contacts SET subscribed = FALSE WHERE id = $1 AND unsubscribe_token = $2 RETURNING *`,
    [contactId, token]
  );
  return result.rows[0] || null;
}

// ---- Campaigns ----

async function createCampaign({ ownerId, listId, subject, body, scheduledAt }) {
  const id = uuidv4();
  const status = scheduledAt ? 'scheduled' : 'sending';
  await db.query(
    `INSERT INTO email_campaigns (id, owner_id, list_id, subject, body, status, scheduled_at, total_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT COUNT(*) FROM email_contacts WHERE list_id = $3 AND subscribed = TRUE))`,
    [id, ownerId, listId, subject, body, status, scheduledAt || null]
  );
  return getCampaignById(id);
}

async function getCampaignById(id) {
  const result = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listCampaignsForList(listId) {
  const result = await db.query('SELECT * FROM email_campaigns WHERE list_id = $1 ORDER BY created_at DESC', [listId]);
  return result.rows;
}

async function findDueScheduledCampaigns() {
  const result = await db.query(`SELECT * FROM email_campaigns WHERE status = 'scheduled' AND scheduled_at <= NOW()`);
  return result.rows;
}

/**
 * Sends a campaign to every subscribed contact on its list, one at a
 * time with a short delay to stay well within typical SMTP provider
 * rate limits. Each email includes a one-click unsubscribe link.
 */
async function sendCampaignNow(campaignId) {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return;

  await db.query(`UPDATE email_campaigns SET status = 'sending' WHERE id = $1`, [campaignId]);

  const smtp = await getSmtpSettings(campaign.owner_id);
  if (!smtp) {
    await db.query(`UPDATE email_campaigns SET status = 'failed' WHERE id = $1`, [campaignId]);
    return;
  }

  const contactsResult = await db.query(
    'SELECT * FROM email_contacts WHERE list_id = $1 AND subscribed = TRUE',
    [campaign.list_id]
  );

  let sent = 0;
  let failed = 0;

  for (const contact of contactsResult.rows) {
    const unsubscribeUrl = `${process.env.BASE_URL}/email/unsubscribe/${contact.id}?token=${contact.unsubscribe_token}`;
    const result = await sendDeliveryEmail({
      smtp,
      to: contact.email,
      subject: campaign.subject,
      text: `${campaign.body}\n\n---\nUnsubscribe: ${unsubscribeUrl}`,
    });
    if (result.sent) sent++; else failed++;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  await db.query(
    `UPDATE email_campaigns SET status = 'sent', sent_count = $1, failed_count = $2, sent_at = NOW() WHERE id = $3`,
    [sent, failed, campaignId]
  );
}

module.exports = {
  getSmtpSettings,
  setSmtpSettings,
  createList,
  getListById,
  listListsForOwner,
  deleteList,
  addContact,
  addContactsBulk,
  listContactsForList,
  countSubscribedContacts,
  deleteContact,
  unsubscribeContact,
  createCampaign,
  getCampaignById,
  listCampaignsForList,
  findDueScheduledCampaigns,
  sendCampaignNow,
};
