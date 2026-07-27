require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const botRoutes = require('./routes/botRoutes');
const siteRoutes = require('./routes/siteRoutes');
const storeRoutes = require('./routes/storeRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const emailMarketingRoutes = require('./routes/emailMarketingRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const billingRoutes = require('./routes/billingRoutes');
const broadcastManager = require('./broadcastManager');
const emailMarketing = require('./emailMarketing');
const whatsappManager = require('./whatsappManager');
const marketplaceManager = require('./marketplaceManager');
const billingManager = require('./billingManager');
const botManager = require('./botManager');
const siteManager = require('./siteManager');
const storeManager = require('./storeManager');
const bookingManager = require('./bookingManager');
const paymentManager = require('./paymentManager');
const paypal = require('./payments/paypal');
const nowpayments = require('./payments/nowpayments');
const mpesa = require('./payments/mpesa');
const { renderLinkBioPage } = require('./renderers/linkBio');
const { renderLandingPage } = require('./renderers/landingPage');
const { renderStorePage, renderCheckoutPage, renderResultPage } = require('./renderers/store');
const {
  renderBookingPage,
  renderSlotsPage,
  renderConfirmForm,
  renderResultPage: renderBookingResultPage,
} = require('./renderers/booking');
const { sendDeliveryEmail } = require('./email');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/health', (req, res) => res.json({ ok: true }));

/**
 * Shared by every store payment completion path (M-Pesa webhook, PayPal
 * return, crypto webhook): looks up the product, emails the delivery
 * info if the store owner configured SMTP, and returns everything the
 * result page needs to show a receipt either way.
 */
async function deliverStorePurchase(store, payment) {
  const productId = payment.meta_json?.productId;
  const buyerEmail = payment.meta_json?.email;
  const product = productId ? await storeManager.getProductById(productId) : null;
  const receiptUrl = `${process.env.BASE_URL}/store-pay/status/${payment.id}`;

  let emailSent = false;
  if (product && buyerEmail && store.config?.email) {
    const result = await sendDeliveryEmail({
      smtp: store.config.email,
      to: buyerEmail,
      subject: `Your purchase: ${product.name}`,
      text: `Thanks for your purchase!\n\n${product.delivery_info || ''}\n\nView this receipt anytime: ${receiptUrl}`,
    });
    emailSent = result.sent;
  }

  return { product, receiptUrl, emailSent };
}

app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/booking-pages', bookingRoutes);
app.use('/api/bots', broadcastRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email', emailMarketingRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/billing', billingRoutes);

/**
 * PUBLIC SITE RENDERER
 * Anyone can view a published link-in-bio page at /s/:slug -- no auth needed.
 * Landing pages will plug into this same route later via site.site_type.
 */
app.get('/s/:slug', async (req, res) => {
  const site = await siteManager.getSiteBySlug(req.params.slug);
  if (!site || !site.active) {
    return res.status(404).send('Page not found.');
  }
  await siteManager.incrementViews(site.id);
  if (site.site_type === 'linkbio') {
    return res.send(renderLinkBioPage(site));
  }
  if (site.site_type === 'landing') {
    return res.send(renderLandingPage(site));
  }
  return res.status(501).send('This site type is not supported yet.');
});

/**
 * PUBLIC STOREFRONT + CHECKOUT
 */
app.get('/store/:slug', async (req, res) => {
  const store = await storeManager.getStoreBySlug(req.params.slug);
  if (!store || !store.active) return res.status(404).send('Store not found.');
  await storeManager.incrementViews(store.id);
  const products = await storeManager.listProductsForStore(store.id);
  res.send(renderStorePage(store, products));
});

app.get('/store/:slug/product/:productId', async (req, res) => {
  const store = await storeManager.getStoreBySlug(req.params.slug);
  if (!store || !store.active) return res.status(404).send('Store not found.');
  const product = await storeManager.getProductById(req.params.productId);
  if (!product || product.store_id !== store.id) return res.status(404).send('Product not found.');
  const methods = store.config?.paymentMethods || [];
  res.send(renderCheckoutPage(store, product, methods));
});

app.post('/store-pay/mpesa/:storeId/:productId', async (req, res) => {
  const store = await storeManager.getStoreById(req.params.storeId);
  const product = await storeManager.getProductById(req.params.productId);
  const mpesaConfig = store?.config?.mpesa;
  if (!store || !product || !mpesaConfig) return res.status(400).send('This store is not set up for M-Pesa.');

  try {
    const callbackUrl = `${process.env.BASE_URL}/webhooks/store-mpesa/${store.id}?key=${store.webhook_secret}`;
    const result = await mpesa.stkPush({
      ...mpesaConfig,
      phone: req.body.phone,
      amount: product.price,
      accountReference: `order-${product.id}`.slice(0, 12),
      transactionDesc: product.name,
      callbackUrl,
    });

    const payment = await paymentManager.createPayment({
      provider: 'mpesa',
      externalRef: result.CheckoutRequestID,
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      meta: { storeId: store.id, productId: product.id, buyerContact: req.body.phone, email: req.body.email },
    });

    res.send(renderResultPage({
      heading: 'Check your phone',
      message: 'Enter your M-Pesa PIN to complete payment, then refresh this page to see your confirmation.',
      receiptUrl: `${process.env.BASE_URL}/store-pay/status/${payment.id}`,
    }));
  } catch (err) {
    console.error('Store M-Pesa error:', err);
    res.status(500).send(renderResultPage({ heading: 'Payment failed', message: "Couldn't start the M-Pesa payment. Please try again." }));
  }
});

app.post('/store-pay/paypal/:storeId/:productId', async (req, res) => {
  const store = await storeManager.getStoreById(req.params.storeId);
  const product = await storeManager.getProductById(req.params.productId);
  const paypalConfig = store?.config?.paypal;
  if (!store || !product || !paypalConfig) return res.status(400).send('This store is not set up for PayPal.');

  try {
    const { orderId, approveLink } = await paypal.createOrder({
      ...paypalConfig,
      amount: product.price,
      currency: product.currency,
      customId: `${store.id}:${product.id}`,
      returnUrl: `${process.env.BASE_URL}/store-pay/paypal/return/${store.id}/${product.id}`,
      cancelUrl: `${process.env.BASE_URL}/store-pay/paypal/cancel`,
    });

    await paymentManager.createPayment({
      provider: 'paypal',
      externalRef: orderId,
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      meta: { storeId: store.id, productId: product.id, email: req.body.email },
    });

    res.redirect(approveLink);
  } catch (err) {
    console.error('Store PayPal error:', err);
    res.status(500).send(renderResultPage({ heading: 'Payment failed', message: "Couldn't start the PayPal payment. Please try again." }));
  }
});

app.get('/store-pay/paypal/return/:storeId/:productId', async (req, res) => {
  const store = await storeManager.getStoreById(req.params.storeId);
  const product = await storeManager.getProductById(req.params.productId);
  const orderId = req.query.token;
  if (!store || !product || !orderId) return res.status(400).send('Something went wrong with this payment link.');

  try {
    const { completed } = await paypal.captureOrder({ ...store.config.paypal, orderId });
    const payment = await paymentManager.getPaymentByExternalRef('paypal', orderId);

    if (completed && payment) {
      await paymentManager.updatePaymentStatus(payment.id, 'completed');
      const { receiptUrl, emailSent } = await deliverStorePurchase(store, payment);
      return res.send(renderResultPage({
        heading: 'Payment successful',
        message: 'Thanks for your purchase!',
        deliveryInfo: product.delivery_info,
        receiptUrl,
        emailSent,
      }));
    }
    if (payment) await paymentManager.updatePaymentStatus(payment.id, 'failed');
    return res.send(renderResultPage({ heading: 'Payment could not be completed', message: 'Please go back and try again.' }));
  } catch (err) {
    console.error('Store PayPal capture error:', err);
    res.status(500).send(renderResultPage({ heading: 'Something went wrong', message: 'Please contact the seller.' }));
  }
});

app.get('/store-pay/paypal/cancel', (req, res) => {
  res.send(renderResultPage({ heading: 'Payment cancelled', message: 'No charge was made.' }));
});

app.post('/store-pay/crypto/:storeId/:productId', async (req, res) => {
  const store = await storeManager.getStoreById(req.params.storeId);
  const product = await storeManager.getProductById(req.params.productId);
  const npConfig = store?.config?.nowpayments;
  if (!store || !product || !npConfig) return res.status(400).send('This store is not set up for crypto.');

  try {
    const orderId = `${store.id}_${product.id}_${Date.now()}`;
    const invoice = await nowpayments.createInvoice({
      apiKey: npConfig.apiKey,
      amountUSD: product.price,
      orderId,
      description: product.name,
      ipnCallbackUrl: `${process.env.BASE_URL}/webhooks/store-nowpayments/${store.id}`,
      successUrl: `${process.env.BASE_URL}/store-pay/crypto/success`,
      cancelUrl: `${process.env.BASE_URL}/store-pay/crypto/cancel`,
    });

    await paymentManager.createPayment({
      provider: 'crypto',
      externalRef: orderId,
      amount: product.price,
      currency: 'USD',
      status: 'pending',
      meta: { storeId: store.id, productId: product.id, email: req.body.email },
    });

    res.redirect(invoice.invoice_url);
  } catch (err) {
    console.error('Store crypto error:', err);
    res.status(500).send(renderResultPage({ heading: 'Payment failed', message: "Couldn't start the crypto payment. Please try again." }));
  }
});

app.get('/store-pay/crypto/success', (req, res) => {
  res.send(renderResultPage({ heading: 'Payment received', message: 'Your purchase is confirmed once the transaction finishes on-chain.' }));
});
app.get('/store-pay/crypto/cancel', (req, res) => {
  res.send(renderResultPage({ heading: 'Payment cancelled', message: 'No charge was made.' }));
});

app.get('/store-pay/status/:paymentId', async (req, res) => {
  const payment = await paymentManager.getPaymentById(req.params.paymentId);
  if (!payment) return res.status(404).send('Payment not found.');

  if (payment.status === 'completed') {
    const product = payment.meta_json?.productId ? await storeManager.getProductById(payment.meta_json.productId) : null;
    return res.send(renderResultPage({
      heading: 'Payment successful',
      message: 'Thanks for your purchase!',
      deliveryInfo: product?.delivery_info,
      receiptUrl: `${process.env.BASE_URL}/store-pay/status/${payment.id}`,
    }));
  }
  if (payment.status === 'failed') {
    return res.send(renderResultPage({ heading: 'Payment failed', message: 'Please go back and try again.' }));
  }
  return res.send(renderResultPage({ heading: 'Still waiting', message: 'Payment not confirmed yet -- refresh this page in a moment.' }));
});

/**
 * PUBLIC BOOKING PAGES
 */
app.get('/book/:slug', async (req, res) => {
  const page = await bookingManager.getBookingPageBySlug(req.params.slug);
  if (!page || !page.active) return res.status(404).send('Booking page not found.');
  await bookingManager.incrementViews(page.id);
  const services = await bookingManager.listServicesForPage(page.id);
  res.send(renderBookingPage(page, services));
});

app.get('/book/:slug/service/:serviceId', async (req, res) => {
  const page = await bookingManager.getBookingPageBySlug(req.params.slug);
  if (!page || !page.active) return res.status(404).send('Booking page not found.');
  const service = await bookingManager.getServiceById(req.params.serviceId);
  if (!service || service.booking_page_id !== page.id) return res.status(404).send('Service not found.');
  const slots = await bookingManager.getAvailableSlots(page, service);
  res.send(renderSlotsPage(page, service, slots));
});

app.get('/book/:slug/service/:serviceId/confirm', async (req, res) => {
  const page = await bookingManager.getBookingPageBySlug(req.params.slug);
  if (!page || !page.active) return res.status(404).send('Booking page not found.');
  const service = await bookingManager.getServiceById(req.params.serviceId);
  if (!service || service.booking_page_id !== page.id) return res.status(404).send('Service not found.');
  const slot = req.query.slot;
  if (!slot) return res.status(400).send('Missing time slot.');
  res.send(renderConfirmForm(page, service, slot));
});

app.post('/book/:slug/service/:serviceId', async (req, res) => {
  const page = await bookingManager.getBookingPageBySlug(req.params.slug);
  const service = await bookingManager.getServiceById(req.params.serviceId);
  if (!page || !page.active || !service || service.booking_page_id !== page.id) {
    return res.status(404).send('Booking page or service not found.');
  }

  const { slot, name, email, phone } = req.body;
  const startTime = new Date(slot);
  const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

  if (!name || isNaN(startTime.getTime())) {
    return res.status(400).send(renderConfirmForm(page, service, slot, 'Please enter your name.'));
  }

  const stillFree = await bookingManager.isSlotStillFree(page.id, startTime, endTime);
  if (!stillFree) {
    return res.status(409).send(renderConfirmForm(page, service, slot, 'That time was just booked by someone else -- please pick another.'));
  }

  const booking = await bookingManager.createBooking({
    bookingPageId: page.id,
    serviceId: service.id,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    startTime,
    endTime,
  });

  const timeZone = page.config?.availability?.timezone || 'UTC';
  const { date: localDate, time: localTime } = bookingManager.formatInZone(startTime, timeZone);
  const localLabel = `${localDate} ${localTime}`;

  if (email && page.config?.email) {
    await sendDeliveryEmail({
      smtp: page.config.email,
      to: email,
      subject: `Booking confirmed: ${service.name}`,
      text: `Your booking is confirmed.\n\n${service.name}\n${localLabel}\n\nManage or cancel: ${process.env.BASE_URL}/book-status/${booking.id}`,
    });
  }

  res.send(renderBookingResultPage({
    heading: 'Booking confirmed',
    message: `${service.name} — ${localLabel}`,
    showCancel: true,
    cancelUrl: `/book-status/${booking.id}/cancel`,
  }));
});

app.get('/book-status/:bookingId', async (req, res) => {
  const booking = await bookingManager.getBookingById(req.params.bookingId);
  if (!booking) return res.status(404).send('Booking not found.');
  const service = await bookingManager.getServiceById(booking.service_id);
  const page = await bookingManager.getBookingPageById(booking.booking_page_id);
  const timeZone = page?.config?.availability?.timezone || 'UTC';
  const { date: localDate, time: localTime } = bookingManager.formatInZone(new Date(booking.start_time), timeZone);
  const localLabel = `${localDate} ${localTime}`;

  if (booking.status === 'cancelled') {
    return res.send(renderBookingResultPage({ heading: 'Booking cancelled', message: `${service?.name || ''} — ${localLabel}` }));
  }
  res.send(renderBookingResultPage({
    heading: 'Booking confirmed',
    message: `${service?.name || ''} — ${localLabel}`,
    showCancel: true,
    cancelUrl: `/book-status/${booking.id}/cancel`,
  }));
});

app.post('/book-status/:bookingId/cancel', async (req, res) => {
  const booking = await bookingManager.cancelBooking(req.params.bookingId);
  if (!booking) return res.status(404).send('Booking not found.');
  res.send(renderBookingResultPage({ heading: 'Booking cancelled', message: 'Your slot has been freed up.' }));
});

/**
 * EMAIL UNSUBSCRIBE
 * One-click unsubscribe link included in every campaign email.
 */
app.get('/email/unsubscribe/:contactId', async (req, res) => {
  const contact = await emailMarketing.unsubscribeContact(req.params.contactId, req.query.token);
  const html = (heading, message) => `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>body{margin:0;min-height:100vh;background:#000;color:#fff;font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;}h1{font-size:1.4rem;}p{color:#8C8C8C;}</style></head><body><div><h1>${heading}</h1><p>${message}</p></div></body></html>`;
  if (!contact) return res.status(404).send(html('Link not valid', 'This unsubscribe link is invalid or already used.'));
  res.send(html('Unsubscribed', "You won't receive any more emails from this list."));
});

/**
 * SHARED WEBHOOK ENDPOINT
 * Every tenant bot's Telegram webhook points here, distinguished by :botId.
 * This is the heart of the multi-tenant design: one process, one route,
 * infinite bots -- each request just does a DB lookup to find out how to
 * behave. Telegram also sends a secret token header we verify per-bot,
 * so bot IDs can't be guessed/spoofed to inject fake updates.
 */
/**
 * WHATSAPP WEBHOOK (shared across every tenant's WhatsApp channel)
 *
 * GET: Meta's one-time verification handshake when you first configure
 * the webhook URL in your Meta App dashboard. Every tenant points their
 * own Meta App at this same URL and enters the same verify token (set
 * below via WHATSAPP_VERIFY_TOKEN) -- Meta's protocol only supports one
 * token per handshake, so a shared platform-wide constant is how this
 * stays multi-tenant without asking Meta for something it can't do.
 *
 * POST: inbound messages. Meta's payload includes phone_number_id, which
 * is how we look up which tenant channel a message belongs to.
 *
 * IMPORTANT: these must be registered BEFORE /webhook/:botId below --
 * otherwise Express would match "whatsapp" as a bot ID and this code
 * would never run.
 */
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Verification failed.');
});

