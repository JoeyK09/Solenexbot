const fetch = require('node-fetch');

const HOSTS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  production: 'https://api-m.paypal.com',
};

async function getAccessToken({ clientId, clientSecret, environment }) {
  const host = HOSTS[environment] || HOSTS.sandbox;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${host}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`PayPal auth failed: ${data.error_description || JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * Creates a PayPal order and returns its approval link -- the URL the
 * buyer opens in their browser to pay. customId round-trips through
 * PayPal so we can identify who paid when they come back.
 */
async function createOrder({ clientId, clientSecret, environment, amount, currency, customId, returnUrl, cancelUrl }) {
  const host = HOSTS[environment] || HOSTS.sandbox;
  const token = await getAccessToken({ clientId, clientSecret, environment });

  const res = await fetch(`${host}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency || 'USD', value: Number(amount).toFixed(2) },
          custom_id: customId,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
    }),
  });

  const data = await res.json();
  if (!data.id) {
    throw new Error(`PayPal order creation failed: ${JSON.stringify(data)}`);
  }
  const approveLink = (data.links || []).find(l => l.rel === 'approve')?.href;
  return { orderId: data.id, approveLink };
}

async function captureOrder({ clientId, clientSecret, environment, orderId }) {
  const host = HOSTS[environment] || HOSTS.sandbox;
  const token = await getAccessToken({ clientId, clientSecret, environment });

  const res = await fetch(`${host}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  const completed = data.status === 'COMPLETED';
  const customId = data.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
    || data.purchase_units?.[0]?.custom_id;
  return { completed, customId, raw: data };
}

module.exports = { getAccessToken, createOrder, captureOrder };
