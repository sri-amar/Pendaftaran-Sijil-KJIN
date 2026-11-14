import {useEffect, useState} from 'react';
import {AppsScriptStudio} from './components/AppsScriptStudio.tsx';
import {LookupView} from './components/LookupView.tsx';
import {RegistrationView} from './components/RegistrationView.tsx';
import type {AppConfig} from './types/karnival.ts';
import {DEFAULT_CONFIG} from './types/karnival.ts';

type ActiveTab = 'daftar' | 'semak' | 'kod';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('daftar');
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    let active = true;
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: {ok?: boolean; config?: AppConfig}) => {
        if (active && data.ok && data.config) {
          setConfig(data.config);
        }
      })
      .catch(() => {
        // Keep DEFAULT_CONFIG if backend config endpoint is momentarily unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  function navigateTo(tab: ActiveTab) {
    setActiveTab(tab);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
      {/* 3-Zone Top Bar Contract */}
      <header className="no-print sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('daftar')}
            className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            Jejak Imam Nawawi 2026
          </button>

          {/* Zone 2: Clean Single-Line Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <button
              type="button"
              onClick={() => navigateTo('daftar')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'daftar'
                  ? 'border-[#14532D] text-stone-900'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Pendaftaran
            </button>
            <button
              type="button"
              onClick={() => navigateTo('semak')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'semak'
                  ? 'border-[#14532D] text-stone-900'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Semak Sijil
            </button>
            <button
              type="button"
              onClick={() => navigateTo('kod')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'kod'
                  ? 'border-[#14532D] text-stone-900'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Kod Apps Script
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('daftar')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#0f3f22] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Daftar Sijil
            </button>
          </div>
        </div>

        {/* Compact Mobile Navigation Row */}
        <div className="md:hidden border-t border-stone-200 px-4 py-2 flex items-center justify-around gap-2 bg-[#FBF9F5]">
          <button
            type="button"
            onClick={() => navigateTo('daftar')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'daftar'
                ? 'bg-[#EBE6DF] text-stone-900 font-semibold'
                : 'text-stone-600'
            }`}
          >
            Pendaftaran
          </button>
          <button
            type="button"
            onClick={() => navigateTo('semak')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'semak'
                ? 'bg-[#EBE6DF] text-stone-900 font-semibold'
                : 'text-stone-600'
            }`}
          >
            Semak Sijil
          </button>
          <button
            type="button"
            onClick={() => navigateTo('kod')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 ${
              activeTab === 'kod'
                ? 'bg-[#EBE6DF] text-stone-900 font-semibold'
                : 'text-stone-600'
            }`}
          >
            Kod Apps Script
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {activeTab === 'daftar' && (
          <RegistrationView config={config} onNavigateTab={navigateTo} />
        )}
        {activeTab === 'semak' && <LookupView config={config} />}
        {activeTab === 'kod' && (
          <AppsScriptStudio config={config} onConfigSaved={setConfig} />
        )}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="no-print border-t border-stone-200 bg-[#FBF9F5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            {config.eventTitle} · {config.eventSubtitle}
          </p>
          <p className="font-mono tabular-nums">
            Sheet {config.sheetId.slice(0, 8)}… · Slide {config.slideId.slice(0, 8)}…
          </p>
        </div>
      </footer>
    </div>
  );
}
