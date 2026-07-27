const API = ''; // same origin -- server serves both API and this dashboard

const state = {
  token: localStorage.getItem('solenex_token') || null,
  user: null,
  bots: [],
  sites: [],
  stores: [],
  bookingPages: [],
  mode: 'login', // 'login' | 'register'
};

// ---- DOM refs ----
const authScreen = document.getElementById('authScreen');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSub = document.getElementById('authSub');
const authSubmit = document.getElementById('authSubmit');
const authToggleText = document.getElementById('authToggleText');
const authToggleBtn = document.getElementById('authToggleBtn');
const authError = document.getElementById('authError');

const planPill = document.getElementById('planPill');
const usageLine = document.getElementById('usageLine');
const botGrid = document.getElementById('botGrid');
const emptyState = document.getElementById('emptyState');
const newBotBtn = document.getElementById('newBotBtn');
const emptyNewBotBtn = document.getElementById('emptyNewBotBtn');
const signOutBtn = document.getElementById('signOutBtn');

const botModal = document.getElementById('botModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const botForm = document.getElementById('botForm');
const botTemplate = document.getElementById('botTemplate');
const faqFields = document.getElementById('faqFields');
const subFields = document.getElementById('subFields');
const aiFields = document.getElementById('aiFields');
const formError = document.getElementById('formError');
const botSubmitBtn = document.getElementById('botSubmitBtn');

const broadcastModal = document.getElementById('broadcastModal');
const closeBroadcastModalBtn = document.getElementById('closeBroadcastModalBtn');
const broadcastContactCount = document.getElementById('broadcastContactCount');
const broadcastForm = document.getElementById('broadcastForm');
const broadcastMessage = document.getElementById('broadcastMessage');
const broadcastSchedule = document.getElementById('broadcastSchedule');
const broadcastFormError = document.getElementById('broadcastFormError');
const broadcastSubmitBtn = document.getElementById('broadcastSubmitBtn');
const broadcastHistory = document.getElementById('broadcastHistory');
let activeBroadcastBotId = null;

const emailUsageLine = document.getElementById('emailUsageLine');
const emailListGrid = document.getElementById('emailListGrid');
const emailListEmptyState = document.getElementById('emailListEmptyState');
const newListBtn = document.getElementById('newListBtn');
const emptyNewListBtn = document.getElementById('emptyNewListBtn');
const editSmtpBtn = document.getElementById('editSmtpBtn');

const smtpModal = document.getElementById('smtpModal');
const closeSmtpModalBtn = document.getElementById('closeSmtpModalBtn');
const smtpForm = document.getElementById('smtpForm');
const smtpFormError = document.getElementById('smtpFormError');
const smtpSubmitBtn = document.getElementById('smtpSubmitBtn');

const listModal = document.getElementById('listModal');
const closeListModalBtn = document.getElementById('closeListModalBtn');
const listForm = document.getElementById('listForm');
const listFormError = document.getElementById('listFormError');
const listSubmitBtn = document.getElementById('listSubmitBtn');

const listManageModal = document.getElementById('listManageModal');
const listManageTitle = document.getElementById('listManageTitle');
const closeListManageModalBtn = document.getElementById('closeListManageModalBtn');
const contactList = document.getElementById('contactList');
const bulkContactForm = document.getElementById('bulkContactForm');
const bulkContactText = document.getElementById('bulkContactText');
const bulkContactError = document.getElementById('bulkContactError');
const bulkContactSubmitBtn = document.getElementById('bulkContactSubmitBtn');
const campaignForm = document.getElementById('campaignForm');
const campaignFormError = document.getElementById('campaignFormError');
const campaignSubmitBtn = document.getElementById('campaignSubmitBtn');
const campaignHistory = document.getElementById('campaignHistory');
let activeListId = null;
let state_emailLists = [];

const whatsappUsageLine = document.getElementById('whatsappUsageLine');
const whatsappGrid = document.getElementById('whatsappGrid');
const whatsappEmptyState = document.getElementById('whatsappEmptyState');
const newWhatsappBtn = document.getElementById('newWhatsappBtn');
const emptyNewWhatsappBtn = document.getElementById('emptyNewWhatsappBtn');
const whatsappModal = document.getElementById('whatsappModal');
const closeWhatsappModalBtn = document.getElementById('closeWhatsappModalBtn');
const whatsappForm = document.getElementById('whatsappForm');
const whatsappFormError = document.getElementById('whatsappFormError');
const whatsappSubmitBtn = document.getElementById('whatsappSubmitBtn');
const whatsappWebhookUrl = document.getElementById('whatsappWebhookUrl');
let state_whatsappChannels = [];
const PLAN_WHATSAPP_LIMITS = { free: 1, starter: 3, pro: 10, business: Infinity };

const marketplaceGrid = document.getElementById('marketplaceGrid');
const myPurchasesList = document.getElementById('myPurchasesList');
const newListingBtn = document.getElementById('newListingBtn');
const listingModal = document.getElementById('listingModal');
const closeListingModalBtn = document.getElementById('closeListingModalBtn');
const listingForm = document.getElementById('listingForm');
const listingPrice = document.getElementById('listingPrice');
const listingNowpaymentsField = document.getElementById('listingNowpaymentsField');
const listingFormError = document.getElementById('listingFormError');
const listingSubmitBtn = document.getElementById('listingSubmitBtn');
const configViewModal = document.getElementById('configViewModal');
const configViewTitle = document.getElementById('configViewTitle');
const closeConfigViewModalBtn = document.getElementById('closeConfigViewModalBtn');
const configViewContent = document.getElementById('configViewContent');

const billingStatusLine = document.getElementById('billingStatusLine');
const upgradeBtn = document.getElementById('upgradeBtn');
const upgradeModal = document.getElementById('upgradeModal');
const closeUpgradeModalBtn = document.getElementById('closeUpgradeModalBtn');
const upgradeForm = document.getElementById('upgradeForm');
const upgradePlan = document.getElementById('upgradePlan');
const upgradeProvider = document.getElementById('upgradeProvider');
const upgradePriceHint = document.getElementById('upgradePriceHint');
const upgradeMpesaField = document.getElementById('upgradeMpesaField');
const upgradeFormError = document.getElementById('upgradeFormError');
const upgradeSubmitBtn = document.getElementById('upgradeSubmitBtn');
let billingPricing = {};
let billingProviders = {};

listingPrice.addEventListener('input', () => {
  listingNowpaymentsField.classList.toggle('hidden', Number(listingPrice.value) <= 0);
});

const siteUsageLine = document.getElementById('siteUsageLine');
const siteGrid = document.getElementById('siteGrid');
const siteEmptyState = document.getElementById('siteEmptyState');
const newSiteBtn = document.getElementById('newSiteBtn');
const emptyNewSiteBtn = document.getElementById('emptyNewSiteBtn');

const siteModal = document.getElementById('siteModal');
const closeSiteModalBtn = document.getElementById('closeSiteModalBtn');
const siteForm = document.getElementById('siteForm');
const siteSlugInput = document.getElementById('siteSlug');
const slugPreview = document.getElementById('slugPreview');
const siteTypeSelect = document.getElementById('siteType');
const linkbioFields = document.getElementById('linkbioFields');
const landingFields = document.getElementById('landingFields');
const linkRows = document.getElementById('linkRows');
const addLinkRowBtn = document.getElementById('addLinkRowBtn');
const sectionRows = document.getElementById('sectionRows');
const addSectionRowBtn = document.getElementById('addSectionRowBtn');
const siteFormError = document.getElementById('siteFormError');
const siteSubmitBtn = document.getElementById('siteSubmitBtn');

const PLAN_SITE_LIMITS = { free: 1, starter: 3, pro: 10, business: Infinity };

const storeUsageLine = document.getElementById('storeUsageLine');
const storeGrid = document.getElementById('storeGrid');
const storeEmptyState = document.getElementById('storeEmptyState');
const newStoreBtn = document.getElementById('newStoreBtn');
const emptyNewStoreBtn = document.getElementById('emptyNewStoreBtn');

const storeModal = document.getElementById('storeModal');
const closeStoreModalBtn = document.getElementById('closeStoreModalBtn');
const storeForm = document.getElementById('storeForm');
const storeSlugInput = document.getElementById('storeSlug');
const storeSlugPreview = document.getElementById('storeSlugPreview');
const storeFormError = document.getElementById('storeFormError');
const storeSubmitBtn = document.getElementById('storeSubmitBtn');

const storeEnableMpesa = document.getElementById('storeEnableMpesa');
const storeMpesaFields = document.getElementById('storeMpesaFields');
storeEnableMpesa.addEventListener('change', () => storeMpesaFields.classList.toggle('hidden', !storeEnableMpesa.checked));

const storeEnablePaypal = document.getElementById('storeEnablePaypal');
const storePaypalFields = document.getElementById('storePaypalFields');
storeEnablePaypal.addEventListener('change', () => storePaypalFields.classList.toggle('hidden', !storeEnablePaypal.checked));

const storeEnableCrypto = document.getElementById('storeEnableCrypto');
const storeCryptoFields = document.getElementById('storeCryptoFields');
storeEnableCrypto.addEventListener('change', () => storeCryptoFields.classList.toggle('hidden', !storeEnableCrypto.checked));

const storeEnableEmail = document.getElementById('storeEnableEmail');
const storeEmailFields = document.getElementById('storeEmailFields');
storeEnableEmail.addEventListener('change', () => storeEmailFields.classList.toggle('hidden', !storeEnableEmail.checked));

const productsModal = document.getElementById('productsModal');
const productsModalTitle = document.getElementById('productsModalTitle');
const closeProductsModalBtn = document.getElementById('closeProductsModalBtn');
const productList = document.getElementById('productList');
const productForm = document.getElementById('productForm');
const productFormError = document.getElementById('productFormError');
const productSubmitBtn = document.getElementById('productSubmitBtn');
let activeStoreId = null;

const bookingUsageLine = document.getElementById('bookingUsageLine');
const bookingGrid = document.getElementById('bookingGrid');
const bookingEmptyState = document.getElementById('bookingEmptyState');
const newBookingBtn = document.getElementById('newBookingBtn');
const emptyNewBookingBtn = document.getElementById('emptyNewBookingBtn');

const bookingModal = document.getElementById('bookingModal');
const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
const bookingForm = document.getElementById('bookingForm');
const bookingSlugInput = document.getElementById('bookingSlug');
const bookingSlugPreview = document.getElementById('bookingSlugPreview');
const weeklyHours = document.getElementById('weeklyHours');
const bookingFormError = document.getElementById('bookingFormError');
const bookingSubmitBtn = document.getElementById('bookingSubmitBtn');

const bookingEnableEmail = document.getElementById('bookingEnableEmail');
const bookingEmailFields = document.getElementById('bookingEmailFields');
bookingEnableEmail.addEventListener('change', () => bookingEmailFields.classList.toggle('hidden', !bookingEnableEmail.checked));

const bookingTimezoneSelect = document.getElementById('bookingTimezone');
const bookingTimezoneCustom = document.getElementById('bookingTimezoneCustom');
bookingTimezoneSelect.addEventListener('change', () => {
  bookingTimezoneCustom.classList.toggle('hidden', bookingTimezoneSelect.value !== '__custom__');
});

const bookingManageModal = document.getElementById('bookingManageModal');
const bookingManageTitle = document.getElementById('bookingManageTitle');
const closeBookingManageModalBtn = document.getElementById('closeBookingManageModalBtn');
const serviceList = document.getElementById('serviceList');
const serviceForm = document.getElementById('serviceForm');
const serviceFormError = document.getElementById('serviceFormError');
const serviceSubmitBtn = document.getElementById('serviceSubmitBtn');
const bookingsList = document.getElementById('bookingsList');
let activeBookingPageId = null;

const DAY_LABELS = [['sun', 'Sun'], ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat']];
function buildWeeklyHoursEditor() {
  weeklyHours.innerHTML = DAY_LABELS.map(([key, label]) => `
    <div class="hours-row" data-day="${key}">
      <span class="hours-day">${label}</span>
      <input type="checkbox" class="day-open" ${key !== 'sun' ? 'checked' : ''} />
      <input type="time" class="day-start" value="09:00" />
      <input type="time" class="day-end" value="17:00" />
    </div>
  `).join('');
}
function readWeeklyHours() {
  const weekly = {};
  weeklyHours.querySelectorAll('.hours-row').forEach(row => {
    const day = row.dataset.day;
    const isOpen = row.querySelector('.day-open').checked;
    const start = row.querySelector('.day-start').value;
    const end = row.querySelector('.day-end').value;
    weekly[day] = isOpen && start && end ? [{ start, end }] : [];
  });
  return weekly;
}

const PLAN_LIMITS = { free: 1, starter: 5, pro: 20, business: Infinity };

// ---- API helper ----
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---- Auth screen ----
authToggleBtn.addEventListener('click', () => {
  state.mode = state.mode === 'login' ? 'register' : 'login';
  updateAuthCopy();
});

function updateAuthCopy() {
  authError.textContent = '';
  if (state.mode === 'login') {
    authTitle.textContent = 'Sign in to your tower';
    authSub.textContent = 'Manage every bot you run, from one place.';
    authSubmit.textContent = 'Sign in';
    authToggleText.textContent = 'New here?';
    authToggleBtn.textContent = 'Create an account';
  } else {
    authTitle.textContent = 'Set up your tower';
    authSub.textContent = 'One account, every bot you launch.';
    authSubmit.textContent = 'Create account';
    authToggleText.textContent = 'Already set up?';
    authToggleBtn.textContent = 'Sign in instead';
  }
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  authSubmit.disabled = true;
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  try {
    if (state.mode === 'register') {
      await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
    }
    const result = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem('solenex_token', state.token);
    await enterDashboard();
  } catch (err) {
    authError.textContent = err.message;
  } finally {
    authSubmit.disabled = false;
  }
});

signOutBtn.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('solenex_token');
  dashboard.classList.add('hidden');
  authScreen.classList.remove('hidden');
});

