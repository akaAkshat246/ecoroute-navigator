// Vehicle emission factors in kg/km
export const VEHICLE_FACTORS = {
  'petrol_car': 0.12,
  'diesel_car': 0.14,
  'bike': 0.08,
  'ev': 0.03
};

/**
 * Calculates CO2 emissions for a given distance and vehicle type.
 * @param {number} distanceKm - Route distance in kilometers.
 * @param {string} vehicleType - Type of vehicle ('petrol_car', 'diesel_car', 'bike', 'ev').
 * @returns {number} - CO2 emissions in kg, rounded to 2 decimal places.
 */
export function calculateCO2(distanceKm, vehicleType) {
  const normalizedVehicle = (vehicleType || '').toLowerCase().replace(' ', '_');
  const factor = VEHICLE_FACTORS[normalizedVehicle] || VEHICLE_FACTORS['petrol_car'];
  const co2 = distanceKm * factor;
  return parseFloat(co2.toFixed(2));
}

/**
 * Calculates the number of equivalent trees offset (1 tree absorbs ~20kg CO2/year).
 * @param {number} co2SavedKg - CO2 saved in kg.
 * @returns {number} - Equivalent tree offset, rounded to 3 decimal places.
 */
export function calculateTreeOffset(co2SavedKg) {
  if (co2SavedKg <= 0) return 0;
  // A mature tree absorbs about 22 kg of CO2 per year, let's use 20 kg for simplicity.
  const trees = co2SavedKg / 20;
  return parseFloat(trees.toFixed(3));
}

/**
 * Calculates gamified green points based on carbon savings and route efficiency.
 * @param {number} co2Emitted - CO2 emitted in kg.
 * @param {number} maxCO2 - Max CO2 among compared routes.
 * @param {string} vehicleType - Vehicle type.
 * @returns {number} - Green points earned.
 */
export function calculateGreenPoints(co2Emitted, maxCO2, vehicleType) {
  // Base points for traveling sustainably
  let basePoints = 10;
  if (vehicleType === 'ev') basePoints += 30; // Bonus for using an EV
  if (vehicleType === 'bike') basePoints += 20; // Bonus for riding a bike

  // Savings bonus: compare this route's emissions to the highest emitting route
  const co2Saved = Math.max(0, maxCO2 - co2Emitted);
  const savingsBonus = Math.round(co2Saved * 50); // 50 points per kg CO2 saved

  return basePoints + savingsBonus;
}