app.post('/webhook/whatsapp', async (req, res) => {
  res.status(200).send('ok'); // ack immediately -- Meta expects a fast response

  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = entry?.metadata?.phone_number_id;
    const message = entry?.messages?.[0];
    if (!phoneNumberId || !message || message.type !== 'text') return;

    const channel = await whatsappManager.getChannelByPhoneNumberId(phoneNumberId);
    if (!channel || !channel.active) return;

    await whatsappManager.handleInboundMessage(channel, message.from, message.text?.body);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
  }
});

app.post('/webhook/:botId', async (req, res) => {
  const { botId } = req.params;
  const secretHeader = req.header('X-Telegram-Bot-Api-Secret-Token');

  const result = await botManager.handleUpdate(botId, secretHeader, req.body);
  res.status(result.status).json(result.body);
});

/**
 * M-PESA CALLBACK
 * Safaricom posts the STK Push result here once the customer enters (or
 * cancels) their PIN. The bot-specific secret is passed as a query param
 * since Safaricom doesn't support custom headers on this callback.
 */
app.post('/webhooks/mpesa/:botId', async (req, res) => {
  const ack = () => res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const bot = await botManager.getBotById(req.params.botId);
  if (!bot || req.query.key !== bot.webhook_secret) {
    return ack(); // ack anyway -- nothing useful to do, no need to leak info either way
  }

  const callback = req.body?.Body?.stkCallback;
  if (!callback) return ack();

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;
  const payment = await paymentManager.getPaymentByExternalRef('mpesa', CheckoutRequestID);
  if (!payment) return ack();

  if (ResultCode === 0) {
    const items = CallbackMetadata?.Item || [];
    const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    await paymentManager.updatePaymentStatus(payment.id, 'completed', { mpesaReceiptNumber: receipt });

    const handler = botManager.templates[bot.template_type];
    if (handler?.grantAccessForPayment) {
      await handler.grantAccessForPayment(
        bot,
        { id: payment.telegram_user_id, username: payment.telegram_username },
        { tg: require('./telegramClient'), logEvent: botManager.logEvent }
      );
    }
  } else {
    await paymentManager.updatePaymentStatus(payment.id, 'failed', { resultDesc: ResultDesc });
  }

  return ack();
});

