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
  .product-card {
    background: #0D0D0D;
    border: 1px solid #2A2A2A;
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 14px;
  }
  .product-img { width: 100%; border-radius: 8px; margin-bottom: 12px; }
  .product-name { font-weight: 600; font-size: 1.02rem; margin: 0 0 4px; }
  .product-price { color: #B3B3B3; font-size: 0.88rem; margin: 0 0 10px; }
  .product-desc { color: #8C8C8C; font-size: 0.85rem; margin: 0 0 14px; line-height: 1.5; }
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
  .btn-outline {
    background: transparent;
    color: #FFFFFF;
    border: 1px solid #2A2A2A;
  }
  input, select {
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

function renderStorePage(store, products) {
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
<style>${BASE_STYLE}</style>
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
<style>${BASE_STYLE}
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

function renderResultPage({ heading, message, deliveryInfo, receiptUrl, emailSent }) {
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
    ${deliveryInfo ? `<div class="product-card" style="text-align:left;"><p class="product-desc" style="white-space:pre-wrap;">${escapeHtml(deliveryInfo)}</p></div>` : ''}
    ${emailSent ? `<p class="desc" style="font-size:0.8rem;">A copy was also emailed to you.</p>` : ''}
    ${receiptUrl ? `<p class="desc" style="font-size:0.8rem;">Bookmark this link to find your order again:<br/><a href="${escapeHtml(receiptUrl)}" style="color:#FFFFFF;">${escapeHtml(receiptUrl)}</a></p>` : ''}
    <p class="footer">Built with <a href="/" target="_blank" rel="noopener noreferrer">Solenex</a></p>
  </div>
</body>
</html>`;
}

module.exports = { renderStorePage, renderCheckoutPage, renderResultPage };
