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

module.exports = {
  getDateRange,
  formatDateIndian,
};
