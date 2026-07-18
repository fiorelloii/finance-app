export const parseNumericValue = (value: number | string | null | undefined) => {
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
    const lastComma = stringValue.lastIndexOf(',');
    const lastDot = stringValue.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = stringValue.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = stringValue.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = stringValue.replace(',', '.');
  } else if (hasDot) {
    const parts = stringValue.split('.');
    if (parts.length > 2) {
      normalized = stringValue.replace(/\./g, '');
    } else {
      normalized = stringValue;
    }
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const formatNumber = (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) => {
  const numericValue = parseNumericValue(value);

  return numericValue.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
};

export const formatCurrency = (value: number | string | null | undefined) =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
