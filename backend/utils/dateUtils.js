/**
 * Date filtering and formatting utilities (Indian convention DD/MM/YYYY)
 */

const getDateRange = (rangeType, customStart, customEnd) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now);

  switch (rangeType) {
    case '7d':
    case 'last_7_days':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
    case 'last_30_days':
      startDate.setDate(now.getDate() - 30);
      break;
    case '3m':
    case 'last_3_months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6m':
    case 'last_6_months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'year':
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (customStart) startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    default:
      // Default to last 30 days
      startDate.setDate(now.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
};

const formatDateIndian = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/**
 * Robustly parses various date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, month names)
 * and guarantees a valid Date object, never returning an Invalid Date.
 */
const parseSafeDate = (rawDate, fallbackDate = new Date()) => {
  if (!rawDate) return fallbackDate;
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) return rawDate;

  const str = String(rawDate).trim();
  // 1. Try standard parser (works for ISO YYYY-MM-DD or standard strings)
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // 2. Try DD-MM-YYYY or DD/MM/YYYY (common Indian convention)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Try DD-MMM-YYYY or DD MMM YYYY (e.g. 23-Nov-2026 or 23 Nov 2026)
  const dMmmYMatch = str.match(/^(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/-]+(\d{2,4})$/);
  if (dMmmYMatch) {
    const day = parseInt(dMmmYMatch[1], 10);
    const mStr = dMmmYMatch[2].slice(0, 3).toLowerCase();
    let year = parseInt(dMmmYMatch[3], 10);
    if (year < 100) year += 2000;
    if (months[mStr] !== undefined) {
      d = new Date(year, months[mStr], day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return fallbackDate;
};

module.exports = {
  getDateRange,
  formatDateIndian,
  parseSafeDate,
};
