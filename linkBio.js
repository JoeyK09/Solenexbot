/**
 * Link-in-bio config shape:
 * {
 *   title: "Joey's Store",
 *   bio: "Digital tools & templates, made in Nairobi.",
 *   accentColor: "#F5A623",   // optional, defaults to Solenex amber
 *   links: [ { label: "Shop on WhatsApp", url: "https://wa.me/..." }, ... ]
 * }
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLinkBioPage(site) {
  const { title, bio, links = [], accentColor } = site.config || {};
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#F5A623';

  const linkItems = links
    .filter(l => l && l.url && l.label)
    .map(
      l => `<a class="link-btn" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title || 'Solenex page')}</title>
<style>
  :root { --accent: ${accent}; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #0B0E11;
    color: #E8E6E1;
    font-family: -apple-system, system-ui, sans-serif;
    display: flex;
    justify-content: center;
    padding: 48px 20px;
  }
  .page { width: 100%; max-width: 420px; text-align: center; }
  h1 { font-size: 1.4rem; margin: 0 0 8px; }
  .bio { color: #8A8F98; font-size: 0.92rem; margin: 0 0 28px; line-height: 1.5; }
  .link-btn {
    display: block;
    width: 100%;
    padding: 14px 18px;
    margin-bottom: 12px;
    background: #151A20;
    border: 1px solid #262E37;
    border-radius: 10px;
    color: #E8E6E1;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    transition: border-color 0.15s;
  }
  .link-btn:hover { border-color: var(--accent); }
  .footer { margin-top: 32px; font-size: 0.72rem; color: #5A5F66; }
  .footer a { color: var(--accent); text-decoration: none; }
</style>
</head>
<body>
  <div class="page">
    <h1>${escapeHtml(title || '')}</h1>
    ${bio ? `<p class="bio">${escapeHtml(bio)}</p>` : ''}
    ${linkItems || '<p class="bio">No links added yet.</p>'}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

module.exports = { renderLinkBioPage };
