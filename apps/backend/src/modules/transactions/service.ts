import dayjs from 'dayjs';

const parseNumberValue = (value: any) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const stringValue = String(value).trim().replace(/\s/g, '').replace(/[€]/g, '');
  if (!stringValue) {
    return 0;
  }

  const hasComma = stringValue.includes(',');
  const hasDot = stringValue.includes('.');

  let normalized = stringValue;
  if (hasComma && hasDot) {
    normalized = stringValue.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = stringValue.replace(',', '.');
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const filterByPeriod = (data: any[], filter: string, referenceDate?: dayjs.Dayjs, endDate?: dayjs.Dayjs) => {
  const now = referenceDate || dayjs();

  return data.filter((item) => {
    const raw = item.Date ?? item.data ?? item.Data ?? item.date;
    const date = dayjs(raw);

    switch (filter) {
      case 'day':
        return date.isSame(now, 'day');
      case 'week':
        // If endDate is provided, filter by range
        if (endDate) {
          return (date.isAfter(now, 'day') || date.isSame(now, 'day')) && 
                 (date.isBefore(endDate, 'day') || date.isSame(endDate, 'day'));
        }
        return date.isSame(now, 'week');
      case 'month':
        return date.isSame(now, 'month');
      case 'year':
        return date.isSame(now, 'year');
      default:
        return true;
    }
  });
};

export const aggregateByCategory = (data: any[]) => {
  const result: Record<string, number> = {};

  data.forEach((item) => {
    const cat = item.categoria ?? item.Category ?? item.category ?? 'Altro';
    // Check uscita/entrata first, ignoring 0 values; fallback to other fields
    const raw =
      (item.uscita && Number(item.uscita) !== 0 ? item.uscita : null) ??
      (item.entrata && Number(item.entrata) !== 0 ? item.entrata : null) ??
      item.Amount ?? item.amount ?? item.value ?? 0;
    const amount = Math.abs(parseNumberValue(raw));

    result[cat] = (result[cat] || 0) + amount;
  });

  return Object.entries(result).map(([label, value]) => ({ label, value }));
};