/**
 * PAYPAL RETURN
 * The buyer's browser lands here after approving payment on PayPal's site.
 * We capture the order server-side (finalizes the charge), then grant
 * access and show a simple confirmation page.
 */
app.get('/payments/paypal/return/:botId', async (req, res) => {
  const bot = await botManager.getBotById(req.params.botId);
  const orderId = req.query.token; // PayPal names the order id "token" on return
  if (!bot || !orderId) {
    return res.status(400).send('Something went wrong with this payment link.');
  }

  const paypalConfig = bot.config.paypal;
  if (!paypalConfig) {
    return res.status(400).send('This bot is not configured for PayPal.');
  }

  try {
    const { completed, customId } = await paypal.captureOrder({ ...paypalConfig, orderId });
    const payment = await paymentManager.getPaymentByExternalRef('paypal', orderId);

    if (completed && payment) {
      await paymentManager.updatePaymentStatus(payment.id, 'completed');
      const handler = botManager.templates[bot.template_type];
      if (handler?.grantAccessForPayment) {
        await handler.grantAccessForPayment(
          bot,
          { id: payment.telegram_user_id, username: payment.telegram_username },
          { tg: require('./telegramClient'), logEvent: botManager.logEvent }
        );
      }
      return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
        '<h2>Payment successful</h2><p>Head back to Telegram -- your access link is waiting there.</p></body></html>');
    }

    if (payment) await paymentManager.updatePaymentStatus(payment.id, 'failed');
    return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
      '<h2>Payment could not be completed</h2><p>Please go back to Telegram and try again.</p></body></html>');
  } catch (err) {
    console.error('PayPal capture error:', err);
    return res.status(500).send('Something went wrong finalizing this payment.');
  }
});