// ---- Dashboard ----
async function enterDashboard() {
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  if (!state.user) {
    const result = await apiFetch('/api/auth/me');
    state.user = result.user;
  }
  await refreshBots();
  await refreshSites();
  await refreshStores();
  await refreshBookingPages();
  await refreshAnalytics();
  await refreshEmailLists();
  await refreshWhatsappChannels();
  await refreshMarketplace();
  await refreshBillingStatus();
}

async function refreshBots() {
  try {
    const result = await apiFetch('/api/bots');
    state.bots = result.bots;
    renderBots();
  } catch (err) {
    if (err.message.includes('token')) {
      signOutBtn.click();
    }
  }
}

async function refreshSites() {
  try {
    const result = await apiFetch('/api/sites');
    state.sites = result.sites;
    renderSites();
  } catch (err) {
    if (err.message.includes('token')) {
      signOutBtn.click();
    }
  }
}

function renderBots() {
  const plan = state.user?.plan || 'free';
  planPill.textContent = plan;
  const limit = PLAN_LIMITS[plan] ?? 1;
  usageLine.textContent = `${state.bots.length} of ${limit === Infinity ? 'unlimited' : limit} bots running`;

  botGrid.innerHTML = '';

  if (state.bots.length === 0) {
    emptyState.classList.remove('hidden');
    botGrid.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  botGrid.classList.remove('hidden');

  state.bots.forEach(bot => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    const isActive = bot.active !== false;
    card.innerHTML = `
      <div class="bot-card-head">
        <span class="pulse-dot ${isActive ? '' : 'paused'}"></span>
        <span class="bot-name">${escapeHtml(bot.name)}</span>
      </div>
      <p class="bot-username">@${escapeHtml(bot.telegram_bot_username || 'unknown')}</p>
      <div class="bot-meta-row">
        <span class="bot-type-tag">${bot.template_type === 'subscription' ? 'Subscription' : bot.template_type === 'ai' ? 'AI Assistant' : 'FAQ'}</span>
        <button class="bot-type-tag" data-id="${bot.id}" data-action="broadcast" style="background:none;border:none;cursor:pointer;padding:0;font-family:inherit;">Broadcast</button>
        <button class="bot-delete" data-id="${bot.id}">Disconnect</button>
      </div>
    `;
    botGrid.appendChild(card);
  });

  botGrid.querySelectorAll('.bot-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteBot(btn.dataset.id));
  });
  botGrid.querySelectorAll('[data-action="broadcast"]').forEach(btn => {
    btn.addEventListener('click', () => openBroadcastModal(btn.dataset.id));
  });
}

