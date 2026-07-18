
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import Dropdown from './Dropdown';

type Props = {
  onPeriodChange: (period: string) => void;
  onDateChange: (period: string, value: string) => void;
  lang?: 'it' | 'en';
  period?: string;
};

const LABELS: Record<string, { it: string; en: string }> = {
  day: { it: 'Giorno', en: 'Day' },
  week: { it: 'Settimana', en: 'Week' },
  month: { it: 'Mese', en: 'Month' },
  year: { it: 'Anno', en: 'Year' },
};

export default function Filters({ onPeriodChange, onDateChange, lang = 'it', period }: Props) {
  const filters = ['day', 'week', 'month', 'year'];
  const [selected, setSelected] = useState<string>(period || 'day');

  // Datepicker refs
  const dayPickerRef = useRef<HTMLInputElement>(null);
  const weekStartPickerRef = useRef<HTMLInputElement>(null);
  const weekEndPickerRef = useRef<HTMLInputElement>(null);

  // Sync selected with period prop from parent
  useEffect(() => {
    if (period) {
      setSelected(period);
    }
  }, [period]);

  // defaults
  const today = dayjs();
  const previousMonth = today.subtract(1, 'month');
  const defaultDay = previousMonth.format('YYYY-MM-DD');
  const weekStart = previousMonth.startOf('week').format('YYYY-MM-DD');
  const weekEnd = previousMonth.endOf('week').format('YYYY-MM-DD');
  const defaultMonth = previousMonth.format('YYYY-MM');
  const defaultYear = today.format('YYYY');

  // local states for inputs
  const [dayValue, setDayValue] = useState(defaultDay);
  const [weekStartValue, setWeekStartValue] = useState(weekStart);
  const [weekEndValue, setWeekEndValue] = useState(weekEnd);
  const [monthValue, setMonthValue] = useState(defaultMonth);
  const [yearValue, setYearValue] = useState(defaultYear);

  const handleSelect = (p: string) => {
    setSelected(p);
    onPeriodChange(p);
  };

  // helper: build year options
  const currentYear = today.year();
  const years = Array.from({ length: 8 }).map((_, i) => String(currentYear - 4 + i));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Period Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => handleSelect(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selected === f
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {LABELS[f][lang]}
          </button>
        ))}
      </div>

      {/* Date Input Section - Horizontal Layout */}
      <div className="flex gap-6 items-end flex-wrap">
        {/* Day Picker */}
        {selected === 'day' && (
          <div className="flex-1 min-w-max">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {lang === 'it' ? 'Seleziona giorno' : 'Select day'}
            </label>
            <div className="relative max-w-sm">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2 2v12h8V4H6z" />
                </svg>
              </div>
              <input
                ref={dayPickerRef}
                type="date"
                value={dayValue}
                onChange={(e) => {
                  setDayValue(e.target.value);
                  onDateChange('day', e.target.value);
                }}
                className="w-full px-4 py-2 ps-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:border-blue-500 focus:outline-none transition cursor-pointer appearance-none"
              />
            </div>
          </div>
        )}

        {/* Week Range Picker */}
        {selected === 'week' && (
          <div className="flex gap-4 flex-1 min-w-max">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'it' ? 'Dal' : 'From'}
              </label>
              <div className="relative max-w-sm">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2 2v12h8V4H6z" />
                  </svg>
                </div>
                <input
                  ref={weekStartPickerRef}
                  type="date"
                  value={weekStartValue}
                  onChange={(e) => {
                    setWeekStartValue(e.target.value);
                    onDateChange('week', `${e.target.value}_${weekEndValue}`);
                  }}
                  className="w-full px-4 py-2 ps-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:border-blue-500 focus:outline-none transition cursor-pointer appearance-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'it' ? 'Al' : 'To'}
              </label>
              <div className="relative max-w-sm">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2 2v12h8V4H6z" />
                  </svg>
                </div>
                <input
                  ref={weekEndPickerRef}
                  type="date"
                  value={weekEndValue}
                  onChange={(e) => {
                    setWeekEndValue(e.target.value);
                    onDateChange('week', `${weekStartValue}_${e.target.value}`);
                  }}
                  className="w-full px-4 py-2 ps-10 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:border-blue-500 focus:outline-none transition cursor-pointer appearance-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Month Dropdown */}
        {selected === 'month' && (
          <div className="flex-1 min-w-max">
            <Dropdown
              label={lang === 'it' ? 'Seleziona mese' : 'Select month'}
              value={monthValue}
              onChange={(val) => {
                setMonthValue(val);
                onDateChange('month', val);
              }}
              options={Array.from({ length: 12 }).map((_, i) => {
                const m = String(i + 1).padStart(2, '0');
                const val = `${currentYear}-${m}`;
                return {
                  value: val,
                  label: lang === 'it' ? `${m}/${currentYear}` : `${m}/${currentYear}`
                };
              })}
              placeholder={lang === 'it' ? 'Scegli mese' : 'Choose month'}
            />
          </div>
        )}

        {/* Year Dropdown */}
        {selected === 'year' && (
          <div className="flex-1 min-w-max">
            <Dropdown
              label={lang === 'it' ? 'Seleziona anno' : 'Select year'}
              value={yearValue}
              onChange={(val) => {
                setYearValue(val);
                onDateChange('year', val);
              }}
              options={years.map((y) => ({
                value: y,
                label: y
              }))}
              placeholder={lang === 'it' ? 'Scegli anno' : 'Choose year'}
            />
          </div>
        )}
      </div>
    </div>
  );
}