app.get('/payments/paypal/cancel/:botId', async (req, res) => {
  const orderId = req.query.token;
  if (orderId) {
    const payment = await paymentManager.getPaymentByExternalRef('paypal', orderId);
    if (payment) await paymentManager.updatePaymentStatus(payment.id, 'failed', { reason: 'cancelled' });
  }
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>Payment cancelled</h2><p>No charge was made. Head back to Telegram to try again.</p></body></html>');
});

/**
 * NOWPAYMENTS IPN (crypto)
 * NOWPayments posts a signed status update here every time a payment's
 * status changes (waiting -> confirming -> confirmed -> finished). We only
 * grant access once it reaches "finished" to be safe against partial or
 * reversed payments.
 */
app.post('/webhooks/nowpayments/:botId', async (req, res) => {
  const bot = await botManager.getBotById(req.params.botId);
  const npConfig = bot?.config?.nowpayments;
  if (!bot || !npConfig) return res.status(200).send('ok'); // ack regardless, nothing useful to do

  const signature = req.header('x-nowpayments-sig');
  const valid = signature && nowpayments.verifyIpnSignature(req.body, signature, npConfig.ipnSecret);
  if (!valid) return res.status(200).send('ok'); // ack but ignore -- don't leak validity info

  const { order_id: orderId, payment_status: status } = req.body;
  const payment = await paymentManager.getPaymentByExternalRef('crypto', orderId);
  if (!payment) return res.status(200).send('ok');

  if (status === 'finished' && payment.status !== 'completed') {
    await paymentManager.updatePaymentStatus(payment.id, 'completed', { npStatus: status });
    const handler = botManager.templates[bot.template_type];
    if (handler?.grantAccessForPayment) {
      await handler.grantAccessForPayment(
        bot,
        { id: payment.telegram_user_id, username: payment.telegram_username },
        { tg: require('./telegramClient'), logEvent: botManager.logEvent }
      );
    }
  } else if (['failed', 'expired', 'refunded'].includes(status)) {
    await paymentManager.updatePaymentStatus(payment.id, 'failed', { npStatus: status });
  }

  res.status(200).send('ok');
});