async function deleteBot(id) {
  if (!confirm('Disconnect this bot? It will stop responding immediately.')) return;
  try {
    await apiFetch(`/api/bots/${id}`, { method: 'DELETE' });
    await refreshBots();
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- New bot modal ----
function openModal() {
  formError.textContent = '';
  botForm.reset();
  botTemplate.value = 'faq';
  toggleTemplateFields();
  mpesaFields.classList.add('hidden');
  paypalFields.classList.add('hidden');
  cryptoFields.classList.add('hidden');
  botModal.classList.remove('hidden');
}
function closeModal() {
  botModal.classList.add('hidden');
}

newBotBtn.addEventListener('click', openModal);
emptyNewBotBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
botModal.addEventListener('click', (e) => { if (e.target === botModal) closeModal(); });

botTemplate.addEventListener('change', toggleTemplateFields);
function toggleTemplateFields() {
  const value = botTemplate.value;
  faqFields.classList.toggle('hidden', value !== 'faq');
  subFields.classList.toggle('hidden', value !== 'subscription');
  aiFields.classList.toggle('hidden', value !== 'ai');
}

const enableMpesaCheckbox = document.getElementById('enableMpesa');
const mpesaFields = document.getElementById('mpesaFields');
enableMpesaCheckbox.addEventListener('change', () => {
  mpesaFields.classList.toggle('hidden', !enableMpesaCheckbox.checked);
});

const enablePaypalCheckbox = document.getElementById('enablePaypal');
const paypalFields = document.getElementById('paypalFields');
enablePaypalCheckbox.addEventListener('change', () => {
  paypalFields.classList.toggle('hidden', !enablePaypalCheckbox.checked);
});

const enableCryptoCheckbox = document.getElementById('enableCrypto');
const cryptoFields = document.getElementById('cryptoFields');
enableCryptoCheckbox.addEventListener('change', () => {
  cryptoFields.classList.toggle('hidden', !enableCryptoCheckbox.checked);
});

botForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  botSubmitBtn.disabled = true;
  botSubmitBtn.textContent = 'Connecting…';

  const name = document.getElementById('botName').value.trim();
  const telegramToken = document.getElementById('botToken').value.trim();
  const templateType = botTemplate.value;

  let config = {};
  if (templateType === 'faq') {
    config = {
      welcomeMessage: document.getElementById('faqWelcome').value.trim() || undefined,
      fallback: document.getElementById('faqFallback').value.trim() || undefined,
      faqs: [],
    };
  } else if (templateType === 'ai') {
    config = {
      welcomeMessage: document.getElementById('aiWelcome').value.trim() || undefined,
      systemPrompt: document.getElementById('aiSystemPrompt').value.trim() || undefined,
      aiProvider: document.getElementById('aiProvider').value,
      apiKey: document.getElementById('aiApiKey').value.trim(),
      model: document.getElementById('aiModel').value.trim() || undefined,
    };
  } else {
    config = {
      productTitle: document.getElementById('subProductTitle').value.trim() || undefined,
      priceStars: Number(document.getElementById('subPrice').value) || 50,
      durationDays: Number(document.getElementById('subDuration').value) || 30,
      privateChannelId: document.getElementById('subChannelId').value.trim() || undefined,
      paymentMethods: ['stars'],
    };

    if (enableMpesaCheckbox.checked) {
      config.paymentMethods.push('mpesa');
      config.priceKES = Number(document.getElementById('mpesaPriceKES').value) || undefined;
      config.mpesa = {
        shortcode: document.getElementById('mpesaShortcode').value.trim(),
        passkey: document.getElementById('mpesaPasskey').value.trim(),
        consumerKey: document.getElementById('mpesaConsumerKey').value.trim(),
        consumerSecret: document.getElementById('mpesaConsumerSecret').value.trim(),
        environment: document.getElementById('mpesaEnvironment').value,
      };
    }

    if (enablePaypalCheckbox.checked) {
      config.paymentMethods.push('paypal');
      config.pricePayPal = Number(document.getElementById('paypalPrice').value) || undefined;
      config.paypalCurrency = document.getElementById('paypalCurrency').value.trim() || 'USD';
      config.paypal = {
        clientId: document.getElementById('paypalClientId').value.trim(),
        clientSecret: document.getElementById('paypalClientSecret').value.trim(),
        environment: document.getElementById('paypalEnvironment').value,
      };
    }

    if (enableCryptoCheckbox.checked) {
      config.paymentMethods.push('crypto');
      config.priceCryptoUSD = Number(document.getElementById('cryptoPriceUSD').value) || undefined;
      config.nowpayments = {
        apiKey: document.getElementById('cryptoApiKey').value.trim(),
        ipnSecret: document.getElementById('cryptoIpnSecret').value.trim(),
      };
    }
  }

  try {
    await apiFetch('/api/bots', {
      method: 'POST',
      body: JSON.stringify({ name, telegramToken, templateType, config }),
    });
    closeModal();
    await refreshBots();
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    botSubmitBtn.disabled = false;
    botSubmitBtn.textContent = 'Connect bot';
  }
});

// ---- Sites ----
function renderSites() {
  const plan = state.user?.plan || 'free';
  const limit = PLAN_SITE_LIMITS[plan] ?? 1;
  siteUsageLine.textContent = `${state.sites.length} of ${limit === Infinity ? 'unlimited' : limit} pages`;

  siteGrid.innerHTML = '';

  if (state.sites.length === 0) {
    siteEmptyState.classList.remove('hidden');
    siteGrid.classList.add('hidden');
    return;
  }
  siteEmptyState.classList.add('hidden');
  siteGrid.classList.remove('hidden');

  state.sites.forEach(site => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    const isActive = site.active !== false;
    const url = `${window.location.origin}/s/${site.slug}`;
    card.innerHTML = `
      <div class="bot-card-head">
        <span class="pulse-dot ${isActive ? '' : 'paused'}"></span>
        <span class="bot-name">${escapeHtml(site.config?.title || site.slug)}</span>
      </div>
      <p class="bot-username">${escapeHtml(url)}</p>
      <div class="bot-meta-row">
        <span class="bot-type-tag">${site.site_type === 'landing' ? 'Landing' : 'Link-in-bio'}</span>
        <a href="${url}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color: var(--secondary); text-decoration:none;">View</a>
        <button class="bot-delete" data-id="${site.id}">Delete</button>
      </div>
    `;
    siteGrid.appendChild(card);
  });

  siteGrid.querySelectorAll('.bot-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteSite(btn.dataset.id));
  });
}

async function deleteSite(id) {
  if (!confirm('Delete this page? The URL will stop working immediately.')) return;
  try {
    await apiFetch(`/api/sites/${id}`, { method: 'DELETE' });
    await refreshSites();
  } catch (err) {
    alert(err.message);
  }
}

function makeLinkRow(label = '', url = '') {
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = `
    <input type="text" class="link-label" placeholder="Label (e.g. Shop)" value="${escapeHtml(label)}" />
    <input type="url" class="link-url" placeholder="https://..." value="${escapeHtml(url)}" />
    <button type="button" class="remove-link" aria-label="Remove link">&times;</button>
  `;
  row.querySelector('.remove-link').addEventListener('click', () => row.remove());
  return row;
}

function makeSectionRow(heading = '', body = '') {
  const row = document.createElement('div');
  row.className = 'section-row';
  row.innerHTML = `
    <button type="button" class="remove-section" aria-label="Remove section">&times;</button>
    <input type="text" class="section-heading" placeholder="Heading (e.g. Why us)" value="${escapeHtml(heading)}" />
    <textarea class="section-body" placeholder="A sentence or two...">${escapeHtml(body)}</textarea>
  `;
  row.querySelector('.remove-section').addEventListener('click', () => row.remove());
  return row;
}

addLinkRowBtn.addEventListener('click', () => {
  linkRows.appendChild(makeLinkRow());
});
addSectionRowBtn.addEventListener('click', () => {
  sectionRows.appendChild(makeSectionRow());
});

siteSlugInput.addEventListener('input', () => {
  const slug = siteSlugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'your-page';
  slugPreview.textContent = `${window.location.host}/s/${slug}`;
});

siteTypeSelect.addEventListener('change', () => {
  const isLanding = siteTypeSelect.value === 'landing';
  linkbioFields.classList.toggle('hidden', isLanding);
  landingFields.classList.toggle('hidden', !isLanding);
});

function openSiteModal() {
  siteFormError.textContent = '';
  siteForm.reset();
  siteTypeSelect.value = 'linkbio';
  linkbioFields.classList.remove('hidden');
  landingFields.classList.add('hidden');
  linkRows.innerHTML = '';
  linkRows.appendChild(makeLinkRow());
  sectionRows.innerHTML = '';
  sectionRows.appendChild(makeSectionRow());
  slugPreview.textContent = `${window.location.host}/s/your-page`;
  siteModal.classList.remove('hidden');
}
function closeSiteModal() {
  siteModal.classList.add('hidden');
}

newSiteBtn.addEventListener('click', openSiteModal);
emptyNewSiteBtn.addEventListener('click', openSiteModal);
closeSiteModalBtn.addEventListener('click', closeSiteModal);
siteModal.addEventListener('click', (e) => { if (e.target === siteModal) closeSiteModal(); });

siteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  siteFormError.textContent = '';
  siteSubmitBtn.disabled = true;
  siteSubmitBtn.textContent = 'Publishing…';

  const slug = siteSlugInput.value.trim();
  const siteType = siteTypeSelect.value;
  const title = document.getElementById('siteTitle').value.trim();

  let config = { title };

  if (siteType === 'linkbio') {
    const bio = document.getElementById('siteBio').value.trim();
    const links = Array.from(linkRows.querySelectorAll('.link-row'))
      .map(row => ({
        label: row.querySelector('.link-label').value.trim(),
        url: row.querySelector('.link-url').value.trim(),
      }))
      .filter(l => l.label && l.url);
    config = { ...config, bio, links };
  } else {
    const tagline = document.getElementById('landingTagline').value.trim();
    const heroImageUrl = document.getElementById('landingHeroImage').value.trim();
    const ctaLabel = document.getElementById('landingCtaLabel').value.trim();
    const ctaUrl = document.getElementById('landingCtaUrl').value.trim();
    const sections = Array.from(sectionRows.querySelectorAll('.section-row'))
      .map(row => ({
        heading: row.querySelector('.section-heading').value.trim(),
        body: row.querySelector('.section-body').value.trim(),
      }))
      .filter(s => s.heading || s.body);
    config = { ...config, tagline, heroImageUrl, ctaLabel, ctaUrl, sections };
  }

  try {
    await apiFetch('/api/sites', {
      method: 'POST',
      body: JSON.stringify({ slug, siteType, config }),
    });
    closeSiteModal();
    await refreshSites();
  } catch (err) {
    siteFormError.textContent = err.message;
  } finally {
    siteSubmitBtn.disabled = false;
    siteSubmitBtn.textContent = 'Publish page';
  }
});

// ---- Stores ----
const PLAN_STORE_LIMITS = { free: 1, starter: 3, pro: 10, business: Infinity };

async function refreshStores() {
  try {
    const result = await apiFetch('/api/stores');
    state.stores = result.stores;
    renderStores();
  } catch (err) {
    if (err.message.includes('token')) signOutBtn.click();
  }
}

function renderStores() {
  const plan = state.user?.plan || 'free';
  const limit = PLAN_STORE_LIMITS[plan] ?? 1;
  storeUsageLine.textContent = `${state.stores.length} of ${limit === Infinity ? 'unlimited' : limit} stores`;

  storeGrid.innerHTML = '';

  if (state.stores.length === 0) {
    storeEmptyState.classList.remove('hidden');
    storeGrid.classList.add('hidden');
    return;
  }
  storeEmptyState.classList.add('hidden');
  storeGrid.classList.remove('hidden');

  state.stores.forEach(store => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    const url = `${window.location.origin}/store/${store.slug}`;
    card.innerHTML = `
      <div class="bot-card-head">
        <span class="pulse-dot"></span>
        <span class="bot-name">${escapeHtml(store.config?.title || store.slug)}</span>
      </div>
      <p class="bot-username">${escapeHtml(url)}</p>
      <div class="bot-meta-row">
        <button class="bot-type-tag" data-id="${store.id}" data-action="manage" style="background:none;border:none;cursor:pointer;padding:0;font-family:inherit;">Manage products</button>
        <button class="bot-delete" data-id="${store.id}" data-action="delete">Delete</button>
      </div>
    `;
    storeGrid.appendChild(card);
  });

  storeGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteStore(btn.dataset.id));
  });
  storeGrid.querySelectorAll('[data-action="manage"]').forEach(btn => {
    btn.addEventListener('click', () => openProductsModal(btn.dataset.id));
  });
}

async function deleteStore(id) {
  if (!confirm('Delete this store? Its page and products will stop working immediately.')) return;
  try {
    await apiFetch(`/api/stores/${id}`, { method: 'DELETE' });
    await refreshStores();
  } catch (err) {
    alert(err.message);
  }
}

storeSlugInput.addEventListener('input', () => {
  const slug = storeSlugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'your-shop';
  storeSlugPreview.textContent = `${window.location.host}/store/${slug}`;
});

function openStoreModal() {
  storeFormError.textContent = '';
  storeForm.reset();
  storeMpesaFields.classList.add('hidden');
  storePaypalFields.classList.add('hidden');
  storeCryptoFields.classList.add('hidden');
  storeEmailFields.classList.add('hidden');
  storeSlugPreview.textContent = `${window.location.host}/store/your-shop`;
  storeModal.classList.remove('hidden');
}
function closeStoreModal() {
  storeModal.classList.add('hidden');
}

newStoreBtn.addEventListener('click', openStoreModal);
emptyNewStoreBtn.addEventListener('click', openStoreModal);
closeStoreModalBtn.addEventListener('click', closeStoreModal);
storeModal.addEventListener('click', (e) => { if (e.target === storeModal) closeStoreModal(); });

storeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  storeFormError.textContent = '';
  storeSubmitBtn.disabled = true;
  storeSubmitBtn.textContent = 'Creating…';

  const slug = storeSlugInput.value.trim();
  const title = document.getElementById('storeTitle').value.trim();
  const description = document.getElementById('storeDescription').value.trim();

  const config = { title, description, paymentMethods: [] };

  if (storeEnableMpesa.checked) {
    config.paymentMethods.push('mpesa');
    config.mpesa = {
      shortcode: document.getElementById('storeMpesaShortcode').value.trim(),
      passkey: document.getElementById('storeMpesaPasskey').value.trim(),
      consumerKey: document.getElementById('storeMpesaConsumerKey').value.trim(),
      consumerSecret: document.getElementById('storeMpesaConsumerSecret').value.trim(),
      environment: document.getElementById('storeMpesaEnvironment').value,
    };
  }
  if (storeEnablePaypal.checked) {
    config.paymentMethods.push('paypal');
    config.paypal = {
      clientId: document.getElementById('storePaypalClientId').value.trim(),
      clientSecret: document.getElementById('storePaypalClientSecret').value.trim(),
      environment: document.getElementById('storePaypalEnvironment').value,
    };
  }
  if (storeEnableCrypto.checked) {
    config.paymentMethods.push('crypto');
    config.nowpayments = {
      apiKey: document.getElementById('storeCryptoApiKey').value.trim(),
      ipnSecret: document.getElementById('storeCryptoIpnSecret').value.trim(),
    };
  }
  if (storeEnableEmail.checked) {
    config.email = {
      host: document.getElementById('storeSmtpHost').value.trim(),
      port: document.getElementById('storeSmtpPort').value.trim(),
      user: document.getElementById('storeSmtpUser').value.trim(),
      pass: document.getElementById('storeSmtpPass').value.trim(),
      fromName: document.getElementById('storeSmtpFromName').value.trim(),
    };
  }

  try {
    await apiFetch('/api/stores', { method: 'POST', body: JSON.stringify({ slug, config }) });
    closeStoreModal();
    await refreshStores();
  } catch (err) {
    storeFormError.textContent = err.message;
  } finally {
    storeSubmitBtn.disabled = false;
    storeSubmitBtn.textContent = 'Create store';
  }
});

// ---- Products ----
async function openProductsModal(storeId) {
  activeStoreId = storeId;
  const store = state.stores.find(s => s.id === storeId);
  productsModalTitle.textContent = `Products — ${store?.config?.title || store?.slug || ''}`;
  productFormError.textContent = '';
  productForm.reset();
  productsModal.classList.remove('hidden');
  await loadProducts(storeId);
}
function closeProductsModal() {
  productsModal.classList.add('hidden');
  activeStoreId = null;
}
closeProductsModalBtn.addEventListener('click', closeProductsModal);
productsModal.addEventListener('click', (e) => { if (e.target === productsModal) closeProductsModal(); });

async function loadProducts(storeId) {
  productList.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch(`/api/stores/${storeId}/products`);
    if (result.products.length === 0) {
      productList.innerHTML = '<p class="field-hint">No products yet -- add one below.</p>';
      return;
    }
    productList.innerHTML = '';
    result.products.forEach(p => {
      const row = document.createElement('div');
      row.className = 'product-row';
      row.innerHTML = `
        <div>
          <div class="product-row-name">${escapeHtml(p.name)}</div>
          <div class="product-row-price">${Number(p.price).toFixed(2)} ${escapeHtml(p.currency)}</div>
        </div>
        <button class="product-row-delete" data-id="${p.id}">Delete</button>
      `;
      row.querySelector('.product-row-delete').addEventListener('click', () => deleteProduct(storeId, p.id));
      productList.appendChild(row);
    });
  } catch (err) {
    productList.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function deleteProduct(storeId, productId) {
  if (!confirm('Delete this product?')) return;
  try {
    await apiFetch(`/api/stores/${storeId}/products/${productId}`, { method: 'DELETE' });
    await loadProducts(storeId);
  } catch (err) {
    alert(err.message);
  }
}

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeStoreId) return;
  productFormError.textContent = '';
  productSubmitBtn.disabled = true;
  productSubmitBtn.textContent = 'Adding…';

  const body = {
    name: document.getElementById('productName').value.trim(),
    price: Number(document.getElementById('productPrice').value),
    currency: document.getElementById('productCurrency').value.trim() || 'USD',
    description: document.getElementById('productDescription').value.trim(),
    imageUrl: document.getElementById('productImageUrl').value.trim(),
    deliveryInfo: document.getElementById('productDeliveryInfo').value.trim(),
  };

  try {
    await apiFetch(`/api/stores/${activeStoreId}/products`, { method: 'POST', body: JSON.stringify(body) });
    productForm.reset();
    await loadProducts(activeStoreId);
  } catch (err) {
    productFormError.textContent = err.message;
  } finally {
    productSubmitBtn.disabled = false;
    productSubmitBtn.textContent = 'Add product';
  }
});

