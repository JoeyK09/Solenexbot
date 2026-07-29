/**
 * Landing page config shape:
 * {
 *   title: "Solenex Signals",
 *   tagline: "Premium trading signals, delivered on Telegram.",
 *   heroImageUrl: "https://...",       // optional
 *   sections: [ { heading: "Why us", body: "..." }, ... ],
 *   ctaLabel: "Get access on Telegram",
 *   ctaUrl: "https://t.me/yourbot",
 *   accentColor: "#FFFFFF"             // optional
 * }
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLandingPage(site) {
  const {
    title, tagline, heroImageUrl, sections = [], ctaLabel, ctaUrl, accentColor,
  } = site.config || {};
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#FFFFFF';

  const sectionBlocks = sections
    .filter(s => s && (s.heading || s.body))
    .map(
      s => `
      <div class="block">
        ${s.heading ? `<h3>${escapeHtml(s.heading)}</h3>` : ''}
        ${s.body ? `<p>${escapeHtml(s.body)}</p>` : ''}
      </div>`
    )
    .join('\n');

  const ctaHtml = ctaLabel && ctaUrl
    ? `<a class="cta-btn" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaLabel)}</a>`
    : '';

  const heroImg = heroImageUrl
    ? `<img class="hero-img" src="${escapeHtml(heroImageUrl)}" alt="" />`
    : '';

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
    background: #000000;
    color: #FFFFFF;
    font-family: -apple-system, system-ui, sans-serif;
  }
  .hero {
    text-align: center;
    padding: 64px 20px 40px;
    max-width: 640px;
    margin: 0 auto;
  }
  .hero-img {
    width: 100%;
    max-width: 320px;
    border-radius: 14px;
    margin-bottom: 28px;
  }
  h1 { font-size: 1.9rem; margin: 0 0 12px; line-height: 1.2; }
  .tagline { color: #8C8C8C; font-size: 1.02rem; margin: 0 0 28px; line-height: 1.5; }
  .cta-btn {
    display: inline-block;
    background: var(--accent);
    color: #000000;
    font-weight: 700;
    padding: 14px 28px;
    border-radius: 10px;
    text-decoration: none;
    font-size: 1rem;
  }
  .sections {
    max-width: 640px;
    margin: 20px auto 0;
    padding: 0 20px 60px;
    display: grid;
    gap: 18px;
  }
  .block {
    background: #0D0D0D;
    border: 1px solid #2A2A2A;
    border-radius: 12px;
    padding: 22px;
  }
  .block h3 { margin: 0 0 8px; font-size: 1.05rem; }
  .block p { margin: 0; color: #8C8C8C; font-size: 0.92rem; line-height: 1.55; }
  .footer { text-align: center; padding: 0 20px 40px; font-size: 0.72rem; color: #5C5C5C; }
  .footer a { color: var(--accent); text-decoration: none; }
</style>
</head>
<body>
  <div class="hero">
    ${heroImg}
    <h1>${escapeHtml(title || '')}</h1>
    ${tagline ? `<p class="tagline">${escapeHtml(tagline)}</p>` : ''}
    ${ctaHtml}
  </div>
  ${sectionBlocks ? `<div class="sections">${sectionBlocks}</div>` : ''}
  <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
</body>
</html>`;
}

module.exports = { renderLandingPage };
