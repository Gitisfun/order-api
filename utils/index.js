/**
 * Formats a positive integer into an order number string
 * Format: ORD-YYMM-NNNNNN
 * - ORD: constant prefix
 * - YYMM: current year (2 digits) and month (2 digits)
 * - NNNNNN: input number left-padded with zeros to 6 digits
 * 
 * @param {number} number - The positive integer to format
 * @returns {string} Formatted order number (e.g., "ORD-2412-000123")
 * @throws {Error} If input is not a positive integer
 */
export function formatOrderNumber(number) {
  // Validate input
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('Input must be a positive integer');
  }

  // Get current year and month (2 digits each)
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month (1-12), padded to 2 digits

  // Format the number with leading zeros to 6 digits
  const paddedNumber = number.toString().padStart(6, '0');

  // Return formatted string
  return `ORD-${year}${month}-${paddedNumber}`;
}

export default {
  formatOrderNumber
};

