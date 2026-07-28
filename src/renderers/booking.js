function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BASE_STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #000000;
    color: #FFFFFF;
    font-family: -apple-system, system-ui, sans-serif;
    padding: 40px 20px 60px;
  }
  .wrap { max-width: 480px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 6px; }
  .desc { color: #8C8C8C; font-size: 0.92rem; margin: 0 0 30px; line-height: 1.5; }
  .card {
    background: #0D0D0D;
    border: 1px solid #2A2A2A;
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 14px;
  }
  .card-name { font-weight: 600; font-size: 1.02rem; margin: 0 0 4px; }
  .card-meta { color: #B3B3B3; font-size: 0.85rem; margin: 0 0 14px; }
  .btn {
    display: inline-block;
    width: 100%;
    text-align: center;
    background: #FFFFFF;
    color: #000000;
    font-weight: 700;
    padding: 12px 18px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.92rem;
    border: none;
    cursor: pointer;
  }
  .day-group { margin-bottom: 20px; }
  .day-label { font-size: 0.8rem; color: #8C8C8C; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  .slot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .slot-btn {
    background: #0D0D0D;
    border: 1px solid #2A2A2A;
    color: #FFFFFF;
    padding: 10px;
    border-radius: 8px;
    font-size: 0.85rem;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
  }
  .slot-btn:hover { border-color: #FFFFFF; }
  input {
    width: 100%;
    background: #1A1A1A;
    border: 1px solid #2A2A2A;
    color: #FFFFFF;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 0.92rem;
    margin-bottom: 12px;
  }
  .footer { text-align: center; margin-top: 36px; font-size: 0.72rem; color: #5C5C5C; }
  .footer a { color: #FFFFFF; text-decoration: none; }
`;

function renderBookingPage(page, services) {
  const { title, description } = page.config || {};
  const cards = services
    .filter(s => s.active)
    .map(s => `
      <div class="card">
        <p class="card-name">${escapeHtml(s.name)}</p>
        <p class="card-meta">${s.duration_minutes} min${s.price ? ` · ${Number(s.price).toFixed(2)} ${escapeHtml(s.currency)}` : ''}</p>
        <a class="btn" href="/book/${escapeHtml(page.slug)}/service/${escapeHtml(s.id)}">Choose a time</a>
      </div>
    `)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title || 'Book an appointment')}</title>
<style>${BASE_STYLE}</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title || '')}</h1>
    ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ''}
    ${cards || '<p class="desc">No services available yet.</p>'}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

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

function renderSlotsPage(page, service, slots) {
  // Group slots by local calendar date for display
  const groups = {};
  const timeZone = page.config?.availability?.timezone || 'UTC';
  for (const slot of slots) {
    const { date: dateKey, time: timeLabel } = formatInZone(slot.startUTC, timeZone);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push({ iso: slot.startUTC.toISOString(), label: timeLabel });
  }

  const dayBlocks = Object.keys(groups).sort().map(dateKey => `
    <div class="day-group">
      <p class="day-label">${escapeHtml(dateKey)}</p>
      <div class="slot-grid">
        ${groups[dateKey].map(s => `<a class="slot-btn" href="/book/${escapeHtml(page.slug)}/service/${escapeHtml(service.id)}/confirm?slot=${encodeURIComponent(s.iso)}">${escapeHtml(s.label)}</a>`).join('\n')}
      </div>
    </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(service.name)}</title>
<style>${BASE_STYLE}</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(service.name)}</h1>
    <p class="desc">${service.duration_minutes} min. Pick a time below.</p>
    ${dayBlocks || '<p class="desc">No open times in the next two weeks.</p>'}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

function renderConfirmForm(page, service, slotIso, error) {
  const timeZone = page.config?.availability?.timezone || 'UTC';
  const { date, time } = formatInZone(new Date(slotIso), timeZone);
  const localLabel = `${date} ${time}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confirm booking</title>
<style>${BASE_STYLE}</style>
</head>
<body>
  <div class="wrap">
    <h1>Confirm your booking</h1>
    <p class="desc">${escapeHtml(service.name)} — ${escapeHtml(localLabel)}</p>
    ${error ? `<p class="desc" style="color:#E5484D;">${escapeHtml(error)}</p>` : ''}
    <form method="POST" action="/book/${escapeHtml(page.slug)}/service/${escapeHtml(service.id)}">
      <input type="hidden" name="slot" value="${escapeHtml(slotIso)}" />
      <input type="text" name="name" placeholder="Your name" required />
      <input type="email" name="email" placeholder="Email (for confirmation)" />
      <input type="text" name="phone" placeholder="Phone (optional)" />
      <button class="btn" type="submit">Confirm booking</button>
    </form>
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

function renderResultPage({ heading, message, detail, showCancel, cancelUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(heading)}</title>
<style>${BASE_STYLE}</style>
</head>
<body>
  <div class="wrap" style="text-align:center;">
    <h1>${escapeHtml(heading)}</h1>
    <p class="desc">${escapeHtml(message)}</p>
    ${detail ? `<div class="card" style="text-align:left;"><p class="card-meta" style="margin:0;">${escapeHtml(detail)}</p></div>` : ''}
    ${showCancel ? `<form method="POST" action="${escapeHtml(cancelUrl)}" style="margin-top:16px;"><button class="btn" style="background:transparent;color:#FFFFFF;border:1px solid #2A2A2A;" type="submit">Cancel this booking</button></form>` : ''}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

module.exports = { renderBookingPage, renderSlotsPage, renderConfirmForm, renderResultPage };
