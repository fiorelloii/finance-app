

import { useEffect, useState, useMemo, useCallback, type ChangeEvent } from "react";
import { getData, uploadFile } from "../services/api";
import Filters from "../components/Filters";
import PieChart from "../components/PieChart";
import BarChart from "../components/BarChart";
import dayjs from "dayjs";
import { formatCurrency, parseNumericValue } from "../utils/format";
import { signIn } from "../auth";

type View = "home" | "charts" | "categories" | "settings";

export default function Dashboard() {
  const [spese, setSpese] = useState<any[]>([]);
  const [entrate, setEntrate] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [speseCategoryFilter, setSpeseCategoryFilter] = useState('');
  const [speseDescriptionFilter, setSpeseDescriptionFilter] = useState('');
  const [entrateCategoryFilter, setEntrateCategoryFilter] = useState('');
  const [entrateDescriptionFilter, setEntrateDescriptionFilter] = useState('');
  const [period, setPeriod] = useState("year");
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY'));
  const [view, setView] = useState<View>("home");
  const [lang, setLang] = useState<'it' | 'en'>('it');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const storedTheme = localStorage.getItem('color-theme');
    return storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Apply dark mode and persist selection
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    }
  }, [darkMode]);

  // Handle period change - reset date to correct format
  const handlePeriodChange = (newPeriod: string) => {
    const today = dayjs();
    const previousMonth = today.subtract(1, 'month');
    let newDate: string;
    
    if (newPeriod === 'year') {
      newDate = today.format('YYYY');
    } else if (newPeriod === 'month') {
      newDate = previousMonth.format('YYYY-MM');
    } else if (newPeriod === 'week') {
      const weekStart = previousMonth.startOf('week').format('YYYY-MM-DD');
      const weekEnd = previousMonth.endOf('week').format('YYYY-MM-DD');
      newDate = `${weekStart}_${weekEnd}`;
    } else {
      newDate = previousMonth.format('YYYY-MM-DD');
    }
    
    setPeriod(newPeriod);
    setSelectedDate(newDate);
  };

  // Handle date change - just update the date
  const handleDateChange = (currentPeriod: string, newDate: string) => {
    setSelectedDate(newDate);
  };

  const loadData = async () => {
    try {
      const res = await getData(period, selectedDate);
      setSpese(res.data.spese || []);
      setEntrate(res.data.entrate || []);
      
      // Combine raw spese and entrate transactions
      const rawSpese = (res.data.raw?.spese || []).map((t: any) => ({ ...t, type: 'uscita' }));
      const rawEntrate = (res.data.raw?.entrate || []).map((t: any) => ({ ...t, type: 'entrata' }));
      const allTransactions = [...rawSpese, ...rawEntrate].sort((a, b) => {
        const dateA = dayjs(a.data);
        const dateB = dayjs(b.data);
        return dateB.isAfter(dateA) ? 1 : -1;
      });
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const response = await uploadFile(formData);
      setUploadMessage(`PDF caricato: ${response.data.filename ?? file.name}`);
    } catch (error: any) {
      setUploadMessage(error?.response?.data?.error ?? 'Errore durante il caricamento del file.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const normalizeFilter = (value: string) => value.trim().toLowerCase();
  const filteredSpeseTransactions = transactions
    .filter((t) => t.type === 'uscita')
    .filter((tx) => {
      const category = String(tx.categoria || '').toLowerCase();
      const description = String(tx.descrizione_operazione || '').toLowerCase();
      return (
        category.includes(normalizeFilter(speseCategoryFilter)) &&
        description.includes(normalizeFilter(speseDescriptionFilter))
      );
    });
  const filteredEntrateTransactions = transactions
    .filter((t) => t.type === 'entrata')
    .filter((tx) => {
      const category = String(tx.categoria || '').toLowerCase();
      const description = String(tx.descrizione_operazione || '').toLowerCase();
      return (
        category.includes(normalizeFilter(entrateCategoryFilter)) &&
        description.includes(normalizeFilter(entrateDescriptionFilter))
      );
    });

  useEffect(() => {
    loadData();
  }, [period, selectedDate]);

  const T: Record<'it' | 'en', Record<string, string>> = {
    it: {
      spese: 'Spese',
      entrate: 'Entrate',
      grafici: 'Grafici',
      graficiPlaceholder: 'Area grafici in costruzione — aggiungerai i grafici qui.',
      movimenti: 'Movimenti',
      impostazioni: 'Impostazioni',
      noSettings: 'Nessuna impostazione disponibile al momento.',
      noSpesa: 'Nessuna spesa',
      noEntrata: 'Nessuna entrata',
      oggi: 'Oggi',
      lingua: 'Lingua',
      scegli_lingua: 'Seleziona la lingua da visualizzare',
      dark_mode: 'Modalità Scura',
      abilita_dark_mode: 'Attiva o disattiva la modalità scura',
    },
    en: {
      spese: 'Expenses',
      entrate: 'Income',
      grafici: 'Charts',
      graficiPlaceholder: 'Charts area under construction — you will add charts here.',
      movimenti: 'Movements',
      impostazioni: 'Settings',
      noSettings: 'No settings available at the moment.',
      noSpesa: 'No expenses',
      noEntrata: 'No income',
      oggi: 'Today',
      lingua: 'Language',
      scegli_lingua: 'Select the display language',
      dark_mode: 'Dark Mode',
      abilita_dark_mode: 'Enable or disable dark mode',
    },
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    if (!d) return dateStr;
    return `${d}/${m}/${y}`;
  };

  const formatSelectionSummary = (period: string, value: string) => {
    if (!value) return '';
    if (period === 'day') return formatDate(value);
    if (period === 'week') {
      if (!value.includes('_')) return '';
      const [s, e] = value.split('_');
      return `${formatDate(s)} → ${formatDate(e)}`;
    }
    if (period === 'month') {
      const [y, m] = value.split('-');
      return `${m}/${y}`;
    }
    if (period === 'year') return value;
    return value;
  };

  const CategoryBadge = ({ category, type }: { category: string; type: 'expense' | 'income' }) => {
    const normalized = (category || '').toLowerCase();
    const baseClass = 'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0';
    const colorClass = type === 'expense' ? 'bg-red-500/90' : 'bg-green-500/90';

    const renderIcon = (svg: string) => (
      <div className={`${baseClass} ${colorClass}`}>
        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d={svg} />
        </svg>
      </div>
    );

    if (normalized.includes('stipend') || normalized.includes('salary')) {
      return (
        <div className={`${baseClass} ${colorClass}`}>
          <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 10h9.231M6 14h9.231M18 5.086A5.95 5.95 0 0 0 14.615 4c-3.738 0-6.769 3.582-6.769 8s3.031 8 6.769 8A5.94 5.94 0 0 0 18 18.916" />
          </svg>
        </div>
      );
    }

    if (normalized.includes('terzi') || normalized.includes('third') || normalized.includes('rimborso') || normalized.includes('refund')) {
      return (
        <div className={`${baseClass} ${colorClass}`}>
          <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 10h9.231M6 14h9.231M18 5.086A5.95 5.95 0 0 0 14.615 4c-3.738 0-6.769 3.582-6.769 8s3.031 8 6.769 8A5.94 5.94 0 0 0 18 18.916" />
          </svg>
        </div>
      );
    }

    if (normalized.includes('carta') || normalized.includes('credito') || normalized.includes('card')) {
      return renderIcon('M4 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4Zm0 6h16v6H4v-6Z');
    }

    if (normalized.includes('casa') || normalized.includes('home')) {
      return renderIcon('M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z');
    }

    if (normalized.includes('ristor') || normalized.includes('bar') || normalized.includes('restaurant')) {
      return renderIcon('m10.4149 10.7623.0005.0109m3.0868 3.0764.0005.0108M8.91554 15.349l.00046.0108m-.8276-8.44549L4.39857 19.9133l12.95163-3.7371m-.8271-8.43475c2.0971 2.09707 3.269 4.77055 3.5172 7.51635.067.7413-.4619 1.3752-1.1869 1.5293-1.0146.2158-1.9613-.5811-2.0926-1.615-.2412-1.9-.9437-3.5721-2.52-5.1484-1.5779-1.57793-3.3173-2.3457-5.25302-2.61955-1.02139-.1445-1.79555-1.1099-1.5387-2.10314.17236-.66653.76818-1.14208 1.45754-1.08543 2.78088.22851 5.49388 1.40332 7.61648 3.52587Z');
    }

    if (normalized.includes('assicur') || normalized.includes('insurance')) {
      return renderIcon('M12.356 3.066a1 1 0 0 0-.712 0l-7 2.666A1 1 0 0 0 4 6.68a17.695 17.695 0 0 0 2.022 7.98 17.405 17.405 0 0 0 5.403 6.158 1 1 0 0 0 1.15 0 17.406 17.406 0 0 0 5.402-6.157A17.694 17.694 0 0 0 20 6.68a1 1 0 0 0-.644-.949l-7-2.666Z');
    }

    if (normalized.includes('shopping') || normalized.includes('shop') || normalized.includes('spesa')) {
      return renderIcon('M14 7h-4v3a1 1 0 0 1-2 0V7H6a1 1 0 0 0-.997.923l-.917 11.924A2 2 0 0 0 6.08 22h11.84a2 2 0 0 0 1.994-2.153l-.917-11.924A1 1 0 0 0 18 7h-2v3a1 1 0 1 1-2 0V7Zm-2-3a2 2 0 0 0-2 2v1H8V6a4 4 0 0 1 8 0v1h-2V6a2 2 0 0 0-2-2Z');
    }

    if (normalized.includes('bonific') || normalized.includes('pay') || normalized.includes('p2p')) {
      return renderIcon('M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H7Zm8-1a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 0 1-1-1Z');
    }

    if (normalized.includes('varie') || normalized.includes('misc') || normalized.includes('altro')) {
      return renderIcon('M5.027 10.9a8.729 8.729 0 0 1 6.422-3.62v-1.2A2.061 2.061 0 0 1 12.61 4.2a1.986 1.986 0 0 1 2.104.23l5.491 4.308a2.11 2.11 0 0 1 .588 2.566 2.109 2.109 0 0 1-.588.734l-5.489 4.308a1.983 1.983 0 0 1-2.104.228 2.065 2.065 0 0 1-1.16-1.876v-.942c-5.33 1.284-6.212 5.251-6.25 5.441a1 1 0 0 1-.923.806h-.06a1.003 1.003 0 0 1-.955-.7A10.221 10.221 0 0 1 5.027 10.9Z');
    }

    if (normalized.includes('trasport') || normalized.includes('transport') || normalized.includes('taxi') || normalized.includes('trip')) {
      return renderIcon('m10.051 8.102-3.778.322-1.994 1.994a.94.94 0 0 0 .533 1.6l2.698.316m8.39 1.617-.322 3.78-1.994 1.994a.94.94 0 0 1-1.595-.533l-.4-2.652m8.166-11.174a1.366 1.366 0 0 0-1.12-1.12c-1.616-.279-4.906-.623-6.38.853-1.671 1.672-5.211 8.015-6.31 10.023a.932.932 0 0 0 .162 1.111l.828.835.833.832a.932.932 0 0 0 1.111.163c2.008-1.102 8.35-4.642 10.021-6.312 1.475-1.478 1.133-4.77.855-6.385Zm-2.961 3.722a1.88 1.88 0 1 1-3.76 0 1.88 1.88 0 0 1 3.76 0Z');
    }

    if (normalized.includes('tass') || normalized.includes('tax')) {
      return renderIcon('M8 17.345a4.76 4.76 0 0 0 2.558 1.618c2.274.589 4.512-.446 4.999-2.31.487-1.866-1.273-3.9-3.546-4.49-2.273-.59-4.034-2.623-3.547-4.488.486-1.865 2.724-2.899 4.998-2.31.982.236 1.87.793 2.538 1.592m-3.879 12.171V21m0-18v2.2');
    }

    return renderIcon('M3.75 6.75A.75.75 0 0 1 4.5 6h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z');
  };

  const menuItems = [
    { id: 'home' as View, label: lang === 'it' ? 'Home' : 'Home', icon: 'M10 6.025A7.5 7.5 0 1 0 17.975 14H10V6.025Z M13.5 3c-.169 0-.334.014-.5.025V11h7.975c.011-.166.025-.331.025-.5A7.5 7.5 0 0 0 13.5 3Z' },
    { id: 'charts' as View, label: lang === 'it' ? 'Grafici' : 'Charts', icon: 'M15 5v14M9 5v14M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z' },
    { id: 'categories' as View, label: lang === 'it' ? 'Movimenti' : 'Movements', icon: 'M4 13h3.439a.991.991 0 0 1 .908.6 3.978 3.978 0 0 0 7.306 0 .99.99 0 0 1 .908-.6H20M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6M4 13l2-9h12l2 9M9 7h6m-7 3' },
    { id: 'settings' as View, label: lang === 'it' ? 'Impostazioni' : 'Settings', icon: 'M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4' },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Mobile Menu Toggle Button */}
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        className="text-gray-900 dark:text-gray-100 bg-transparent box-border border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 font-medium leading-5 rounded-lg ms-3 mt-3 text-sm p-2 focus:outline-none inline-flex sm:hidden fixed top-0 left-0 z-50"
      >
        <span className="sr-only">Open sidebar</span>
        <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h10" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        id="default-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-full transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidebar"
      >
        <div className="relative h-full px-3 py-4 overflow-y-auto bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700">
          <div className="ps-2.5 mb-5">
            <span className="self-center text-lg text-gray-900 dark:text-white font-semibold whitespace-nowrap">
              Finance App
            </span>
          </div>
          <ul className="space-y-2 font-medium">
            {menuItems.slice(0, 3).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id)}
                  className={`flex items-center px-2 py-1.5 rounded-lg w-full text-left transition-colors ${
                    view === item.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                  <span className="ms-3">{item.label}</span>
                </button>
              </li>
            ))}
            <li className="my-2">
              <hr className="border-gray-200 dark:border-gray-700" />
            </li>
            {menuItems.slice(3).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setView(item.id)}
                  className={`flex items-center px-2 py-1.5 rounded-lg w-full text-left transition-colors ${
                    view === item.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                  <span className="ms-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('dashboard-upload-input')?.click()}
                className="text-white bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
              >
                <span className="text-lg leading-none">+</span>
              </button>

              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className="text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 box-border border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-base text-sm px-3 py-2.5 focus:outline-none"
                aria-label="Toggle dark mode"
              >
                <span className="sr-only">Toggle theme</span>
                {darkMode ? '🌙' : '☀️'}
              </button>

              <button
                type="button"
                onClick={() => signIn("github")}
                className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 font-medium rounded-base text-sm px-4 py-2.5 focus:outline-none"
              >
                Sign in with GitHub
              </button>
            </div>
            <input id="dashboard-upload-input" type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            {uploadMessage ? <p className="text-xs text-gray-500 dark:text-gray-400">{uploadMessage}</p> : null}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 sm:ml-64 p-6 overflow-y-auto bg-white dark:bg-gray-900">
        {view === "home" && (
          <div className="p-4 border border-gray-300 dark:border-gray-700 border-dashed rounded-lg bg-white dark:bg-gray-800">
            {/* Filter Bar - Top */}
              <Filters
                period={period}
                onPeriodChange={handlePeriodChange}
                onDateChange={handleDateChange}
                lang={lang}
              />

            {/* Summary - ENTRATE - SPESE */}
            <div className="mt-6 mb-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{lang === 'it' ? 'Totale' : 'Total'}</p>
              <h1 className="text-4xl font-bold tracking-tight text-heading md:text-5xl lg:text-6xl text-gray-900 dark:text-white">
                €{formatCurrency(entrate.reduce((sum, e) => sum + parseNumericValue(e.value), 0) - spese.reduce((sum, s) => sum + parseNumericValue(s.value), 0))}
              </h1>
            </div>

            {/* Charts + Categories Grid - responsive 1 column on small screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{T[lang].spese}</h2>
                <PieChart data={spese} />
                <div className="mt-6">
                  <ul className="space-y-2">
                    {spese.map((c: any) => (
                      <li key={c.label} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 p-3 rounded transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryBadge category={c.label} type="expense" />
                          <span className="text-gray-900 dark:text-white truncate">{c.label}</span>
                        </div>
                        <span className="text-red-600 dark:text-red-400 font-semibold whitespace-nowrap">€{formatCurrency(c.value)}</span>
                      </li>
                    ))}
                    {spese.length === 0 && <li className="text-gray-500 dark:text-gray-400 p-3">{T[lang].noSpesa}</li>}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{T[lang].entrate}</h2>
                <PieChart data={entrate} />
                <div className="mt-6">
                  <ul className="space-y-2">
                    {entrate.map((c: any) => (
                      <li key={c.label} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 p-3 rounded transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryBadge category={c.label} type="income" />
                          <span className="text-gray-900 dark:text-white truncate">{c.label}</span>
                        </div>
                        <span className="text-green-600 dark:text-green-400 font-semibold whitespace-nowrap">€{formatCurrency(c.value)}</span>
                      </li>
                    ))}
                    {entrate.length === 0 && <li className="text-gray-500 dark:text-gray-400 p-3">{T[lang].noEntrata}</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "charts" && (
          <div className="p-4 border border-gray-300 dark:border-gray-700 border-dashed rounded-lg bg-white dark:bg-gray-800">
            {/* Filter Bar - Top */}
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <Filters
                period={period}
                onPeriodChange={handlePeriodChange}
                onDateChange={handleDateChange}
                lang={lang}
              />
            </div>

            {/* Revenue Card */}
            <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 md:p-6">
              {/* Header with Profit and Rate */}
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                <dl>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">{lang === 'it' ? 'Profitto' : 'Profit'}</dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    €{formatCurrency(entrate.reduce((sum, e) => sum + parseNumericValue(e.value), 0) - spese.reduce((sum, s) => sum + parseNumericValue(s.value), 0))}
                  </dd>
                </dl>
                <div>
                  {spese.length > 0 && entrate.length > 0 && (
                    <span className="inline-flex items-center bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded">
                      <svg className="w-4 h-4 me-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v13m0-13 4 4m-4-4-4 4"/>
                      </svg>
                      {lang === 'it' ? 'Tasso' : 'Rate'} {(((entrate.reduce((sum, e) => sum + parseNumericValue(e.value), 0) - spese.reduce((sum, s) => sum + parseNumericValue(s.value), 0)) / entrate.reduce((sum, e) => sum + parseNumericValue(e.value), 0)) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Income and Expense Grid */}
              <div className="grid grid-cols-2 gap-4 py-3 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <dl>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">{lang === 'it' ? 'Entrate' : 'Income'}</dt>
                  <dd className="text-lg font-semibold text-green-600 dark:text-green-400">
                    €{formatCurrency(entrate.reduce((sum, e) => sum + parseNumericValue(e.value), 0))}
                  </dd>
                </dl>
                <dl>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">{lang === 'it' ? 'Spese' : 'Expense'}</dt>
                  <dd className="text-lg font-semibold text-red-600 dark:text-red-400">
                    -€{formatCurrency(spese.reduce((sum, s) => sum + parseNumericValue(s.value), 0))}
                  </dd>
                </dl>
              </div>

              {/* Bar Chart */}
              <div className="w-full mb-6">
                {transactions.length > 0 ? (
                  <BarChart transactions={transactions} period={period as any} lang={lang} />
                ) : (
                  <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">{lang === 'it' ? 'Nessun dato' : 'No data'}</p>
                  </div>
                )}
              </div>

              {/* Footer with Button */}
              <div className="flex justify-between items-center pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
                <button className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-center inline-flex items-center">
                  {lang === 'it' ? 'Ultimi 7 giorni' : 'Last 7 days'}
                  <svg className="w-4 h-4 ms-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7"/>
                  </svg>
                </button>
                <a href="#" className="inline-flex items-center text-blue-600 dark:text-blue-400 bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-lg text-sm px-3 py-2 transition">
                  {lang === 'it' ? 'Rapporto Entrate' : 'Revenue Report'}
                  <svg className="w-4 h-4 ms-1.5 -me-0.5 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

        {view === "categories" && (
          <div className="p-4 border border-gray-300 dark:border-gray-700 border-dashed rounded-lg bg-white dark:bg-gray-800">
            {/* Filter Bar - Top */}
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <Filters
                period={period}
                onPeriodChange={handlePeriodChange}
                onDateChange={handleDateChange}
                lang={lang}
              />
            </div>

            {/* Transactions Grid - 2 Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Spese */}
              <div className="w-full p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {T[lang].spese}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredSpeseTransactions.length} {lang === 'it' ? 'movimenti' : 'transactions'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang === 'it' ? 'Categoria' : 'Category'}</label>
                    <input
                      type="text"
                      value={speseCategoryFilter}
                      onChange={(e) => setSpeseCategoryFilter(e.target.value)}
                      placeholder={lang === 'it' ? 'Filtra per categoria' : 'Filter by category'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang === 'it' ? 'Descrizione' : 'Description'}</label>
                    <input
                      type="text"
                      value={speseDescriptionFilter}
                      onChange={(e) => setSpeseDescriptionFilter(e.target.value)}
                      placeholder={lang === 'it' ? 'Filtra per descrizione' : 'Filter by description'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flow-root">
                  {filteredSpeseTransactions.length > 0 ? (
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredSpeseTransactions.map((tx: any, idx: number) => {
                        return (
                        <li key={idx} className="py-4 sm:py-4">
                          <div className="flex items-center gap-3">
                            {/* Icon/Avatar */}
                            <div className="shrink-0">
                              <CategoryBadge category={tx.categoria || 'Altro'} type="expense" />
                            </div>
                            
                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words">
                                {tx['descrizione_operazione'] || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {tx.categoria || 'N/A'} • {dayjs(tx.data).format('DD/MM/YYYY')}
                              </p>
                            </div>
                            
                            {/* Amount */}
                            <div className="inline-flex items-center font-semibold whitespace-nowrap text-red-600">
                              −€{formatCurrency(tx.uscita)}
                            </div>
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">
                        {lang === 'it' ? 'Nessuna spesa trovata' : 'No expenses found'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Entrate */}
              <div className="w-full p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {T[lang].entrate}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredEntrateTransactions.length} {lang === 'it' ? 'movimenti' : 'transactions'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang === 'it' ? 'Categoria' : 'Category'}</label>
                    <input
                      type="text"
                      value={entrateCategoryFilter}
                      onChange={(e) => setEntrateCategoryFilter(e.target.value)}
                      placeholder={lang === 'it' ? 'Filtra per categoria' : 'Filter by category'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang === 'it' ? 'Descrizione' : 'Description'}</label>
                    <input
                      type="text"
                      value={entrateDescriptionFilter}
                      onChange={(e) => setEntrateDescriptionFilter(e.target.value)}
                      placeholder={lang === 'it' ? 'Filtra per descrizione' : 'Filter by description'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flow-root">
                  {transactions.filter(t => t.type === 'entrata').length > 0 ? (
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredEntrateTransactions.map((tx: any, idx: number) => {
                        return (
                        <li key={idx} className="py-4 sm:py-4">
                          <div className="flex items-center gap-3">
                            {/* Icon/Avatar */}
                            <div className="shrink-0">
                              <CategoryBadge category={tx.categoria || 'Altro'} type="income" />
                            </div>
                            
                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white break-words">
                                {tx['descrizione_operazione'] || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {tx.categoria || 'N/A'} • {dayjs(tx.data).format('DD/MM/YYYY')}
                              </p>
                            </div>
                            
                            {/* Amount */}
                            <div className="inline-flex items-center font-semibold whitespace-nowrap text-green-600">
                              +€{formatCurrency(tx.entrata)}
                            </div>
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">
                        {lang === 'it' ? 'Nessuna entrata trovata' : 'No income found'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "settings" && (
          <section className="p-4 border border-gray-300 dark:border-gray-700 border-dashed rounded-lg bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{T[lang].impostazioni}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language Card */}
              <div className="p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{T[lang].lingua}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{T[lang].scegli_lingua}</p>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setLang('it')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      lang === 'it'
                        ? 'bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-300 dark:ring-offset-gray-700'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    🇮🇹 Italiano
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      lang === 'en'
                        ? 'bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-300 dark:ring-offset-gray-700'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>
              
              {/* Dark Mode Card */}
              <div className="p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{T[lang].dark_mode}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{T[lang].abilita_dark_mode}</p>
                
                <button
                id="theme-toggle"
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5"
              >
                <svg
                  id="theme-toggle-dark-icon"
                  className={`${darkMode ? 'hidden' : ''} w-5 h-5`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
                <svg
                  id="theme-toggle-light-icon"
                  className={`${darkMode ? '' : 'hidden'} w-5 h-5`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <p className="text-sm text-gray-900 dark:text-white font-medium mt-3">
                {darkMode ? (lang === 'it' ? 'Abilitato' : 'Enabled') : (lang === 'it' ? 'Disabilitato' : 'Disabled')}
              </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}