// ---- Booking pages ----
const PLAN_BOOKING_LIMITS = { free: 1, starter: 3, pro: 10, business: Infinity };

async function refreshBookingPages() {
  try {
    const result = await apiFetch('/api/booking-pages');
    state.bookingPages = result.pages;
    renderBookingPages();
  } catch (err) {
    if (err.message.includes('token')) signOutBtn.click();
  }
}

function renderBookingPages() {
  const plan = state.user?.plan || 'free';
  const limit = PLAN_BOOKING_LIMITS[plan] ?? 1;
  bookingUsageLine.textContent = `${state.bookingPages.length} of ${limit === Infinity ? 'unlimited' : limit} pages`;

  bookingGrid.innerHTML = '';
  if (state.bookingPages.length === 0) {
    bookingEmptyState.classList.remove('hidden');
    bookingGrid.classList.add('hidden');
    return;
  }
  bookingEmptyState.classList.add('hidden');
  bookingGrid.classList.remove('hidden');

  state.bookingPages.forEach(page => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    const url = `${window.location.origin}/book/${page.slug}`;
    card.innerHTML = `
      <div class="bot-card-head">
        <span class="pulse-dot"></span>
        <span class="bot-name">${escapeHtml(page.config?.title || page.slug)}</span>
      </div>
      <p class="bot-username">${escapeHtml(url)}</p>
      <div class="bot-meta-row">
        <button class="bot-type-tag" data-id="${page.id}" data-action="manage" style="background:none;border:none;cursor:pointer;padding:0;font-family:inherit;">Manage</button>
        <button class="bot-delete" data-id="${page.id}" data-action="delete">Delete</button>
      </div>
    `;
    bookingGrid.appendChild(card);
  });

  bookingGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteBookingPage(btn.dataset.id));
  });
  bookingGrid.querySelectorAll('[data-action="manage"]').forEach(btn => {
    btn.addEventListener('click', () => openBookingManageModal(btn.dataset.id));
  });
}

async function deleteBookingPage(id) {
  if (!confirm('Delete this booking page? Its URL and all upcoming bookings will stop working.')) return;
  try {
    await apiFetch(`/api/booking-pages/${id}`, { method: 'DELETE' });
    await refreshBookingPages();
  } catch (err) {
    alert(err.message);
  }
}

bookingSlugInput.addEventListener('input', () => {
  const slug = bookingSlugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'your-page';
  bookingSlugPreview.textContent = `${window.location.host}/book/${slug}`;
});

function openBookingModal() {
  bookingFormError.textContent = '';
  bookingForm.reset();
  buildWeeklyHoursEditor();
  bookingEmailFields.classList.add('hidden');
  bookingTimezoneCustom.classList.add('hidden');
  bookingSlugPreview.textContent = `${window.location.host}/book/your-page`;
  bookingModal.classList.remove('hidden');
}
function closeBookingModal() {
  bookingModal.classList.add('hidden');
}
newBookingBtn.addEventListener('click', openBookingModal);
emptyNewBookingBtn.addEventListener('click', openBookingModal);
closeBookingModalBtn.addEventListener('click', closeBookingModal);
bookingModal.addEventListener('click', (e) => { if (e.target === bookingModal) closeBookingModal(); });

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  bookingFormError.textContent = '';
  bookingSubmitBtn.disabled = true;
  bookingSubmitBtn.textContent = 'Creating…';

  const slug = bookingSlugInput.value.trim();
  const config = {
    title: document.getElementById('bookingTitle').value.trim(),
    description: document.getElementById('bookingDescription').value.trim(),
    availability: {
      slotMinutes: Number(document.getElementById('bookingSlotMinutes').value) || 30,
      timezone: bookingTimezoneSelect.value === '__custom__'
        ? (bookingTimezoneCustom.value.trim() || 'UTC')
        : bookingTimezoneSelect.value,
      weekly: readWeeklyHours(),
    },
  };

  if (bookingEnableEmail.checked) {
    config.email = {
      host: document.getElementById('bookingSmtpHost').value.trim(),
      port: document.getElementById('bookingSmtpPort').value.trim(),
      user: document.getElementById('bookingSmtpUser').value.trim(),
      pass: document.getElementById('bookingSmtpPass').value.trim(),
      fromName: document.getElementById('bookingSmtpFromName').value.trim(),
    };
  }

  try {
    await apiFetch('/api/booking-pages', { method: 'POST', body: JSON.stringify({ slug, config }) });
    closeBookingModal();
    await refreshBookingPages();
  } catch (err) {
    bookingFormError.textContent = err.message;
  } finally {
    bookingSubmitBtn.disabled = false;
    bookingSubmitBtn.textContent = 'Create booking page';
  }
});

// ---- Manage: services + bookings ----
async function openBookingManageModal(pageId) {
  activeBookingPageId = pageId;
  const page = state.bookingPages.find(p => p.id === pageId);
  bookingManageTitle.textContent = page?.config?.title || page?.slug || 'Manage';
  serviceFormError.textContent = '';
  serviceForm.reset();
  bookingManageModal.classList.remove('hidden');
  await loadServices(pageId);
  await loadBookings(pageId);
}
function closeBookingManageModal() {
  bookingManageModal.classList.add('hidden');
  activeBookingPageId = null;
}
closeBookingManageModalBtn.addEventListener('click', closeBookingManageModal);
bookingManageModal.addEventListener('click', (e) => { if (e.target === bookingManageModal) closeBookingManageModal(); });

async function loadServices(pageId) {
  serviceList.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch(`/api/booking-pages/${pageId}/services`);
    if (result.services.length === 0) {
      serviceList.innerHTML = '<p class="field-hint">No services yet -- add one below.</p>';
      return;
    }
    serviceList.innerHTML = '';
    result.services.forEach(s => {
      const row = document.createElement('div');
      row.className = 'product-row';
      row.innerHTML = `
        <div>
          <div class="product-row-name">${escapeHtml(s.name)}</div>
          <div class="product-row-price">${s.duration_minutes} min${s.price ? ` · ${Number(s.price).toFixed(2)} ${escapeHtml(s.currency)}` : ''}</div>
        </div>
        <button class="product-row-delete" data-id="${s.id}">Delete</button>
      `;
      row.querySelector('.product-row-delete').addEventListener('click', () => deleteService(pageId, s.id));
      serviceList.appendChild(row);
    });
  } catch (err) {
    serviceList.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function deleteService(pageId, serviceId) {
  if (!confirm('Delete this service?')) return;
  try {
    await apiFetch(`/api/booking-pages/${pageId}/services/${serviceId}`, { method: 'DELETE' });
    await loadServices(pageId);
  } catch (err) {
    alert(err.message);
  }
}

serviceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeBookingPageId) return;
  serviceFormError.textContent = '';
  serviceSubmitBtn.disabled = true;
  serviceSubmitBtn.textContent = 'Adding…';

  const body = {
    name: document.getElementById('serviceName').value.trim(),
    durationMinutes: Number(document.getElementById('serviceDuration').value) || 30,
    price: document.getElementById('servicePrice').value ? Number(document.getElementById('servicePrice').value) : undefined,
  };

  try {
    await apiFetch(`/api/booking-pages/${activeBookingPageId}/services`, { method: 'POST', body: JSON.stringify(body) });
    serviceForm.reset();
    await loadServices(activeBookingPageId);
  } catch (err) {
    serviceFormError.textContent = err.message;
  } finally {
    serviceSubmitBtn.disabled = false;
    serviceSubmitBtn.textContent = 'Add service';
  }
});

