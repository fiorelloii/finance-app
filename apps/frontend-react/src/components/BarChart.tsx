import Chart from 'react-apexcharts';
import dayjs from 'dayjs';
import { formatNumber, parseNumericValue } from '../utils/format';

interface Props {
  transactions: any[];
  period: 'year' | 'month' | 'week' | 'day';
  lang: 'it' | 'en';
}

export default function BarChart({ transactions, period, lang }: Props) {
  // Group transactions by month (year) or day (month/week/day)
  const groupedData: Record<string, { entrate: number; spese: number }> = {};
  
  const dateFormat = period === 'year' ? 'MMM YYYY' : 'DD MMM';
  const groupByFormat = period === 'year' ? 'YYYY-MM' : 'YYYY-MM-DD';

  transactions.forEach(tx => {
    const key = dayjs(tx.data).format(groupByFormat);
    if (!groupedData[key]) {
      groupedData[key] = { entrate: 0, spese: 0 };
    }
    const value = parseNumericValue(tx.type === 'entrata' ? tx.entrata : tx.uscita);
    if (tx.type === 'entrata') {
      groupedData[key].entrate += value;
    } else {
      groupedData[key].spese += value;
    }
  });

  // Sort keys chronologically
  const sortedKeys = Object.keys(groupedData).sort((a, b) => {
    return dayjs(a).isBefore(dayjs(b)) ? -1 : 1;
  });

  // Prepare chart data
  const categories = sortedKeys.map(key => dayjs(key).format(dateFormat));
  const entrateData = sortedKeys.map(key => parseFloat(groupedData[key].entrate.toFixed(2)));
  const speseData = sortedKeys.map(key => parseFloat(groupedData[key].spese.toFixed(2)));

  const options = {
    chart: {
      type: 'bar' as const,
      toolbar: {
        show: false
      },
      stacked: false
    },
    colors: ['#10b981', '#ef4444'],
    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'inherit'
        }
      }
    },
    yaxis: {
      title: {
        text: lang === 'it' ? 'Importo (€)' : 'Amount (€)',
        style: {
          fontSize: '12px',
          fontFamily: 'inherit'
        }
      },
      labels: {
        formatter: (value: number) => `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    },
    legend: {
      position: 'top' as const,
      fontSize: '14',
      fontFamily: 'inherit'
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
        dataLabels: {
          position: 'top' as const
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      y: {
        formatter: (value: number) => `€ ${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: '100%'
          },
          legend: {
            position: 'bottom' as const
          }
        }
      }
    ]
  };

  const series = [
    {
      name: lang === 'it' ? 'Entrate' : 'Income',
      data: entrateData
    },
    {
      name: lang === 'it' ? 'Spese' : 'Expenses',
      data: speseData
    }
  ];

  return (
    <div className="w-full" id="bar-chart">
      <Chart options={options} series={series} type="bar" height={350} />
    </div>
  );
}
