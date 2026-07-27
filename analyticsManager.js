const db = require('./db');

async function getOverview(ownerId) {
  const [
    botCount, siteCount, storeCount, bookingPageCount,
    messagesReceived, activeSubscribers,
    revenueByCurrency,
    siteViews, storeViews, bookingViews,
    confirmedBookings,
    broadcastStats,
  ] = await Promise.all([
    countRows('bots', ownerId),
    countRows('sites', ownerId),
    countRows('stores', ownerId),
    countRows('booking_pages', ownerId),

    db.query(
      `SELECT COUNT(*)::int AS count FROM bot_events
       WHERE event_type = 'message_in' AND bot_id IN (SELECT id FROM bots WHERE owner_id = $1)`,
      [ownerId]
    ).then(r => r.rows[0].count),

    db.query(
      `SELECT COUNT(*)::int AS count FROM bot_subscribers
       WHERE status = 'active' AND bot_id IN (SELECT id FROM bots WHERE owner_id = $1)`,
      [ownerId]
    ).then(r => r.rows[0].count),

    db.query(
      `SELECT currency, SUM(amount)::float AS total FROM payments
       WHERE status = 'completed' AND currency IS NOT NULL AND (
         bot_id IN (SELECT id FROM bots WHERE owner_id = $1) OR
         store_id IN (SELECT id FROM stores WHERE owner_id = $1)
       )
       GROUP BY currency`,
      [ownerId]
    ).then(r => r.rows),

    sumColumn('sites', 'views', ownerId),
    sumColumn('stores', 'views', ownerId),
    sumColumn('booking_pages', 'views', ownerId),

    db.query(
      `SELECT COUNT(*)::int AS count FROM bookings
       WHERE status = 'confirmed' AND booking_page_id IN (SELECT id FROM booking_pages WHERE owner_id = $1)`,
      [ownerId]
    ).then(r => r.rows[0].count),

    db.query(
      `SELECT COUNT(*)::int AS broadcasts, COALESCE(SUM(sent_count), 0)::int AS delivered FROM broadcasts
       WHERE status = 'sent' AND bot_id IN (SELECT id FROM bots WHERE owner_id = $1)`,
      [ownerId]
    ).then(r => r.rows[0]),
  ]);

  return {
    counts: { bots: botCount, sites: siteCount, stores: storeCount, bookingPages: bookingPageCount },
    messagesReceived,
    activeSubscribers,
    revenueByCurrency,
    views: { sites: siteViews, stores: storeViews, bookingPages: bookingViews },
    confirmedBookings,
    broadcasts: broadcastStats,
  };
}

async function countRows(table, ownerId) {
  const result = await db.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE owner_id = $1`, [ownerId]);
  return result.rows[0].count;
}

async function sumColumn(table, column, ownerId) {
  const result = await db.query(`SELECT COALESCE(SUM(${column}), 0)::int AS total FROM ${table} WHERE owner_id = $1`, [ownerId]);
  return result.rows[0].total;
}

module.exports = { getOverview };
