const express = require('express');
const { requireAuth } = require('../auth');
const marketplaceManager = require('../marketplaceManager');

const router = express.Router();
router.use(requireAuth);

router.get('/listings', async (req, res) => {
  const listings = await marketplaceManager.listActiveListings();
  res.json({ listings });
});

router.get('/my-listings', async (req, res) => {
  const listings = await marketplaceManager.listListingsForSeller(req.userId);
  res.json({ listings });
});

router.post('/listings', async (req, res) => {
  const { title, description, category, templateType, config, priceUsd, nowpaymentsApiKey } = req.body;
  if (!title || !category || !config) {
    return res.status(400).json({ error: 'title, category, and config are required.' });
  }
  if (priceUsd > 0 && !nowpaymentsApiKey) {
    return res.status(400).json({ error: 'A NOWPayments API key is required for paid listings.' });
  }

  let parsedConfig;
  try {
    parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
  } catch (err) {
    return res.status(400).json({ error: 'config must be valid JSON.' });
  }

  const listing = await marketplaceManager.createListing({
    sellerId: req.userId, title, description, category, templateType, config: parsedConfig, priceUsd, nowpaymentsApiKey,
  });
  res.status(201).json({ listing });
});

router.delete('/listings/:id', async (req, res) => {
  const ok = await marketplaceManager.deleteListing(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ ok: true });
});

router.post('/listings/:id/purchase', async (req, res) => {
  const listing = await marketplaceManager.getListingById(req.params.id);
  if (!listing || !listing.active) return res.status(404).json({ error: 'Listing not found.' });

  if (Number(listing.price_usd) === 0) {
    await marketplaceManager.unlockFree(listing.id, req.userId);
    return res.json({ unlocked: true });
  }

  try {
    const invoiceUrl = await marketplaceManager.startPaidPurchase(listing, req.userId);
    res.json({ invoiceUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/listings/:id/config', async (req, res) => {
  const listing = await marketplaceManager.getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  const isSeller = listing.seller_id === req.userId;
  const isFree = Number(listing.price_usd) === 0;
  const purchased = isSeller || isFree || await marketplaceManager.hasPurchased(listing.id, req.userId);

  if (!purchased) return res.status(402).json({ error: 'Purchase this listing to view its config.' });
  res.json({ config: listing.config });
});

router.get('/my-purchases', async (req, res) => {
  const purchases = await marketplaceManager.listPurchasesForBuyer(req.userId);
  res.json({ purchases });
});

module.exports = router;
