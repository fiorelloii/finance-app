import { useState, useEffect, type ChangeEvent } from 'react';
import { uploadFile } from '../services/api';

type Props = {
  currentView: 'home' | 'charts' | 'categories' | 'settings';
  onSelect: (view: 'home' | 'charts' | 'categories' | 'settings') => void;
  onLanguageChange?: (lang: 'it' | 'en') => void;
  lang?: 'it' | 'en';
};

export default function Sidebar({ currentView, onSelect, onLanguageChange, lang: langProp }: Props) {
  const labels: Record<'it' | 'en', Record<string, string>> = {
    it: {
      home: 'Home',
      charts: 'Grafici',
      categories: 'Movimenti',
      settings: 'Impostazioni',
    },
    en: {
      home: 'Home',
      charts: 'Charts',
      categories: 'Movements',
      settings: 'Settings',
    },
  };

  const [lang, setLang] = useState<'it' | 'en'>(langProp ?? 'it');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    if (langProp) setLang(langProp);
  }, [langProp]);

  const handleLang = (l: 'it' | 'en') => {
    setLang(l);
    if (onLanguageChange) onLanguageChange(l);
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

  const items: { key: Props['currentView']; label: string }[] = [
    { key: 'home', label: labels[lang].home },
    { key: 'charts', label: labels[lang].charts },
    { key: 'categories', label: labels[lang].categories },
    { key: 'settings', label: labels[lang].settings },
  ];

  return (
    <aside className="relative w-64 h-full min-h-full bg-gray-900 text-white p-4">
      <div>
        <h1 className="text-xl font-bold mb-6">Finance App</h1>

        <nav className="flex flex-col space-y-2">
          {items.map((it) => {
            const active = it.key === currentView;
            return (
              <button
                key={it.key}
                onClick={() => onSelect(it.key)}
                className={`text-left px-3 py-2 rounded-md transition-colors duration-150 w-full ${
                  active ? 'bg-gray-700 font-semibold' : 'hover:bg-gray-800/60 hover:underline'
                }`}
              >
                {it.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => document.getElementById('sidebar-upload-input')?.click()}
          className="text-white bg-success box-border border border-transparent hover:bg-success-strong focus:ring-4 focus:ring-success-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
        >
          <span className="text-lg leading-none">+</span>
        </button>
        <input id="sidebar-upload-input" type="file" accept=".pdf" className="hidden" onChange={handleUpload} />

        {uploadMessage ? <p className="text-xs text-gray-300">{uploadMessage}</p> : null}

        <div className="flex items-center space-x-2">
          <button
            aria-label="Italiano"
            onClick={() => handleLang('it')}
            className={`rounded p-1 text-lg ${lang === 'it' ? 'ring-2 ring-offset-1 ring-white' : ''}`}
          >
            🇮🇹
          </button>

          <button
            aria-label="English"
            onClick={() => handleLang('en')}
            className={`rounded p-1 text-lg ${lang === 'en' ? 'ring-2 ring-offset-1 ring-white' : ''}`}
          >
            🇬🇧
          </button>
        </div>
      </div>
    </aside>
  );
}
