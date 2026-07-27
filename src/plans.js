// Central place to tweak plan limits without hunting through route files.
const PLAN_LIMITS = {
  free: { maxBots: 1, maxSites: 1, maxStores: 1, maxBookingPages: 1, maxWhatsappChannels: 1, customBranding: false, analytics: false },
  starter: { maxBots: 5, maxSites: 3, maxStores: 3, maxBookingPages: 3, maxWhatsappChannels: 3, customBranding: true, analytics: true },
  pro: { maxBots: 20, maxSites: 10, maxStores: 10, maxBookingPages: 10, maxWhatsappChannels: 10, customBranding: true, analytics: true, aiFeatures: true },
  business: { maxBots: Infinity, maxSites: Infinity, maxStores: Infinity, maxBookingPages: Infinity, maxWhatsappChannels: Infinity, customBranding: true, analytics: true, aiFeatures: true, teamAccess: true, api: true },
};

function limitsFor(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// Monthly prices for upgrading FROM free. Free has no price (nothing to
// buy). Adjust these to match your actual pricing -- the USD figures
// here are rough conversions from your KES pricing, worth double-
// checking before going live.
const PLAN_PRICING = {
  starter: { kes: 299, usd: 3 },
  pro: { kes: 999, usd: 8 },
  business: { kes: 2999, usd: 25 },
};

module.exports = { PLAN_LIMITS, limitsFor, PLAN_PRICING };
