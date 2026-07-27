const express = require('express');
const { requireAuth } = require('../auth');
const em = require('../emailMarketing');

const router = express.Router();
router.use(requireAuth);

// ---- SMTP settings (account-level, shared by every list) ----

router.get('/settings/smtp', async (req, res) => {
  const smtp = await em.getSmtpSettings(req.userId);
  res.json({ smtp });
});

router.put('/settings/smtp', async (req, res) => {
  await em.setSmtpSettings(req.userId, req.body.smtp || {});
  res.json({ ok: true });
});

// ---- Lists ----

router.get('/lists', async (req, res) => {
  const lists = await em.listListsForOwner(req.userId);
  res.json({ lists });
});

router.post('/lists', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });
  const list = await em.createList({ ownerId: req.userId, name });
  res.status(201).json({ list });
});

router.delete('/lists/:id', async (req, res) => {
  const ok = await em.deleteList(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'List not found.' });
  res.json({ ok: true });
});

async function assertOwnedList(req, res) {
  const list = await em.getListById(req.params.listId);
  if (!list || list.owner_id !== req.userId) {
    res.status(404).json({ error: 'List not found.' });
    return null;
  }
  return list;
}

// ---- Contacts ----

router.get('/lists/:listId/contacts', async (req, res) => {
  const list = await assertOwnedList(req, res);
  if (!list) return;
  const contacts = await em.listContactsForList(list.id);
  res.json({ contacts });
});

router.post('/lists/:listId/contacts', async (req, res) => {
  const list = await assertOwnedList(req, res);
  if (!list) return;
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });
  await em.addContact({ listId: list.id, email, name });
  res.status(201).json({ ok: true });
});

router.post('/lists/:listId/contacts/bulk', async (req, res) => {
  const list = await assertOwnedList(req, res);
  if (!list) return;
  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'rawText is required.' });
  const added = await em.addContactsBulk({ listId: list.id, rawText });
  res.json({ added });
});

router.delete('/lists/:listId/contacts/:contactId', async (req, res) => {
  const list = await assertOwnedList(req, res);
  if (!list) return;
  const ok = await em.deleteContact(req.params.contactId, list.id);
  if (!ok) return res.status(404).json({ error: 'Contact not found.' });
  res.json({ ok: true });
});

// ---- Campaigns ----

router.get('/lists/:listId/campaigns', async (req, res) => {
  const list = await assertOwnedList(req, res);
  if (!list) return;
  const campaigns = await em.listCampaignsForList(list.id);
  res.json({ campaigns });
});

router.post('/lists/:listId/campaigns', async (req, res) => {
  const list = await assertOwnedList(req, res);
  if (!list) return;

  const { subject, body, scheduledAt } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'subject and body are required.' });

  const smtp = await em.getSmtpSettings(req.userId);
  if (!smtp) return res.status(400).json({ error: 'Set up your SMTP settings before sending a campaign.' });

  const campaign = await em.createCampaign({ ownerId: req.userId, listId: list.id, subject, body, scheduledAt });

  if (campaign.status === 'sending') {
    em.sendCampaignNow(campaign.id).catch(err => console.error('Campaign send error:', err));
  }

  res.status(201).json({ campaign });
});

module.exports = router;
