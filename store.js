function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Four storefront themes a store owner can pick between. Each defines its
 * own palette, type pairing, and corner radius -- not just a recolor,
 * so "Boutique" genuinely feels like a different template from "Neon."
 */
const THEMES = {
  mono: {
    label: 'Minimal Mono',
    googleFonts: 'family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600',
    fontDisplay: "'Space Grotesk', sans-serif",
    fontBody: "'Inter', -apple-system, sans-serif",
    bg: '#000000', panel: '#0D0D0D', border: '#2A2A2A',
    text: '#FFFFFF', muted: '#8C8C8C',
    accent: '#FFFFFF', accentText: '#000000',
    radius: '10px', cardRadius: '12px',
  },
  vivid: {
    label: 'Vivid Gradient',
    googleFonts: 'family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600',
    fontDisplay: "'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    bg: '#0B0B14', panel: '#1D1D2C', border: '#2A2A3D',
    text: '#F5F5FA', muted: '#9494B0',
    accent: 'linear-gradient(135deg, #4F7CFF, #A855F7 55%, #EC4899)', accentText: '#0B0B14',
    radius: '14px', cardRadius: '16px',
  },
  boutique: {
    label: 'Warm Boutique',
    googleFonts: 'family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600',
    fontDisplay: "'Fraunces', serif",
    fontBody: "'Inter', sans-serif",
    bg: '#FAF6F0', panel: '#FFFFFF', border: '#E7DDD0',
    text: '#2B241D', muted: '#8A7C6B',
    accent: '#C1663B', accentText: '#FFFFFF',
    radius: '4px', cardRadius: '2px',
  },
  neon: {
    label: 'Bold Neon',
    googleFonts: 'family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600',
    fontDisplay: "'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    bg: '#050505', panel: '#0F0F0F', border: '#1F1F1F',
    text: '#F2FFF6', muted: '#7A8A7E',
    accent: '#39FF88', accentText: '#050505',
    radius: '6px', cardRadius: '8px',
  },
};

function getTheme(themeId) {
  return THEMES[themeId] || THEMES.mono;
}

function fontLinkTags(theme) {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?${theme.googleFonts}&display=swap" rel="stylesheet">`;
}

function buildStyle(t) {
  return `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: ${t.bg};
    color: ${t.text};
    font-family: ${t.fontBody};
    padding: 40px 20px 60px;
  }
  h1 { font-family: ${t.fontDisplay}; font-size: 1.6rem; margin: 0 0 6px; font-weight: 600; }
  .wrap { max-width: 480px; margin: 0 auto; }
  .desc { color: ${t.muted}; font-size: 0.92rem; margin: 0 0 30px; line-height: 1.5; }
  .product-card {
    background: ${t.panel};
    border: 1px solid ${t.border};
    border-radius: ${t.cardRadius};
    padding: 18px;
    margin-bottom: 14px;
  }
  .product-img { width: 100%; border-radius: calc(${t.cardRadius} - 4px); margin-bottom: 12px; }
  .product-name { font-family: ${t.fontDisplay}; font-weight: 600; font-size: 1.05rem; margin: 0 0 4px; }
  .product-price { color: ${t.muted}; font-size: 0.88rem; margin: 0 0 10px; }
  .product-desc { color: ${t.muted}; font-size: 0.85rem; margin: 0 0 14px; line-height: 1.5; }
  .btn {
    display: inline-block;
    width: 100%;
    text-align: center;
    background: ${t.accent};
    color: ${t.accentText};
    font-weight: 700;
    padding: 12px 18px;
    border-radius: ${t.radius};
    text-decoration: none;
    font-size: 0.92rem;
    border: none;
    cursor: pointer;
  }
  .btn-outline {
    background: transparent;
    color: ${t.text};
    border: 1px solid ${t.border};
  }
  input, select {
    width: 100%;
    background: ${t.bg === '#FAF6F0' ? '#FFFFFF' : t.panel};
    border: 1px solid ${t.border};
    color: ${t.text};
    padding: 10px 12px;
    border-radius: ${t.radius};
    font-size: 0.92rem;
    margin-bottom: 12px;
  }
  .footer { text-align: center; margin-top: 36px; font-size: 0.72rem; color: ${t.muted}; }
  .footer a { color: ${t.text}; text-decoration: none; }
`;
}

