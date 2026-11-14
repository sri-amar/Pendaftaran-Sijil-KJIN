import {useState} from 'react';
import {Download, Loader2, Search} from 'lucide-react';
import type {ApiLookupResponse, AppConfig, RegistrationRecord} from '../types/karnival.ts';

interface LookupViewProps {
  config: AppConfig;
}

export function LookupView({config}: LookupViewProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [records, setRecords] = useState<RegistrationRecord[]>([]);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setErrorMsg('Sila masukkan alamat emel atau No. Kad Pengenalan anda.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/lookup?query=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as ApiLookupResponse;
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Gagal membuat semakan sijil.');
        setRecords([]);
        return;
      }
      setRecords(data.records);
    } catch {
      setErrorMsg('Ralat rangkaian semasa menyemak rekod sijil.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <section className="border-b border-stone-200 pb-6">
        <p className="text-xs uppercase tracking-widest text-[#78350F] font-medium">
          Arkib &amp; Semakan Sijil Digital
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 mt-2">
          Semak &amp; Muat Turun Semula Sijil
        </h1>
        <p className="text-sm sm:text-base text-stone-600 mt-2 leading-relaxed">
          Sudah mendaftar untuk {config.eventTitle}? Masukkan alamat emel atau No. Kad Pengenalan untuk mendapatkan semula nombor siri dan pautan sijil PDF anda.
        </p>
      </section>

      <form
        onSubmit={handleSearch}
        className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1">
          <label htmlFor="lookup-query" className="sr-only">
            Emel atau No. Kad Pengenalan
          </label>
          <input
            id="lookup-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Masukkan emel (cth: nama@moe-dl.edu.my) atau No. KP"
            className="w-full px-4 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#14532D] hover:bg-[#0f3f22] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyemak...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Semak Sijil</span>
            </>
          )}
        </button>
      </form>

      {errorMsg && (
        <div role="alert" className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm">
          {errorMsg}
        </div>
      )}

      {searched && !loading && !errorMsg && records.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
          <p className="font-serif text-xl font-semibold text-stone-900">
            Tiada rekod ditemui
          </p>
          <p className="text-sm text-stone-600 mt-1">
            Pastikan ejaan emel atau No. Kad Pengenalan sama seperti yang didaftarkan. Jika belum mendaftar, sila lengkapkan borang di tab Pendaftaran.
          </p>
        </div>
      )}

      {records.length > 0 && (
        <div className="space-y-4">
          {records.map((rec) => (
            <article
              key={`${rec.certNo}-${rec.emel}`}
              className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="font-mono tabular-nums font-semibold text-[#78350F]">
                    {rec.certNo}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{rec.kategori}</span>
                  <span aria-hidden="true">·</span>
                  <span>{rec.negeri}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-stone-900">
                  {rec.nama}
                </h2>
                <p className="text-sm text-stone-600">
                  {rec.sekolah} · <span className="font-mono text-xs">{rec.noKp}</span>
                </p>
              </div>

              <div className="shrink-0">
                {rec.pdfUrl ? (
                  <a
                    href={rec.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#14532D] hover:bg-[#0f3f22] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Muat Turun PDF</span>
                  </a>
                ) : (
                  <span className="text-xs text-stone-500 font-medium">
                    Mod Pratonton (PDF dijana selepas Apps Script aktif)
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
