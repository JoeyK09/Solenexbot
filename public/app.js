const API = ''; // same origin -- server serves both API and this dashboard

const state = {
  token: localStorage.getItem('solenex_token') || null,
  user: null,
  bots: [],
  sites: [],
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
const formError = document.getElementById('formError');
const botSubmitBtn = document.getElementById('botSubmitBtn');

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
const linkRows = document.getElementById('linkRows');
const addLinkRowBtn = document.getElementById('addLinkRowBtn');
const siteFormError = document.getElementById('siteFormError');
const siteSubmitBtn = document.getElementById('siteSubmitBtn');

const PLAN_SITE_LIMITS = { free: 1, starter: 3, pro: 10, business: Infinity };

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
        <span class="bot-type-tag">${bot.template_type === 'subscription' ? 'Subscription' : 'FAQ'}</span>
        <button class="bot-delete" data-id="${bot.id}">Disconnect</button>
      </div>
    `;
    botGrid.appendChild(card);
  });

  botGrid.querySelectorAll('.bot-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteBot(btn.dataset.id));
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
  const isSub = botTemplate.value === 'subscription';
  faqFields.classList.toggle('hidden', isSub);
  subFields.classList.toggle('hidden', !isSub);
}

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
  } else {
    config = {
      productTitle: document.getElementById('subProductTitle').value.trim() || undefined,
      priceStars: Number(document.getElementById('subPrice').value) || 50,
      durationDays: Number(document.getElementById('subDuration').value) || 30,
      privateChannelId: document.getElementById('subChannelId').value.trim() || undefined,
    };
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
        <a class="bot-type-tag" href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">View page</a>
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

addLinkRowBtn.addEventListener('click', () => {
  linkRows.appendChild(makeLinkRow());
});

siteSlugInput.addEventListener('input', () => {
  const slug = siteSlugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'your-page';
  slugPreview.textContent = `${window.location.host}/s/${slug}`;
});

function openSiteModal() {
  siteFormError.textContent = '';
  siteForm.reset();
  linkRows.innerHTML = '';
  linkRows.appendChild(makeLinkRow());
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
  const title = document.getElementById('siteTitle').value.trim();
  const bio = document.getElementById('siteBio').value.trim();
  const links = Array.from(linkRows.querySelectorAll('.link-row'))
    .map(row => ({
      label: row.querySelector('.link-label').value.trim(),
      url: row.querySelector('.link-url').value.trim(),
    }))
    .filter(l => l.label && l.url);

  try {
    await apiFetch('/api/sites', {
      method: 'POST',
      body: JSON.stringify({ slug, siteType: 'linkbio', config: { title, bio, links } }),
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
