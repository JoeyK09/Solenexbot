const express = require('express');
const { requireAuth, getUserById } = require('../auth');
const { limitsFor } = require('../plans');
const bookingManager = require('../bookingManager');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const pages = await bookingManager.listBookingPagesForOwner(req.userId);
  res.json({ pages });
});

router.post('/', async (req, res) => {
  const { slug, config } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required.' });

  const user = await getUserById(req.userId);
  const limits = limitsFor(user.plan);
  const current = await bookingManager.listBookingPagesForOwner(req.userId);
  const max = limits.maxBookingPages ?? limits.maxSites;
  if (current.length >= max) {
    return res.status(403).json({ error: `Your ${user.plan} plan allows up to ${max} booking page(s). Upgrade to add more.` });
  }

  try {
    const page = await bookingManager.createBookingPage({ ownerId: req.userId, slug, config: config || {} });
    res.status(201).json({ page });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const ok = await bookingManager.deleteBookingPage(req.params.id, req.userId);
  if (!ok) return res.status(404).json({ error: 'Booking page not found.' });
  res.json({ ok: true });
});

async function assertOwnedPage(req, res) {
  const page = await bookingManager.getBookingPageById(req.params.pageId);
  if (!page || page.owner_id !== req.userId) {
    res.status(404).json({ error: 'Booking page not found.' });
    return null;
  }
  return page;
}

router.get('/:pageId/services', async (req, res) => {
  const page = await assertOwnedPage(req, res);
  if (!page) return;
  const services = await bookingManager.listServicesForPage(page.id);
  res.json({ services });
});

router.post('/:pageId/services', async (req, res) => {
  const page = await assertOwnedPage(req, res);
  if (!page) return;
  const { name, durationMinutes, price, currency } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });
  const service = await bookingManager.createService({ bookingPageId: page.id, name, durationMinutes, price, currency });
  res.status(201).json({ service });
});

router.delete('/:pageId/services/:serviceId', async (req, res) => {
  const page = await assertOwnedPage(req, res);
  if (!page) return;
  const ok = await bookingManager.deleteService(req.params.serviceId, page.id);
  if (!ok) return res.status(404).json({ error: 'Service not found.' });
  res.json({ ok: true });
});

router.get('/:pageId/bookings', async (req, res) => {
  const page = await assertOwnedPage(req, res);
  if (!page) return;
  const bookings = await bookingManager.listBookingsForPage(page.id);
  res.json({ bookings });
});

router.post('/:pageId/bookings/:bookingId/cancel', async (req, res) => {
  const page = await assertOwnedPage(req, res);
  if (!page) return;
  const booking = await bookingManager.cancelBooking(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking });
});

module.exports = router;