function renderStorePage(store, products) {
  const theme = getTheme(store.config?.theme);
  const { title, description } = store.config || {};

  const cards = products
    .filter(p => p.active)
    .map(p => `
      <div class="product-card">
        ${p.image_url ? `<img class="product-img" src="${escapeHtml(p.image_url)}" alt="" />` : ''}
        <p class="product-name">${escapeHtml(p.name)}</p>
        <p class="product-price">${Number(p.price).toFixed(2)} ${escapeHtml(p.currency)}</p>
        ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : ''}
        <a class="btn" href="/store/${escapeHtml(store.slug)}/product/${escapeHtml(p.id)}">Buy</a>
      </div>
    `)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title || 'Store')}</title>
${fontLinkTags(theme)}
<style>${buildStyle(theme)}</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title || '')}</h1>
    ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ''}
    ${cards || '<p class="desc">No products listed yet.</p>'}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

function renderCheckoutPage(store, product, methods) {
  const theme = getTheme(store.config?.theme);
  const buttons = [];

  if (methods.includes('mpesa')) {
    buttons.push(`
      <form method="POST" action="/store-pay/mpesa/${store.id}/${product.id}">
        <input type="email" name="email" placeholder="you@email.com (for your receipt)" required />
        <input type="text" name="phone" placeholder="07XXXXXXXX" required />
        <button class="btn" type="submit">Pay with M-Pesa</button>
      </form>
    `);
  }
  if (methods.includes('paypal')) {
    buttons.push(`
      <form method="POST" action="/store-pay/paypal/${store.id}/${product.id}">
        <input type="email" name="email" placeholder="you@email.com (for your receipt)" required />
        <button class="btn btn-outline" type="submit">Pay with PayPal</button>
      </form>
    `);
  }
  if (methods.includes('crypto')) {
    buttons.push(`
      <form method="POST" action="/store-pay/crypto/${store.id}/${product.id}">
        <input type="email" name="email" placeholder="you@email.com (for your receipt)" required />
        <button class="btn btn-outline" type="submit">Pay with crypto</button>
      </form>
    `);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Checkout — ${escapeHtml(product.name)}</title>
${fontLinkTags(theme)}
<style>${buildStyle(theme)}
  form { margin-bottom: 12px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(product.name)}</h1>
    <p class="desc">${Number(product.price).toFixed(2)} ${escapeHtml(product.currency)}</p>
    ${buttons.join('\n') || '<p class="desc">No payment methods are set up for this store yet.</p>'}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

function renderResultPage({ heading, message, deliveryInfo, receiptUrl, emailSent, theme: themeId }) {
  const theme = getTheme(themeId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(heading)}</title>
${fontLinkTags(theme)}
<style>${buildStyle(theme)}</style>
</head>
<body>
  <div class="wrap" style="text-align:center;">
    <h1>${escapeHtml(heading)}</h1>
    <p class="desc">${escapeHtml(message)}</p>
    ${deliveryInfo ? `<div class="product-card" style="text-align:left;"><p class="product-desc" style="white-space:pre-wrap;">${escapeHtml(deliveryInfo)}</p></div>` : ''}
    ${emailSent ? `<p class="desc" style="font-size:0.8rem;">A copy was also emailed to you.</p>` : ''}
    ${receiptUrl ? `<p class="desc" style="font-size:0.8rem;">Bookmark this link to find your order again:<br/><a href="${escapeHtml(receiptUrl)}">${escapeHtml(receiptUrl)}</a></p>` : ''}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

module.exports = { renderStorePage, renderCheckoutPage, renderResultPage, THEMES };
