const fetch = require('node-fetch');
const crypto = require('crypto');

const API_ROOT = 'https://api.nowpayments.io/v1';

/**
 * Creates a hosted invoice -- the buyer picks their coin (BTC, ETH, USDT,
 * SOL, etc.) on NOWPayments' page, rather than us choosing it upfront.
 */
async function createInvoice({ apiKey, amountUSD, orderId, description, ipnCallbackUrl, successUrl, cancelUrl }) {
  const res = await fetch(`${API_ROOT}/invoice`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: amountUSD,
      price_currency: 'usd',
      order_id: orderId,
      order_description: description || 'Payment',
      ipn_callback_url: ipnCallbackUrl,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });
  const data = await res.json();
  if (!data.invoice_url) {
    throw new Error(`NOWPayments invoice creation failed: ${JSON.stringify(data)}`);
  }
  return data; // { id, invoice_url, order_id, ... }
}

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObjectKeys(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

/**
 * NOWPayments signs IPN callbacks by HMAC-SHA512'ing the alphabetically-
 * key-sorted JSON body with your IPN secret key (from account settings).
 */
function verifyIpnSignature(parsedBody, signatureHeader, ipnSecret) {
  const sorted = sortObjectKeys(parsedBody);
  const str = JSON.stringify(sorted);
  const expected = crypto.createHmac('sha512', ipnSecret).update(str).digest('hex');
  return expected === signatureHeader;
}

module.exports = { createInvoice, verifyIpnSignature };
