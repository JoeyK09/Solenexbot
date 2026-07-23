// Central place to tweak plan limits without hunting through route files.
const PLAN_LIMITS = {
  free: { maxBots: 1, maxSites: 1, customBranding: false, analytics: false },
  starter: { maxBots: 5, maxSites: 3, customBranding: true, analytics: true },
  pro: { maxBots: 20, maxSites: 10, customBranding: true, analytics: true, aiFeatures: true },
  business: { maxBots: Infinity, maxSites: Infinity, customBranding: true, analytics: true, aiFeatures: true, teamAccess: true, api: true },
};

function limitsFor(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

module.exports = { PLAN_LIMITS, limitsFor };
