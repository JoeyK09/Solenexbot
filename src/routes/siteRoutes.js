const express = require('express');
const { requireAuth, getUserById } = require('../auth');
const { limitsFor } = require('../plans');
const siteManager = require('../siteManager');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const sites = await siteManager.listSitesForOwner(req.userId);
  res.json({ sites });
});

router.post('/', async (req, res) => {
  const { slug, siteType, config } = req.body;
  if (!slug) {
    return res.status(400).json({ error: 'slug is required.' });
  }

  const user = await getUserById(req.userId);
  const limits = limitsFor(user.plan);
  const currentSites = await siteManager.listSitesForOwner(req.userId);
  if (currentSites.length >= limits.maxSites) {
    return res.status(403).json({
      error: `Your ${user.plan} plan allows up to ${limits.maxSites} site(s). Upgrade to add more.`,
    });
  }

  try {
    const site = await siteManager.createSite({
      ownerId: req.userId,
      slug,
      siteType: siteType || 'linkbio',
      config: config || {},
    });
    res.status(201).json({ site });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { config } = req.body;
  const site = await siteManager.updateSiteConfig(req.params.id, req.userId, config || {});
  if (!site) return res.status(404).json({ error: 'Site not found.' });
  res.json({ site });
});

router.delete('/:id', async (req, res) => {
  const ok = await siteManager.deleteSite(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Site not found.' });
  res.json({ ok: true });
});

module.exports = router;
