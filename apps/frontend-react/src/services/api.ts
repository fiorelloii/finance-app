import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000',
});

export const uploadFile = (formData: FormData) => {
  return API.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getData = (period: string, value?: string) => {
  let url = `/data?period=${period}`;
  
  if (!value) {
    return API.get(url);
  }

  // Parse the value based on period type
  switch (period) {
    case 'day':
      // value is YYYY-MM-DD
      url += `&date=${value}`;
      break;
    case 'week':
      // value is "YYYY-MM-DD_YYYY-MM-DD"
      const [startDate, endDate] = value.split('_');
      url += `&start_date=${startDate}&end_date=${endDate}`;
      break;
    case 'month':
      // value is YYYY-MM, convert to first day of month
      url += `&date=${value}-01`;
      break;
    case 'year':
      // value is YYYY, convert to first day of year
      url += `&date=${value}-01-01`;
      break;
  }
  
  return API.get(url);
};