app.get('/payments/nowpayments/success', (req, res) => {
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>Payment received</h2><p>Head back to Telegram -- your access link is on its way.</p></body></html>');
});

app.get('/payments/nowpayments/cancel', (req, res) => {
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>Payment cancelled</h2><p>No charge was made. Head back to Telegram to try again.</p></body></html>');
});

/**
 * MARKETPLACE NOWPAYMENTS IPN
 * Payment goes to the seller's own NOWPayments account -- this just
 * confirms it happened so we can unlock the config for the buyer.
 */
app.post('/webhooks/marketplace-nowpayments/:listingId', async (req, res) => {
  const listing = await marketplaceManager.getListingById(req.params.listingId);
  if (!listing) return res.status(200).send('ok');

  const signature = req.header('x-nowpayments-sig');
  const valid = signature && nowpayments.verifyIpnSignature(req.body, signature, listing.ipn_secret);
  if (!valid) return res.status(200).send('ok');

  const { order_id: orderId, payment_status: status } = req.body;
  const purchase = await marketplaceManager.getPurchaseByExternalRef(orderId);
  if (!purchase) return res.status(200).send('ok');

  if (status === 'finished') {
    await marketplaceManager.markPurchaseCompleted(purchase.id);
  }
  res.status(200).send('ok');
});

