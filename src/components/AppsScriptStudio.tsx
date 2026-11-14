import {useMemo, useState} from 'react';
import {Check, Copy, Download, ExternalLink, Loader2, PlugZap, Save} from 'lucide-react';
import type {AppConfig, AppsScriptPingResponse, PlaceholderMapping} from '../types/karnival.ts';
import {generateCodeGs, generateStandaloneHtml} from '../utils/appsScriptTemplates.ts';

interface AppsScriptStudioProps {
  config: AppConfig;
  onConfigSaved: (next: AppConfig) => void;
}

export function AppsScriptStudio({config, onConfigSaved}: AppsScriptStudioProps) {
  const [draft, setDraft] = useState<AppConfig>(config);
  const [activeCodeTab, setActiveCodeTab] = useState<'codegs' | 'html'>('codegs');
  const [copiedType, setCopiedType] = useState<'codegs' | 'html' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState<AppsScriptPingResponse | null>(null);

  const codeGsText = useMemo(() => generateCodeGs(draft), [draft]);
  const standaloneHtmlText = useMemo(() => generateStandaloneHtml(draft), [draft]);

  function updatePlaceholder(key: keyof PlaceholderMapping, value: string) {
    setDraft((prev) => ({
      ...prev,
      placeholders: {
        ...prev.placeholders,
        [key]: value,
      },
    }));
  }

  async function handleSaveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {ok: boolean; config?: AppConfig; error?: string};
      if (data.ok && data.config) {
        onConfigSaved(data.config);
        setDraft(data.config);
        setSaveMessage('Konfigurasi berjaya disimpan. Semua pengunjung kini menggunakan tetapan terkini.');
      } else {
        setSaveMessage(data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch {
      setSaveMessage('Ralat rangkaian semasa menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/test-apps-script', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({appsScriptUrl: draft.appsScriptUrl}),
      });
      const data = (await res.json()) as AppsScriptPingResponse;
      setPingResult(data);
    } catch {
      setPingResult({
        ok: false,
        message: 'Gagal menguji sambungan.',
        error: 'Ralat rangkaian semasa menghubungi pelayan.',
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleCopy(type: 'codegs' | 'html') {
    const content = type === 'codegs' ? codeGsText : standaloneHtmlText;
    await navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  }

  function handleDownloadFile(type: 'codegs' | 'html') {
    const content = type === 'codegs' ? codeGsText : standaloneHtmlText;
    const filename = type === 'codegs' ? 'Code.gs' : 'karnival-imam-nawawi-2026.html';
    const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const placeholderFields: Array<{key: keyof PlaceholderMapping; label: string; sample: string}> = [
    {key: 'nama', label: 'Nama Penuh', sample: '{{NAMA}}'},
    {key: 'noKp', label: 'No. KP / Pasport', sample: '{{NO_KP}}'},
    {key: 'kategori', label: 'Kategori Penyertaan', sample: '{{KATEGORI}}'},
    {key: 'sekolah', label: 'Sekolah / Institusi', sample: '{{SEKOLAH}}'},
    {key: 'negeri', label: 'Negeri', sample: '{{NEGERI}}'},
    {key: 'emel', label: 'Alamat Emel', sample: '{{EMEL}}'},
    {key: 'noTelefon', label: 'No. Telefon', sample: '{{NO_TELEFON}}'},
    {key: 'tarikh', label: 'Tarikh Program', sample: '{{TARIKH}}'},
    {key: 'noSijil', label: 'No. Siri Sijil', sample: '{{NO_SIJIL}}'},
  ];

  return (
    <div className="space-y-10">
      <section className="border-b border-stone-200 pb-6">
        <p className="text-xs uppercase tracking-widest text-[#78350F] font-medium">
          Panel Pentadbir &amp; Integrasi Google Workspace
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 mt-2">
          Konfigurasi ID, Placeholder &amp; Kod Apps Script
        </h1>
        <p className="text-sm sm:text-base text-stone-600 mt-2 max-w-3xl leading-relaxed">
          Semua ID Google Sheet, Folder Salinan Sijil, dan Slide Template anda telah dipra-isikan. Sesuaikan tag placeholder mengikut Slide anda, salin kod <code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">Code.gs</code> ke Apps Script, dan tampal URL Web App (<code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">/exec</code>) di bawah.
        </p>
      </section>

      {/* Configuration Form */}
      <form onSubmit={handleSaveConfig} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Google IDs & Web App URL */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
                01. Pautan Sumber Google
              </p>
              <h2 className="font-serif text-2xl font-semibold text-stone-900 mt-1">
                ID Sheet, Drive &amp; Slide Template
              </h2>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="sheetId" className="text-sm font-medium text-stone-800">
                  ID Google Sheet
                </label>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${draft.sheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#14532D] hover:underline"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                id="sheetId"
                type="text"
                value={draft.sheetId}
                onChange={(e) => setDraft({...draft, sheetId: e.target.value})}
                className="w-full px-3.5 py-2 bg-[#FBF9F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="folderId" className="text-sm font-medium text-stone-800">
                  ID Folder Salinan Sijil (Drive)
                </label>
                <a
                  href={`https://drive.google.com/drive/folders/${draft.folderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#14532D] hover:underline"
                >
                  <span>Buka Folder</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                id="folderId"
                type="text"
                value={draft.folderId}
                onChange={(e) => setDraft({...draft, folderId: e.target.value})}
                className="w-full px-3.5 py-2 bg-[#FBF9F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="slideId" className="text-sm font-medium text-stone-800">
                  ID Slide Template Sijil
                </label>
                <a
                  href={`https://docs.google.com/presentation/d/${draft.slideId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#14532D] hover:underline"
                >
                  <span>Buka Slide</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                id="slideId"
                type="text"
                value={draft.slideId}
                onChange={(e) => setDraft({...draft, slideId: e.target.value})}
                className="w-full px-3.5 py-2 bg-[#FBF9F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div className="pt-2 border-t border-stone-200">
              <label htmlFor="appsScriptUrl" className="block text-sm font-medium text-stone-800 mb-1.5">
                URL Web App Google Apps Script (<code className="font-mono text-xs">.../exec</code>)
              </label>
              <input
                id="appsScriptUrl"
                type="url"
                value={draft.appsScriptUrl}
                onChange={(e) => setDraft({...draft, appsScriptUrl: e.target.value})}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
              <p className="text-xs text-stone-500 mt-1.5">
                Setelah anda deploy <code className="font-mono">Code.gs</code> sebagai Web App, tampal URL di sini supaya sistem AI Studio menghantar pendaftaran terus ke Sheet &amp; emel peserta.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] hover:bg-[#0f3f22] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Konfigurasi</span>
              </button>

              <button
                type="button"
                disabled={testing || !draft.appsScriptUrl.trim()}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-stone-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                <span>Uji Sambungan</span>
              </button>
            </div>

            {saveMessage && (
              <p className="text-xs text-[#14532D] font-medium bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                {saveMessage}
              </p>
            )}

            {pingResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                  pingResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <p className="font-semibold">{pingResult.message}</p>
                {pingResult.error && <p>{pingResult.error}</p>}
                {pingResult.details && (
                  <ul className="pt-1 space-y-0.5 font-mono text-[11px]">
                    <li>Sheet: {pingResult.details.sheetName}</li>
                    <li>Folder: {pingResult.details.folderName}</li>
                    <li>Slide: {pingResult.details.slideTitle}</li>
                    <li>Jumlah Rekod Sedia Ada: {pingResult.details.totalRows ?? 0}</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right: Slide Placeholder Mapping */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
                02. Pemetaan Placeholder Slide
              </p>
              <h2 className="font-serif text-2xl font-semibold text-stone-900 mt-1">
                Sesuaikan Tag Dalam Slide Anda
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Ubah tag di bawah jika Slide template anda menggunakan format lain (contoh: <code className="font-mono">&lt;&lt;NAMA&gt;&gt;</code> atau <code className="font-mono">{'{{nama}}'}</code>). Kod <code className="font-mono">Code.gs</code> akan dikemas kini secara automatik.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {placeholderFields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`ph-${field.key}`}
                    className="block text-xs font-medium text-stone-700 mb-1"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`ph-${field.key}`}
                    type="text"
                    value={draft.placeholders[field.key]}
                    onChange={(e) => updatePlaceholder(field.key, e.target.value)}
                    placeholder={field.sample}
                    className="w-full px-3 py-2 bg-[#FBF9F5] border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-200">
              <label htmlFor="eventDate" className="block text-xs font-medium text-stone-700 mb-1">
                Tarikh Rasmi Pada Sijil ({draft.placeholders.tarikh})
              </label>
              <input
                id="eventDate"
                type="text"
                value={draft.eventDate}
                onChange={(e) => setDraft({...draft, eventDate: e.target.value})}
                className="w-full px-3 py-2 bg-[#FBF9F5] border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Code Export Section (Code.gs + Standalone HTML) */}
      <section className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
              03. Kod Sumber Sedia Tampal
            </p>
            <h2 className="font-serif text-2xl font-semibold text-stone-900 mt-1">
              Kod Apps Script (<code className="font-mono text-lg">Code.gs</code>) &amp; HTML Tunggal
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EBE6DF] rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveCodeTab('codegs')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeCodeTab === 'codegs'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Code.gs (Apps Script)
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('html')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeCodeTab === 'html'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              HTML Tunggal (Sandaran)
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-[#FBF9F5] border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-600">
            {activeCodeTab === 'codegs'
              ? 'Tampal kod ini ke dalam Extensions > Apps Script > Code.gs pada Google Sheet anda.'
              : 'Fail HTML tunggal ini boleh digunakan sebagai sandaran jika ingin diletakkan di hosting statik atau Google Sites.'}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(activeCodeTab)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#14532D] hover:bg-[#0f3f22] text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedType === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kod</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownloadFile(activeCodeTab)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-stone-300 hover:bg-white text-stone-800 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Muat Turun Fail</span>
            </button>
          </div>
        </div>

        <pre className="p-6 bg-[#1C1917] text-stone-100 text-xs font-mono leading-relaxed overflow-x-auto max-h-[540px]">
          <code>{activeCodeTab === 'codegs' ? codeGsText : standaloneHtmlText}</code>
        </pre>
      </section>

      {/* Step-by-step Setup Guide */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-4">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          04. Langkah Pengaktifan (Sekali Sahaja)
        </p>
        <h2 className="font-serif text-2xl font-semibold text-stone-900">
          Panduan Ringkas Pemasangan Apps Script
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 text-sm text-stone-700">
          <li className="p-4 bg-[#FBF9F5] border border-stone-200 rounded-lg space-y-1">
            <p className="font-semibold text-stone-900">1. Buka Apps Script dalam Sheet</p>
            <p className="text-xs text-stone-600 leading-relaxed">
              Buka Google Sheet anda, klik menu <strong>Extensions &gt; Apps Script</strong>, padam kod sedia ada, dan tampal kod <code className="font-mono">Code.gs</code> di atas kemudian tekan Simpan (Ctrl+S).
            </p>
          </li>
          <li className="p-4 bg-[#FBF9F5] border border-stone-200 rounded-lg space-y-1">
            <p className="font-semibold text-stone-900">2. Beri Kebenaran &amp; Semak Placeholder</p>
            <p className="text-xs text-stone-600 leading-relaxed">
              Pilih fungsi <code className="font-mono">authorizePermissions</code> dan klik <strong>Run</strong> untuk memberi akses Drive, Slides, Sheets &amp; MailApp. Jalankan <code className="font-mono">debugSlidePlaceholders</code> untuk melihat senarai placeholder dalam Slide anda.
            </p>
          </li>
          <li className="p-4 bg-[#FBF9F5] border border-stone-200 rounded-lg space-y-1">
            <p className="font-semibold text-stone-900">3. Deploy Sebagai Web App</p>
            <p className="text-xs text-stone-600 leading-relaxed">
              Klik <strong>Deploy &gt; New deployment</strong>, pilih jenis <strong>Web app</strong>. Tetapkan <em>Execute as</em>: <strong>Me</strong> dan <em>Who has access</em>: <strong>Anyone</strong>, kemudian salin URL <code className="font-mono">.../exec</code>.
            </p>
          </li>
          <li className="p-4 bg-[#FBF9F5] border border-stone-200 rounded-lg space-y-1">
            <p className="font-semibold text-stone-900">4. Tampal URL &amp; Uji Sambungan</p>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tampal URL <code className="font-mono">.../exec</code> ke dalam ruangan di atas, klik <strong>Simpan Konfigurasi</strong> dan <strong>Uji Sambungan</strong>. Sistem anda sedia menerima pendaftaran pengunjung.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
