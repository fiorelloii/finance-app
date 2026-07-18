import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';
import { parseNumericValue } from '../utils/format';

interface Props {
  data: { label: string; value: number }[];
}

function getBrandColor(variableName: string, fallback: string) {
  try {
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue(variableName).trim() || fallback;
  } catch (e) {
    return fallback;
  }
}

export default function PieChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);

  const numericData = data.map((d) => ({ ...d, value: parseNumericValue(d.value) }));
  const series = numericData.map((d) => d.value);
  const labels = numericData.map((d) => d.label);
  // total removed — center total will not be rendered here

  const brandColor = getBrandColor('--color-fg-brand', '#1447E6');
  const brandSecondary = getBrandColor('--color-fg-brand-subtle', '#60a5fa');
  const brandTertiary = getBrandColor('--color-fg-brand-strong', '#34d399');

  const getChartOptions = () => ({
    series,
    colors: [brandColor, brandSecondary, brandTertiary, '#fbbf24', '#f87171', '#a78bfa'],
    chart: {
      type: 'donut',
      height: 350,
      toolbar: { show: false }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '80%',
          labels: {
            show: true,
            name: { show: true, fontFamily: 'Inter, sans-serif', offsetY: 20 },
            value: { show: true, fontFamily: 'Inter, sans-serif', offsetY: -20, formatter: (val: number) => `${val}k` },
            total: {
              showAlways: true,
              show: true,
              label: 'Total',
              fontFamily: 'Inter, sans-serif',
              formatter: function (w: any) {
                const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return '€' + sum.toFixed(2);
              }
            }
          }
        }
      }
    },
    labels,
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontFamily: 'Inter, sans-serif' }
  });

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      // update existing chart
      chartRef.current.updateOptions({ ...getChartOptions() });
      chartRef.current.updateSeries(series);
      return;
    }

    chartRef.current = new ApexCharts(containerRef.current, getChartOptions() as any);
    chartRef.current.render();

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="relative py-6">
      <div ref={containerRef} />
      {/* center total removed per request */}
    </div>
  );
}