app.get('/marketplace-purchase/success', (req, res) => {
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>Purchase confirmed</h2><p>Head back to your Solenex dashboard -- your template will show up under "My purchases" once the payment finishes confirming.</p></body></html>');
});
app.get('/marketplace-purchase/cancel', (req, res) => {
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>Purchase cancelled</h2><p>No charge was made.</p></body></html>');
});

const billingResultPage = (heading, message) =>
  `<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>${heading}</h2><p>${message}</p></body></html>`;

/**
 * PLATFORM M-PESA CALLBACK (billing)
 * One shared endpoint since there's only one merchant config -- yours.
 * Protected by a fixed shared secret rather than a per-transaction one.
 */
app.post('/webhooks/platform-mpesa', async (req, res) => {
  const ack = () => res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  if (req.query.key !== process.env.PLATFORM_WEBHOOK_SECRET) return ack();

  const callback = req.body?.Body?.stkCallback;
  if (!callback) return ack();

  const { CheckoutRequestID, ResultCode } = callback;
  const sub = await billingManager.getSubscriptionByExternalRef('mpesa', CheckoutRequestID);
  if (!sub) return ack();

  if (ResultCode === 0) {
    await billingManager.completeSubscription(sub.id);
  } else {
    await billingManager.failSubscription(sub.id);
  }
  return ack();
});

