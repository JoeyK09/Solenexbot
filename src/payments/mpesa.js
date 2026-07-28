const fetch = require('node-fetch');

const HOSTS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

/**
 * Converts common Kenyan phone formats (07XXXXXXXX, +2547XXXXXXXX,
 * 2547XXXXXXXX) into the 2547XXXXXXXX format Daraja requires.
 */
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
  throw new Error(`Could not parse "${raw}" as a Kenyan phone number. Try format 07XXXXXXXX.`);
}

async function getAccessToken({ consumerKey, consumerSecret, environment }) {
  const host = HOSTS[environment] || HOSTS.sandbox;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const res = await fetch(`${host}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`M-Pesa auth failed: ${data.errorMessage || JSON.stringify(data)}`);
  }
  return data.access_token;
}

function buildPassword({ shortcode, passkey, timestamp }) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

function nowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/**
 * Initiates an STK Push -- the customer gets an "Enter M-Pesa PIN" prompt
 * on their phone. Result arrives later via the callback URL, not this
 * response (this response only confirms the prompt was sent).
 */
async function stkPush({
  consumerKey, consumerSecret, shortcode, passkey, environment,
  phone, amount, accountReference, transactionDesc, callbackUrl,
}) {
  const host = HOSTS[environment] || HOSTS.sandbox;
  const token = await getAccessToken({ consumerKey, consumerSecret, environment });
  const timestamp = nowTimestamp();
  const password = buildPassword({ shortcode, passkey, timestamp });
  const normalizedPhone = normalizePhone(phone);

  const res = await fetch(`${host}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference.slice(0, 12),
      TransactionDesc: (transactionDesc || 'Payment').slice(0, 13),
    }),
  });

  const data = await res.json();
  if (data.ResponseCode !== '0') {
    throw new Error(`M-Pesa STK push failed: ${data.errorMessage || data.ResponseDescription || JSON.stringify(data)}`);
  }
  return data; // includes CheckoutRequestID, MerchantRequestID
}

module.exports = { stkPush, normalizePhone, getAccessToken };
