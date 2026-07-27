const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function normalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- Booking pages ----

async function createBookingPage({ ownerId, slug, config = {} }) {
  const cleanSlug = normalizeSlug(slug);
  if (!SLUG_RE.test(cleanSlug)) {
    throw new Error('Slug must be 3-40 characters: lowercase letters, numbers, and hyphens only.');
  }
  const existing = await db.query('SELECT id FROM booking_pages WHERE slug = $1', [cleanSlug]);
  if (existing.rows.length) {
    const err = new Error(`The link solenex.app/book/${cleanSlug} is already taken.`);
    err.status = 409;
    throw err;
  }

  const id = uuidv4();
  await db.query(
    `INSERT INTO booking_pages (id, owner_id, slug, config_json, active) VALUES ($1, $2, $3, $4, TRUE)`,
    [id, ownerId, cleanSlug, config]
  );
  return getBookingPageById(id);
}

async function getBookingPageById(id) {
  const result = await db.query('SELECT * FROM booking_pages WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function getBookingPageBySlug(slug) {
  const result = await db.query('SELECT * FROM booking_pages WHERE slug = $1', [normalizeSlug(slug)]);
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, config: row.config_json };
}

async function listBookingPagesForOwner(ownerId) {
  const result = await db.query('SELECT * FROM booking_pages WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return result.rows.map(row => ({ ...row, config: row.config_json }));
}

async function deleteBookingPage(id, ownerId) {
  const page = await getBookingPageById(id);
  if (!page || page.owner_id !== ownerId) return false;
  await db.query('DELETE FROM booking_pages WHERE id = $1', [id]);
  return true;
}

// ---- Services ----

async function createService({ bookingPageId, name, durationMinutes, price, currency }) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO services (id, booking_page_id, name, duration_minutes, price, currency, active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
    [id, bookingPageId, name, durationMinutes || 30, price || null, currency || 'USD']
  );
  return getServiceById(id);
}

async function getServiceById(id) {
  const result = await db.query('SELECT * FROM services WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listServicesForPage(bookingPageId) {
  const result = await db.query('SELECT * FROM services WHERE booking_page_id = $1 ORDER BY created_at DESC', [bookingPageId]);
  return result.rows;
}

async function deleteService(id, bookingPageId) {
  const result = await db.query('DELETE FROM services WHERE id = $1 AND booking_page_id = $2', [id, bookingPageId]);
  return result.rowCount > 0;
}

// ---- Availability & slot generation ----
//
// config.availability shape:
// {
//   slotMinutes: 30,
//   timezone: "Africa/Nairobi",   // any IANA timezone name -- handles DST correctly
//   weekly: {
//     mon: [{ start: "09:00", end: "17:00" }],
//     tue: [{ start: "09:00", end: "17:00" }],
//     ...
//     sun: []                      // empty array = closed that day
//   }
// }

/**
 * Returns the UTC offset (in minutes) that `timeZone` observes at the
 * instant `date` -- correctly varies across DST transitions, unlike a
 * fixed offset number.
 */
function getZoneOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const map = {};
  dtf.formatToParts(date).forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });
  const hour = map.hour === '24' ? '00' : map.hour;
  const asIfUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return (asIfUTC - date.getTime()) / 60000;
}

/**
 * Converts a wall-clock local date+time in `timeZone` into the real UTC
 * instant it represents. Re-checks the offset after an initial guess so
 * results are correct even right at a DST transition boundary.
 */
function localTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, da, h, mi));
  const offset1 = getZoneOffsetMinutes(guess, timeZone);
  let utc = new Date(guess.getTime() - offset1 * 60000);
  const offset2 = getZoneOffsetMinutes(utc, timeZone);
  if (offset2 !== offset1) utc = new Date(guess.getTime() - offset2 * 60000);
  return utc;
}

/**
 * Formats a UTC instant as a wall-clock date+time string in `timeZone`,
 * for display purposes (e.g. showing a booked slot back to the owner).
 */
function formatInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const map = {};
  dtf.formatToParts(date).forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });
  const hour = map.hour === '24' ? '00' : map.hour;
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${hour}:${map.minute}` };
}

function dateStrInDays(daysAhead) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns available slots for a service over the next `daysAhead` days,
 * as an array of { startUTC: Date, endUTC: Date }, excluding anything
 * that overlaps an existing confirmed booking on this page.
 */
async function getAvailableSlots(bookingPage, service, daysAhead = 14) {
  const availability = bookingPage.config?.availability || {};
  const slotMinutes = availability.slotMinutes || 30;
  const timeZone = availability.timezone || 'UTC';
  const weekly = availability.weekly || {};
  const durationMs = service.duration_minutes * 60000;
  const now = new Date();

  const rangeStart = new Date();
  const rangeEnd = new Date(Date.now() + daysAhead * 86400000);
  const existingResult = await db.query(
    `SELECT start_time, end_time FROM bookings
     WHERE booking_page_id = $1 AND status = 'confirmed' AND start_time < $2 AND end_time > $3`,
    [bookingPage.id, rangeEnd, rangeStart]
  );
  const existing = existingResult.rows.map(r => ({ start: new Date(r.start_time), end: new Date(r.end_time) }));

  const slots = [];
  for (let d = 0; d < daysAhead; d++) {
    const dateStr = dateStrInDays(d);
    const weekday = DAYS[new Date(`${dateStr}T00:00:00.000Z`).getUTCDay()];
    const windows = weekly[weekday] || [];

    for (const window of windows) {
      let cursor = localTimeToUtc(dateStr, window.start, timeZone);
      const windowEnd = localTimeToUtc(dateStr, window.end, timeZone);

      while (cursor.getTime() + durationMs <= windowEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + durationMs);
        const isPast = cursor <= now;
        const overlaps = existing.some(b => cursor < b.end && slotEnd > b.start);
        if (!isPast && !overlaps) {
          slots.push({ startUTC: new Date(cursor), endUTC: slotEnd });
        }
        cursor = new Date(cursor.getTime() + slotMinutes * 60000);
      }
    }
  }

  return slots;
}

// ---- Bookings ----

async function createBooking({ bookingPageId, serviceId, customerName, customerEmail, customerPhone, startTime, endTime }) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO bookings (id, booking_page_id, service_id, customer_name, customer_email, customer_phone, start_time, end_time, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')`,
    [id, bookingPageId, serviceId, customerName, customerEmail || null, customerPhone || null, startTime, endTime]
  );
  return getBookingById(id);
}

async function getBookingById(id) {
  const result = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Re-checks that a slot is still free right before booking it, closing
 * the race window between "show available slots" and "confirm booking."
 */
async function isSlotStillFree(bookingPageId, startTime, endTime) {
  const result = await db.query(
    `SELECT id FROM bookings
     WHERE booking_page_id = $1 AND status = 'confirmed' AND start_time < $3 AND end_time > $2`,
    [bookingPageId, startTime, endTime]
  );
  return result.rows.length === 0;
}

async function listBookingsForPage(bookingPageId, { upcomingOnly = true } = {}) {
  const query = upcomingOnly
    ? `SELECT * FROM bookings WHERE booking_page_id = $1 AND start_time > NOW() ORDER BY start_time ASC`
    : `SELECT * FROM bookings WHERE booking_page_id = $1 ORDER BY start_time DESC`;
  const result = await db.query(query, [bookingPageId]);
  return result.rows;
}

async function cancelBooking(id) {
  const result = await db.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0] || null;
}

async function incrementViews(id) {
  await db.query('UPDATE booking_pages SET views = views + 1 WHERE id = $1', [id]);
}

module.exports = {
  createBookingPage,
  getBookingPageById,
  getBookingPageBySlug,
  listBookingPagesForOwner,
  deleteBookingPage,
  createService,
  getServiceById,
  listServicesForPage,
  deleteService,
  getAvailableSlots,
  formatInZone,
  createBooking,
  getBookingById,
  isSlotStillFree,
  listBookingsForPage,
  cancelBooking,
  normalizeSlug,
  incrementViews,
};