app.get('/billing/paypal/return', async (req, res) => {
  const orderId = req.query.token;
  if (!orderId) return res.status(400).send(billingResultPage('Something went wrong', 'Missing order reference.'));

  const config = billingManager.getPlatformConfig().paypal;
  if (!config) return res.status(400).send(billingResultPage('Billing not configured', 'PayPal is not set up yet.'));

  try {
    const { completed } = await paypal.captureOrder({ ...config, orderId });
    const sub = await billingManager.getSubscriptionByExternalRef('paypal', orderId);
    if (completed && sub) {
      await billingManager.completeSubscription(sub.id);
      return res.send(billingResultPage('Upgrade complete', `Your plan is now active. Head back to your dashboard.`));
    }
    if (sub) await billingManager.failSubscription(sub.id);
    return res.send(billingResultPage('Payment not completed', 'Please try again from your dashboard.'));
  } catch (err) {
    console.error('Billing PayPal capture error:', err);
    return res.status(500).send(billingResultPage('Something went wrong', 'Please contact support.'));
  }
});

app.get('/billing/paypal/cancel', (req, res) => {
  res.send(billingResultPage('Upgrade cancelled', 'No charge was made.'));
});

app.post('/webhooks/platform-nowpayments', async (req, res) => {
  const config = billingManager.getPlatformConfig().crypto;
  if (!config) return res.status(200).send('ok');

  const signature = req.header('x-nowpayments-sig');
  const valid = signature && nowpayments.verifyIpnSignature(req.body, signature, config.ipnSecret);
  if (!valid) return res.status(200).send('ok');

  const { order_id: orderId, payment_status: status } = req.body;
  const sub = await billingManager.getSubscriptionByExternalRef('crypto', orderId);
  if (!sub) return res.status(200).send('ok');

  if (status === 'finished') {
    await billingManager.completeSubscription(sub.id);
  } else if (['failed', 'expired', 'refunded'].includes(status)) {
    await billingManager.failSubscription(sub.id);
  }
  res.status(200).send('ok');
});

