const express = require('express');
const { requireAuth, getUserById } = require('../auth');
const { limitsFor } = require('../plans');
const storeManager = require('../storeManager');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const stores = await storeManager.listStoresForOwner(req.userId);
  res.json({ stores });
});

router.post('/', async (req, res) => {
  const { slug, config } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required.' });

  const user = await getUserById(req.userId);
  const limits = limitsFor(user.plan);
  const currentStores = await storeManager.listStoresForOwner(req.userId);
  if (currentStores.length >= (limits.maxStores ?? limits.maxSites)) {
    return res.status(403).json({
      error: `Your ${user.plan} plan allows up to ${limits.maxStores ?? limits.maxSites} store(s). Upgrade to add more.`,
    });
  }

  try {
    const store = await storeManager.createStore({ ownerId: req.userId, slug, config: config || {} });
    res.status(201).json({ store });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const ok = await storeManager.deleteStore(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Store not found.' });
  res.json({ ok: true });
});

// ---- Products (nested under a store the caller owns) ----

async function assertOwnedStore(req, res) {
  const store = await storeManager.getStoreById(req.params.storeId);
  if (!store || store.owner_id !== req.userId) {
    res.status(404).json({ error: 'Store not found.' });
    return null;
  }
  return store;
}

router.get('/:storeId/products', async (req, res) => {
  const store = await assertOwnedStore(req, res);
  if (!store) return;
  const products = await storeManager.listProductsForStore(store.id);
  res.json({ products });
});

router.post('/:storeId/products', async (req, res) => {
  const store = await assertOwnedStore(req, res);
  if (!store) return;

  const { name, description, price, currency, imageUrl, deliveryInfo } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required.' });

  const product = await storeManager.createProduct({
    storeId: store.id, name, description, price, currency, imageUrl, deliveryInfo,
  });
  res.status(201).json({ product });
});

router.delete('/:storeId/products/:productId', async (req, res) => {
  const store = await assertOwnedStore(req, res);
  if (!store) return;
  const ok = await storeManager.deleteProduct(req.params.productId, store.id);
  if (!ok) return res.status(404).json({ error: 'Product not found.' });
  res.json({ ok: true });
});

module.exports = router;