async function loadBookings(pageId) {
  bookingsList.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch(`/api/booking-pages/${pageId}/bookings`);
    if (result.bookings.length === 0) {
      bookingsList.innerHTML = '<p class="field-hint">No upcoming bookings.</p>';
      return;
    }
    bookingsList.innerHTML = '';
    result.bookings.forEach(b => {
      const row = document.createElement('div');
      row.className = 'product-row';
      const when = new Date(b.start_time).toLocaleString();
      row.innerHTML = `
        <div>
          <div class="product-row-name">${escapeHtml(b.customer_name)}</div>
          <div class="product-row-price">${escapeHtml(when)}</div>
        </div>
        <button class="product-row-delete" data-id="${b.id}">Cancel</button>
      `;
      row.querySelector('.product-row-delete').addEventListener('click', () => cancelBooking(pageId, b.id));
      bookingsList.appendChild(row);
    });
  } catch (err) {
    bookingsList.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function cancelBooking(pageId, bookingId) {
  if (!confirm('Cancel this booking?')) return;
  try {
    await apiFetch(`/api/booking-pages/${pageId}/bookings/${bookingId}/cancel`, { method: 'POST' });
    await loadBookings(pageId);
  } catch (err) {
    alert(err.message);
  }
}

// ---- Broadcasts ----
async function openBroadcastModal(botId) {
  activeBroadcastBotId = botId;
  broadcastFormError.textContent = '';
  broadcastForm.reset();
  broadcastContactCount.textContent = 'Loading contacts…';
  broadcastModal.classList.remove('hidden');

  try {
    const { count } = await apiFetch(`/api/bots/${botId}/contacts/count`);
    broadcastContactCount.textContent = count === 0
      ? 'Nobody has messaged this bot yet -- broadcasts need at least one contact.'
      : `Sending to ${count} contact${count === 1 ? '' : 's'} who have messaged this bot.`;
  } catch (err) {
    broadcastContactCount.textContent = '';
  }

  await loadBroadcastHistory(botId);
}
function closeBroadcastModal() {
  broadcastModal.classList.add('hidden');
  activeBroadcastBotId = null;
}
closeBroadcastModalBtn.addEventListener('click', closeBroadcastModal);
broadcastModal.addEventListener('click', (e) => { if (e.target === broadcastModal) closeBroadcastModal(); });

async function loadBroadcastHistory(botId) {
  broadcastHistory.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch(`/api/bots/${botId}/broadcasts`);
    if (result.broadcasts.length === 0) {
      broadcastHistory.innerHTML = '<p class="field-hint">No broadcasts sent yet.</p>';
      return;
    }
    broadcastHistory.innerHTML = '';
    result.broadcasts.forEach(b => {
      const row = document.createElement('div');
      row.className = 'product-row';
      const statusLabel = b.status === 'sent'
        ? `Sent · ${b.sent_count}/${b.total_count} delivered`
        : b.status === 'scheduled'
          ? `Scheduled for ${new Date(b.scheduled_at).toLocaleString()}`
          : b.status;
      row.innerHTML = `
        <div>
          <div class="product-row-name" style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(b.message)}</div>
          <div class="product-row-price">${escapeHtml(statusLabel)}</div>
        </div>
      `;
      broadcastHistory.appendChild(row);
    });
  } catch (err) {
    broadcastHistory.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

broadcastForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeBroadcastBotId) return;
  broadcastFormError.textContent = '';
  broadcastSubmitBtn.disabled = true;
  broadcastSubmitBtn.textContent = 'Sending…';

  const message = broadcastMessage.value.trim();
  const scheduledAt = broadcastSchedule.value ? new Date(broadcastSchedule.value).toISOString() : undefined;

  try {
    await apiFetch(`/api/bots/${activeBroadcastBotId}/broadcasts`, {
      method: 'POST',
      body: JSON.stringify({ message, scheduledAt }),
    });
    broadcastForm.reset();
    await loadBroadcastHistory(activeBroadcastBotId);
  } catch (err) {
    broadcastFormError.textContent = err.message;
  } finally {
    broadcastSubmitBtn.disabled = false;
    broadcastSubmitBtn.textContent = 'Send now';
  }
});

// ---- Analytics ----
const statGrid = document.getElementById('statGrid');

async function refreshAnalytics() {
  try {
    const { overview } = await apiFetch('/api/analytics/overview');
    renderAnalytics(overview);
  } catch (err) {
    statGrid.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

function renderAnalytics(o) {
  const revenueLines = (o.revenueByCurrency || []).length
    ? o.revenueByCurrency.map(r => `${Number(r.total).toFixed(2)} ${r.currency}`).join(' · ')
    : '0';
  const totalViews = (o.views?.sites || 0) + (o.views?.stores || 0) + (o.views?.bookingPages || 0);

  const cards = [
    { value: revenueLines, label: 'Revenue' },
    { value: o.activeSubscribers, label: 'Active subscribers' },
    { value: o.messagesReceived, label: 'Messages received' },
    { value: totalViews, label: 'Page views' },
    { value: o.confirmedBookings, label: 'Bookings' },
    { value: `${o.broadcasts?.delivered || 0}`, label: `Broadcast deliveries (${o.broadcasts?.broadcasts || 0} sent)` },
    { value: o.counts?.bots ?? 0, label: 'Bots' },
    { value: (o.counts?.sites ?? 0) + (o.counts?.stores ?? 0) + (o.counts?.bookingPages ?? 0), label: 'Pages published' },
  ];

  statGrid.innerHTML = cards.map(c => `
    <div class="stat-card">
      <p class="stat-value">${escapeHtml(String(c.value))}</p>
      <p class="stat-label">${escapeHtml(c.label)}</p>
    </div>
  `).join('');
}

// ---- Email marketing ----

editSmtpBtn.addEventListener('click', async () => {
  smtpFormError.textContent = '';
  smtpForm.reset();
  try {
    const { smtp } = await apiFetch('/api/email/settings/smtp');
    if (smtp) {
      document.getElementById('smtpHost').value = smtp.host || '';
      document.getElementById('smtpPort').value = smtp.port || '';
      document.getElementById('smtpUser').value = smtp.user || '';
      document.getElementById('smtpPass').value = smtp.pass || '';
      document.getElementById('smtpFromName').value = smtp.fromName || '';
    }
  } catch (err) { /* fine if none set yet */ }
  smtpModal.classList.remove('hidden');
});
closeSmtpModalBtn.addEventListener('click', () => smtpModal.classList.add('hidden'));
smtpModal.addEventListener('click', (e) => { if (e.target === smtpModal) smtpModal.classList.add('hidden'); });

smtpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  smtpFormError.textContent = '';
  smtpSubmitBtn.disabled = true;
  smtpSubmitBtn.textContent = 'Saving…';
  const smtp = {
    host: document.getElementById('smtpHost').value.trim(),
    port: document.getElementById('smtpPort').value.trim(),
    user: document.getElementById('smtpUser').value.trim(),
    pass: document.getElementById('smtpPass').value.trim(),
    fromName: document.getElementById('smtpFromName').value.trim(),
  };
  try {
    await apiFetch('/api/email/settings/smtp', { method: 'PUT', body: JSON.stringify({ smtp }) });
    smtpModal.classList.add('hidden');
  } catch (err) {
    smtpFormError.textContent = err.message;
  } finally {
    smtpSubmitBtn.disabled = false;
    smtpSubmitBtn.textContent = 'Save';
  }
});

async function refreshEmailLists() {
  try {
    const result = await apiFetch('/api/email/lists');
    state_emailLists = result.lists;
    renderEmailLists();
  } catch (err) {
    if (err.message.includes('token')) signOutBtn.click();
  }
}

function renderEmailLists() {
  emailUsageLine.textContent = `${state_emailLists.length} list${state_emailLists.length === 1 ? '' : 's'}`;
  emailListGrid.innerHTML = '';

  if (state_emailLists.length === 0) {
    emailListEmptyState.classList.remove('hidden');
    emailListGrid.classList.add('hidden');
    return;
  }
  emailListEmptyState.classList.add('hidden');
  emailListGrid.classList.remove('hidden');

  state_emailLists.forEach(list => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    card.innerHTML = `
      <div class="bot-card-head">
        <span class="pulse-dot"></span>
        <span class="bot-name">${escapeHtml(list.name)}</span>
      </div>
      <div class="bot-meta-row">
        <button class="bot-type-tag" data-id="${list.id}" data-action="manage" style="background:none;border:none;cursor:pointer;padding:0;font-family:inherit;">Manage</button>
        <button class="bot-delete" data-id="${list.id}" data-action="delete">Delete</button>
      </div>
    `;
    emailListGrid.appendChild(card);
  });

  emailListGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteEmailList(btn.dataset.id));
  });
  emailListGrid.querySelectorAll('[data-action="manage"]').forEach(btn => {
    btn.addEventListener('click', () => openListManageModal(btn.dataset.id));
  });
}

async function deleteEmailList(id) {
  if (!confirm('Delete this list and all its contacts?')) return;
  try {
    await apiFetch(`/api/email/lists/${id}`, { method: 'DELETE' });
    await refreshEmailLists();
  } catch (err) {
    alert(err.message);
  }
}

function openListModal() {
  listFormError.textContent = '';
  listForm.reset();
  listModal.classList.remove('hidden');
}
newListBtn.addEventListener('click', openListModal);
emptyNewListBtn.addEventListener('click', openListModal);
closeListModalBtn.addEventListener('click', () => listModal.classList.add('hidden'));
listModal.addEventListener('click', (e) => { if (e.target === listModal) listModal.classList.add('hidden'); });

listForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  listFormError.textContent = '';
  listSubmitBtn.disabled = true;
  listSubmitBtn.textContent = 'Creating…';
  try {
    await apiFetch('/api/email/lists', { method: 'POST', body: JSON.stringify({ name: document.getElementById('listName').value.trim() }) });
    listModal.classList.add('hidden');
    await refreshEmailLists();
  } catch (err) {
    listFormError.textContent = err.message;
  } finally {
    listSubmitBtn.disabled = false;
    listSubmitBtn.textContent = 'Create list';
  }
});

async function openListManageModal(listId) {
  activeListId = listId;
  const list = state_emailLists.find(l => l.id === listId);
  listManageTitle.textContent = list?.name || 'Manage list';
  bulkContactError.textContent = '';
  bulkContactForm.reset();
  campaignFormError.textContent = '';
  campaignForm.reset();
  listManageModal.classList.remove('hidden');
  await loadContacts(listId);
  await loadCampaigns(listId);
}
closeListManageModalBtn.addEventListener('click', () => { listManageModal.classList.add('hidden'); activeListId = null; });
listManageModal.addEventListener('click', (e) => { if (e.target === listManageModal) { listManageModal.classList.add('hidden'); activeListId = null; } });

async function loadContacts(listId) {
  contactList.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch(`/api/email/lists/${listId}/contacts`);
    if (result.contacts.length === 0) {
      contactList.innerHTML = '<p class="field-hint">No contacts yet -- add some below.</p>';
      return;
    }
    contactList.innerHTML = '';
    result.contacts.forEach(c => {
      const row = document.createElement('div');
      row.className = 'product-row';
      row.innerHTML = `
        <div>
          <div class="product-row-name">${escapeHtml(c.name || c.email)}</div>
          <div class="product-row-price">${escapeHtml(c.email)}${c.subscribed ? '' : ' · unsubscribed'}</div>
        </div>
        <button class="product-row-delete" data-id="${c.id}">Remove</button>
      `;
      row.querySelector('.product-row-delete').addEventListener('click', () => deleteContact(listId, c.id));
      contactList.appendChild(row);
    });
  } catch (err) {
    contactList.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function deleteContact(listId, contactId) {
  if (!confirm('Remove this contact?')) return;
  try {
    await apiFetch(`/api/email/lists/${listId}/contacts/${contactId}`, { method: 'DELETE' });
    await loadContacts(listId);
  } catch (err) {
    alert(err.message);
  }
}

bulkContactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeListId) return;
  bulkContactError.textContent = '';
  bulkContactSubmitBtn.disabled = true;
  bulkContactSubmitBtn.textContent = 'Adding…';
  try {
    const result = await apiFetch(`/api/email/lists/${activeListId}/contacts/bulk`, {
      method: 'POST',
      body: JSON.stringify({ rawText: bulkContactText.value }),
    });
    bulkContactForm.reset();
    await loadContacts(activeListId);
    bulkContactError.textContent = `Added ${result.added} contact(s).`;
    bulkContactError.style.color = 'var(--secondary)';
  } catch (err) {
    bulkContactError.style.color = 'var(--danger)';
    bulkContactError.textContent = err.message;
  } finally {
    bulkContactSubmitBtn.disabled = false;
    bulkContactSubmitBtn.textContent = 'Add contacts';
  }
});