app.get('/billing/crypto/success', (req, res) => {
  res.send(billingResultPage('Payment received', 'Your plan will upgrade once the transaction finishes confirming on-chain.'));
});
app.get('/billing/crypto/cancel', (req, res) => {
  res.send(billingResultPage('Upgrade cancelled', 'No charge was made.'));
});

/**
 * STORE M-PESA CALLBACK
 * Same shape as the bot version, but there's no Telegram user or bot
 * template to hand off to -- we just mark the payment completed. The
 * buyer sees the result via the /store-pay/status/:paymentId poll page.
 */
app.post('/webhooks/store-mpesa/:storeId', async (req, res) => {
  const ack = () => res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const store = await storeManager.getStoreById(req.params.storeId);
  if (!store || req.query.key !== store.webhook_secret) return ack();

  const callback = req.body?.Body?.stkCallback;
  if (!callback) return ack();

  const { CheckoutRequestID, ResultCode } = callback;
  const payment = await paymentManager.getPaymentByExternalRef('mpesa', CheckoutRequestID);
  if (!payment) return ack();

  if (ResultCode === 0) {
    await paymentManager.updatePaymentStatus(payment.id, 'completed');
    await deliverStorePurchase(store, payment);
  } else {
    await paymentManager.updatePaymentStatus(payment.id, 'failed');
  }
  return ack();
});

/**
 * STORE NOWPAYMENTS (crypto) IPN
 */
app.post('/webhooks/store-nowpayments/:storeId', async (req, res) => {
  const store = await storeManager.getStoreById(req.params.storeId);
  const npConfig = store?.config?.nowpayments;
  if (!store || !npConfig) return res.status(200).send('ok');

  const signature = req.header('x-nowpayments-sig');
  const valid = signature && nowpayments.verifyIpnSignature(req.body, signature, npConfig.ipnSecret);
  if (!valid) return res.status(200).send('ok');

  const { order_id: orderId, payment_status: status } = req.body;
  const payment = await paymentManager.getPaymentByExternalRef('crypto', orderId);
  if (!payment) return res.status(200).send('ok');

  if (status === 'finished' && payment.status !== 'completed') {
    await paymentManager.updatePaymentStatus(payment.id, 'completed', { npStatus: status });
    await deliverStorePurchase(store, payment);
  } else if (['failed', 'expired', 'refunded'].includes(status)) {
    await paymentManager.updatePaymentStatus(payment.id, 'failed', { npStatus: status });
  }
  res.status(200).send('ok');
});

const PORT = process.env.PORT || 3000;

// Create tables (if they don't exist yet) before accepting traffic.
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Solenex bot engine listening on port ${PORT}`);
      console.log(`Webhook base: ${process.env.BASE_URL || '(set BASE_URL in .env)'}/webhook/:botId`);
    });

    // Scheduled broadcasts: checked once a minute. Note this only fires
    // while the process is running -- if you're on Render's free tier
    // and the service spins down from inactivity, a scheduled send can
    // be delayed until the next request wakes it back up.
    setInterval(async () => {
      try {
        const due = await broadcastManager.findDueScheduledBroadcasts();
        for (const b of due) {
          broadcastManager.sendBroadcastNow(b.id).catch(err => console.error('Scheduled broadcast error:', err));
        }
      } catch (err) {
        console.error('Broadcast scheduler check failed:', err);
      }

      try {
        const dueCampaigns = await emailMarketing.findDueScheduledCampaigns();
        for (const c of dueCampaigns) {
          emailMarketing.sendCampaignNow(c.id).catch(err => console.error('Scheduled campaign error:', err));
        }
      } catch (err) {
        console.error('Campaign scheduler check failed:', err);
      }

      try {
        await billingManager.downgradeExpiredPlans();
      } catch (err) {
        console.error('Plan downgrade check failed:', err);
      }
    }, 60000);
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
