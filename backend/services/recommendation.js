/**
 * Calculates the Eco Score for a route.
 * Formula: score = 100 - (CO2 * 5) - (toll / 10), clamped to 0-100.
 * 
 * @param {number} co2 - CO2 emissions in kg.
 * @param {number} toll - Toll charges in ₹.
 * @returns {number} - Clamped Eco Score (0-100).
 */
export function calculateEcoScore(co2, toll) {
  const score = 100 - (co2 * 5) - (toll / 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculates the Balanced Score for a route.
 * Formula: Balanced Score = 70% Eco Score Component + 30% Toll Score Component.
 * 
 * @param {number} co2 - CO2 emissions in kg.
 * @param {number} toll - Toll charges in ₹.
 * @returns {number} - Balanced score (0-100).
 */
export function calculateBalancedScore(co2, toll) {
  const ecoComponent = 100 - (co2 * 5);
  const tollComponent = 100 - (toll / 10);
  const balanced = (0.70 * ecoComponent) + (0.30 * tollComponent);
  return Math.max(0, Math.min(100, Math.round(balanced)));
}

/**
 * Analyzes the routes and recommends the best one based on the optimization preference.
 * Supports: 'eco', 'toll', 'no_toll', 'balanced'
 * 
 * @param {Array} routes - List of routes with distance, time, toll, co2, and ecoScore.
 * @param {string} preference - Optimization preference ('eco', 'toll', 'no_toll', 'balanced').
 * @returns {Object} - The recommended route and comparison details.
 */
export function recommendRoute(routes, preference) {
  if (!routes || routes.length === 0) {
    return { recommendedRoute: null, reason: '', savings: { co2Saved: 0, moneySaved: 0 } };
  }

  const pref = (preference || 'balanced').toLowerCase();
  let recommendedRoute = routes[0];
  let reason = '';

  // 1. Selection logic
  if (pref === 'eco') {
    recommendedRoute = routes.reduce((best, current) => {
      return (current.co2 < best.co2) ? current : best;
    }, routes[0]);
    reason = 'Lowest carbon footprint route to minimize greenhouse gas emissions.';
  } else if (pref === 'toll') {
    recommendedRoute = routes.reduce((best, current) => {
      if (current.toll === best.toll) {
        return (current.time < best.time) ? current : best;
      }
      return (current.toll < best.toll) ? current : best;
    }, routes[0]);
    reason = 'Most budget-friendly route that avoids or minimizes toll expenses.';
  } else if (pref === 'no_toll') {
    // Filter routes with exactly 0 toll
    const zeroTollRoutes = routes.filter(r => r.toll === 0);
    if (zeroTollRoutes.length > 0) {
      // If multiple, select the one with the lowest CO2 emissions
      recommendedRoute = zeroTollRoutes.reduce((best, current) => {
        return (current.co2 < best.co2) ? current : best;
      }, zeroTollRoutes[0]);
      reason = 'Avoids highway toll charges completely to minimize trip expenditures.';
    } else {
      // Fallback: If all routes have tolls, choose the absolute lowest toll route
      recommendedRoute = routes.reduce((best, current) => {
        return (current.toll < best.toll) ? current : best;
      }, routes[0]);
      reason = 'No toll-free route was found. Recommending the path with the minimum available toll cost.';
    }
  } else {
    // Balanced: Highest Balanced Score wins.
    recommendedRoute = routes.reduce((best, current) => {
      const currentScore = calculateBalancedScore(current.co2, current.toll);
      const bestScore = calculateBalancedScore(best.co2, best.toll);
      if (currentScore === bestScore) {
        return (current.time < best.time) ? current : best;
      }
      return (currentScore > bestScore) ? current : best;
    }, routes[0]);
    reason = 'Optimal balance between lower carbon emissions and minimal toll costs.';
  }

  // 2. Calculate savings relative to the worst route in the alternative list
  let co2Saved = 0;
  let moneySaved = 0;

  if (routes.length > 1) {
    const maxCO2 = Math.max(...routes.map(r => r.co2));
    const maxToll = Math.max(...routes.map(r => r.toll));

    co2Saved = Math.max(0, maxCO2 - recommendedRoute.co2);
    moneySaved = Math.max(0, maxToll - recommendedRoute.toll);
  }

  return {
    recommendedRoute,
    reason,
    savings: {
      co2Saved: parseFloat(co2Saved.toFixed(1)),
      moneySaved
    }
  };
}