async function loadCampaigns(listId) {
  campaignHistory.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch(`/api/email/lists/${listId}/campaigns`);
    if (result.campaigns.length === 0) {
      campaignHistory.innerHTML = '<p class="field-hint">No campaigns sent yet.</p>';
      return;
    }
    campaignHistory.innerHTML = '';
    result.campaigns.forEach(c => {
      const row = document.createElement('div');
      row.className = 'product-row';
      const statusLabel = c.status === 'sent'
        ? `Sent · ${c.sent_count}/${c.total_count} delivered`
        : c.status === 'scheduled'
          ? `Scheduled for ${new Date(c.scheduled_at).toLocaleString()}`
          : c.status;
      row.innerHTML = `
        <div>
          <div class="product-row-name" style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(c.subject)}</div>
          <div class="product-row-price">${escapeHtml(statusLabel)}</div>
        </div>
      `;
      campaignHistory.appendChild(row);
    });
  } catch (err) {
    campaignHistory.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

campaignForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeListId) return;
  campaignFormError.textContent = '';
  campaignSubmitBtn.disabled = true;
  campaignSubmitBtn.textContent = 'Sending…';

  const subject = document.getElementById('campaignSubject').value.trim();
  const body = document.getElementById('campaignBody').value.trim();
  const scheduleVal = document.getElementById('campaignSchedule').value;
  const scheduledAt = scheduleVal ? new Date(scheduleVal).toISOString() : undefined;

  try {
    await apiFetch(`/api/email/lists/${activeListId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify({ subject, body, scheduledAt }),
    });
    campaignForm.reset();
    await loadCampaigns(activeListId);
  } catch (err) {
    campaignFormError.textContent = err.message;
  } finally {
    campaignSubmitBtn.disabled = false;
    campaignSubmitBtn.textContent = 'Send now';
  }
});

// ---- WhatsApp channels ----
async function refreshWhatsappChannels() {
  try {
    const result = await apiFetch('/api/whatsapp');
    state_whatsappChannels = result.channels;
    renderWhatsappChannels();
  } catch (err) {
    if (err.message.includes('token')) signOutBtn.click();
  }
}

function renderWhatsappChannels() {
  const plan = state.user?.plan || 'free';
  const limit = PLAN_WHATSAPP_LIMITS[plan] ?? 1;
  whatsappUsageLine.textContent = `${state_whatsappChannels.length} of ${limit === Infinity ? 'unlimited' : limit} channels`;

  whatsappGrid.innerHTML = '';
  if (state_whatsappChannels.length === 0) {
    whatsappEmptyState.classList.remove('hidden');
    whatsappGrid.classList.add('hidden');
    return;
  }
  whatsappEmptyState.classList.add('hidden');
  whatsappGrid.classList.remove('hidden');

  state_whatsappChannels.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    const isActive = ch.active !== false;
    card.innerHTML = `
      <div class="bot-card-head">
        <span class="pulse-dot ${isActive ? '' : 'paused'}"></span>
        <span class="bot-name">${escapeHtml(ch.name)}</span>
      </div>
      <p class="bot-username">${escapeHtml(ch.phone_number_id)}</p>
      <div class="bot-meta-row">
        <span class="bot-type-tag">WhatsApp</span>
        <button class="bot-delete" data-id="${ch.id}">Disconnect</button>
      </div>
    `;
    whatsappGrid.appendChild(card);
  });

  whatsappGrid.querySelectorAll('.bot-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteWhatsappChannel(btn.dataset.id));
  });
}

async function deleteWhatsappChannel(id) {
  if (!confirm('Disconnect this WhatsApp channel?')) return;
  try {
    await apiFetch(`/api/whatsapp/${id}`, { method: 'DELETE' });
    await refreshWhatsappChannels();
  } catch (err) {
    alert(err.message);
  }
}

function openWhatsappModal() {
  whatsappFormError.textContent = '';
  whatsappForm.reset();
  whatsappWebhookUrl.textContent = `${window.location.origin}/webhook/whatsapp`;
  whatsappModal.classList.remove('hidden');
}
newWhatsappBtn.addEventListener('click', openWhatsappModal);
emptyNewWhatsappBtn.addEventListener('click', openWhatsappModal);
closeWhatsappModalBtn.addEventListener('click', () => whatsappModal.classList.add('hidden'));
whatsappModal.addEventListener('click', (e) => { if (e.target === whatsappModal) whatsappModal.classList.add('hidden'); });

whatsappForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  whatsappFormError.textContent = '';
  whatsappSubmitBtn.disabled = true;
  whatsappSubmitBtn.textContent = 'Connecting…';

  const body = {
    name: document.getElementById('whatsappName').value.trim(),
    phoneNumberId: document.getElementById('whatsappPhoneNumberId').value.trim(),
    accessToken: document.getElementById('whatsappAccessToken').value.trim(),
    config: {
      welcomeMessage: document.getElementById('whatsappWelcome').value.trim() || undefined,
      fallback: document.getElementById('whatsappFallback').value.trim() || undefined,
      faqs: [],
    },
  };

  try {
    await apiFetch('/api/whatsapp', { method: 'POST', body: JSON.stringify(body) });
    whatsappModal.classList.add('hidden');
    await refreshWhatsappChannels();
  } catch (err) {
    whatsappFormError.textContent = err.message;
  } finally {
    whatsappSubmitBtn.disabled = false;
    whatsappSubmitBtn.textContent = 'Connect channel';
  }
});

// ---- Marketplace ----
async function refreshMarketplace() {
  await Promise.all([loadMarketplaceListings(), loadMyPurchases()]);
}

async function loadMarketplaceListings() {
  marketplaceGrid.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch('/api/marketplace/listings');
    if (result.listings.length === 0) {
      marketplaceGrid.innerHTML = '<p class="field-hint">No templates listed yet -- be the first.</p>';
      return;
    }
    marketplaceGrid.innerHTML = '';
    result.listings.forEach(l => {
      const card = document.createElement('div');
      card.className = 'bot-card';
      const priceLabel = Number(l.price_usd) > 0 ? `$${Number(l.price_usd).toFixed(2)}` : 'Free';
      card.innerHTML = `
        <div class="bot-card-head">
          <span class="pulse-dot"></span>
          <span class="bot-name">${escapeHtml(l.title)}</span>
        </div>
        <p class="bot-username">${escapeHtml(l.description || '')}</p>
        <div class="bot-meta-row">
          <span class="bot-type-tag">${escapeHtml(l.category)} · ${escapeHtml(priceLabel)}</span>
          <button class="bot-delete" data-id="${l.id}" style="color:var(--text);">Get</button>
        </div>
      `;
      marketplaceGrid.appendChild(card);
    });
    marketplaceGrid.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => purchaseListing(btn.dataset.id));
    });
  } catch (err) {
    marketplaceGrid.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function purchaseListing(listingId) {
  try {
    const result = await apiFetch(`/api/marketplace/listings/${listingId}/purchase`, { method: 'POST' });
    if (result.unlocked) {
      alert('Unlocked! Find it under "My purchases" below.');
      await loadMyPurchases();
    } else if (result.invoiceUrl) {
      window.open(result.invoiceUrl, '_blank');
    }
  } catch (err) {
    alert(err.message);
  }
}

async function loadMyPurchases() {
  myPurchasesList.innerHTML = '<p class="field-hint">Loading…</p>';
  try {
    const result = await apiFetch('/api/marketplace/my-purchases');
    if (result.purchases.length === 0) {
      myPurchasesList.innerHTML = '<p class="field-hint">Nothing purchased yet.</p>';
      return;
    }
    myPurchasesList.innerHTML = '';
    result.purchases.forEach(p => {
      const row = document.createElement('div');
      row.className = 'product-row';
      row.innerHTML = `
        <div>
          <div class="product-row-name">${escapeHtml(p.title)}</div>
          <div class="product-row-price">${escapeHtml(p.category)}${p.template_type ? ` · ${escapeHtml(p.template_type)}` : ''}</div>
        </div>
        <button class="product-row-delete" style="color:var(--text);" data-id="${p.listing_id}" data-title="${escapeHtml(p.title)}">View config</button>
      `;
      row.querySelector('button').addEventListener('click', () => viewConfig(p.listing_id, p.title));
      myPurchasesList.appendChild(row);
    });
  } catch (err) {
    myPurchasesList.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function viewConfig(listingId, title) {
  try {
    const result = await apiFetch(`/api/marketplace/listings/${listingId}/config`);
    configViewTitle.textContent = title;
    configViewContent.textContent = JSON.stringify(result.config, null, 2);
    configViewModal.classList.remove('hidden');
  } catch (err) {
    alert(err.message);
  }
}
closeConfigViewModalBtn.addEventListener('click', () => configViewModal.classList.add('hidden'));
configViewModal.addEventListener('click', (e) => { if (e.target === configViewModal) configViewModal.classList.add('hidden'); });

function openListingModal() {
  listingFormError.textContent = '';
  listingForm.reset();
  listingNowpaymentsField.classList.add('hidden');
  listingModal.classList.remove('hidden');
}
newListingBtn.addEventListener('click', openListingModal);
closeListingModalBtn.addEventListener('click', () => listingModal.classList.add('hidden'));
listingModal.addEventListener('click', (e) => { if (e.target === listingModal) listingModal.classList.add('hidden'); });

listingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  listingFormError.textContent = '';
  listingSubmitBtn.disabled = true;
  listingSubmitBtn.textContent = 'Listing…';

  const configText = document.getElementById('listingConfig').value.trim();
  let config;
  try {
    config = JSON.parse(configText);
  } catch (err) {
    listingFormError.textContent = 'Config must be valid JSON.';
    listingSubmitBtn.disabled = false;
    listingSubmitBtn.textContent = 'List template';
    return;
  }

  const body = {
    title: document.getElementById('listingTitle').value.trim(),
    description: document.getElementById('listingDescription').value.trim(),
    category: document.getElementById('listingCategory').value,
    templateType: document.getElementById('listingTemplateType').value.trim() || undefined,
    config,
    priceUsd: Number(listingPrice.value) || 0,
    nowpaymentsApiKey: document.getElementById('listingNowpaymentsKey').value.trim() || undefined,
  };

  try {
    await apiFetch('/api/marketplace/listings', { method: 'POST', body: JSON.stringify(body) });
    listingModal.classList.add('hidden');
    await loadMarketplaceListings();
  } catch (err) {
    listingFormError.textContent = err.message;
  } finally {
    listingSubmitBtn.disabled = false;
    listingSubmitBtn.textContent = 'List template';
  }
});

// ---- Billing ----
async function refreshBillingStatus() {
  try {
    const { plan, planExpiresAt } = await apiFetch('/api/billing/status');
    if (plan === 'free') {
      billingStatusLine.textContent = 'Free plan';
    } else {
      const expiry = planExpiresAt ? new Date(planExpiresAt).toLocaleDateString() : '';
      billingStatusLine.textContent = `${plan[0].toUpperCase() + plan.slice(1)} plan${expiry ? ` · renews/expires ${expiry}` : ''}`;
    }
  } catch (err) {
    billingStatusLine.textContent = '';
  }
}

async function openUpgradeModal() {
  upgradeFormError.textContent = '';
  upgradeForm.reset();
  upgradeModal.classList.remove('hidden');

  try {
    const result = await apiFetch('/api/billing/plans');
    billingPricing = result.pricing;
    billingProviders = result.availableProviders;

    upgradeProvider.innerHTML = '';
    if (billingProviders.mpesa) upgradeProvider.innerHTML += '<option value="mpesa">M-Pesa</option>';
    if (billingProviders.paypal) upgradeProvider.innerHTML += '<option value="paypal">PayPal</option>';
    if (billingProviders.crypto) upgradeProvider.innerHTML += '<option value="crypto">Crypto</option>';
    if (!upgradeProvider.innerHTML) {
      upgradeFormError.textContent = 'No payment methods are set up yet -- add platform billing credentials first.';
    }
    updatePriceHint();
    toggleMpesaField();
  } catch (err) {
    upgradeFormError.textContent = err.message;
  }
}
closeUpgradeModalBtn.addEventListener('click', () => upgradeModal.classList.add('hidden'));
upgradeModal.addEventListener('click', (e) => { if (e.target === upgradeModal) upgradeModal.classList.add('hidden'); });
upgradeBtn.addEventListener('click', openUpgradeModal);

function updatePriceHint() {
  const plan = upgradePlan.value;
  const price = billingPricing[plan];
  upgradePriceHint.textContent = price ? `KES ${price.kes} or USD $${price.usd} / month` : '';
}
function toggleMpesaField() {
  upgradeMpesaField.classList.toggle('hidden', upgradeProvider.value !== 'mpesa');
}
upgradePlan.addEventListener('change', updatePriceHint);
upgradeProvider.addEventListener('change', toggleMpesaField);

upgradeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  upgradeFormError.textContent = '';
  upgradeSubmitBtn.disabled = true;
  upgradeSubmitBtn.textContent = 'Processing…';

  const body = {
    plan: upgradePlan.value,
    provider: upgradeProvider.value,
    phone: document.getElementById('upgradePhone').value.trim() || undefined,
  };

  try {
    const result = await apiFetch('/api/billing/upgrade', { method: 'POST', body: JSON.stringify(body) });
    if (result.approveLink || result.invoiceUrl) {
      window.open(result.approveLink || result.invoiceUrl, '_blank');
      upgradeModal.classList.add('hidden');
    } else if (result.message) {
      upgradeFormError.style.color = 'var(--secondary)';
      upgradeFormError.textContent = result.message;
    }
  } catch (err) {
    upgradeFormError.style.color = 'var(--danger)';
    upgradeFormError.textContent = err.message;
  } finally {
    upgradeSubmitBtn.disabled = false;
    upgradeSubmitBtn.textContent = 'Continue';
  }
});

// ---- Boot ----
(async function boot() {
  updateAuthCopy();
  if (state.token) {
    try {
      await enterDashboard();
    } catch {
      signOutBtn.click();
    }
  }
})();
