import {useState} from 'react';
import {CheckCircle2, Download, FileCheck2, Loader2, Mail, RotateCcw} from 'lucide-react';
import type {
  ApiRegisterResponse,
  AppConfig,
  RegistrationInput,
  RegistrationRecord,
} from '../types/karnival.ts';
import {KATEGORI_OPTIONS, NEGERI_OPTIONS} from '../types/karnival.ts';
import {CertificatePreview} from './CertificatePreview.tsx';

interface RegistrationViewProps {
  config: AppConfig;
  onNavigateTab: (tab: 'daftar' | 'semak' | 'kod') => void;
}

const INITIAL_FORM: RegistrationInput = {
  nama: '',
  noKp: '',
  emel: '',
  noTelefon: '',
  kategori: '',
  sekolah: '',
  negeri: '',
};

export function RegistrationView({config, onNavigateTab}: RegistrationViewProps) {
  const [form, setForm] = useState<RegistrationInput>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<RegistrationRecord | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isLiveAppsScript =
    config.appsScriptUrl.trim().startsWith('https://script.google.com/macros/s/') &&
    config.appsScriptUrl.includes('/exec');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!form.nama.trim() || !form.noKp.trim() || !form.emel.trim() || !form.kategori || !form.sekolah.trim() || !form.negeri) {
      setErrorMsg('Sila lengkapkan semua medan wajib bertanda (*).');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as ApiRegisterResponse;

      if (!response.ok || !result.ok || !result.record) {
        setErrorMsg(result.error || result.message || 'Gagal menghantar pendaftaran.');
        return;
      }

      setSubmittedRecord(result.record);
      setSuccessMsg(result.message);
    } catch {
      setErrorMsg('Ralat rangkaian semasa menghubungi pelayan pendaftaran. Sila cuba sebentar lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM);
    setSubmittedRecord(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  return (
    <div className="space-y-10">
      {/* Institutional Hero Split */}
      <section className="border-b border-stone-200 pb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-widest text-[#78350F] font-medium">
          <span>Peringkat Kebangsaan 2026</span>
          <span aria-hidden="true">·</span>
          <span>{config.eventDate}</span>
          <span aria-hidden="true">·</span>
          <span>
            {isLiveAppsScript
              ? 'Integrasi Apps Script Aktif'
              : 'Mod Pratonton Tempatan'}
          </span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-stone-900 mt-3 leading-[1.12] max-w-3xl [text-wrap:balance]">
          {config.eventTitle}
        </h1>
        <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-2xl mt-3">
          Portal rasmi pendaftaran peserta dan penjanaan sijil penyertaan digital secara automatik terus ke emel anda.
        </p>

        {!isLiveAppsScript && (
          <div className="mt-5 p-4 bg-[#EBE6DF]/60 border border-stone-300 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-stone-800">
              <span className="font-semibold">Nota Pentadbir:</span> Pautan Web App Google Apps Script (<code className="font-mono text-xs">/exec</code>) belum disambungkan. Borang kini berjalan dalam mod pratonton.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('kod')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#0f3f22] rounded-md transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              Sediakan Apps Script
            </button>
          </div>
        )}
      </section>

      {/* Main 2-Column Editorial Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Form or Confirmation */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          {submittedRecord ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#14532D] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#14532D] font-semibold">
                    Pendaftaran Disahkan
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-stone-900 mt-1">
                    Terima Kasih, {submittedRecord.nama}
                  </h2>
                  <p className="text-sm text-stone-600 mt-2 leading-relaxed">{successMsg}</p>
                </div>
              </div>

              <dl className="border-t border-b border-stone-200 divide-y divide-stone-200 text-sm">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-stone-500">No. Siri Sijil</dt>
                  <dd className="font-mono tabular-nums font-semibold text-stone-900">
                    {submittedRecord.certNo}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-stone-500">No. KP / Pasport</dt>
                  <dd className="font-mono tabular-nums text-stone-900">{submittedRecord.noKp}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-stone-500">Alamat Emel</dt>
                  <dd className="text-stone-900 break-all text-right">{submittedRecord.emel}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-stone-500">Kategori</dt>
                  <dd className="text-stone-900 text-right">{submittedRecord.kategori}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-stone-500">Sekolah / Institusi</dt>
                  <dd className="text-stone-900 text-right">
                    {submittedRecord.sekolah} ({submittedRecord.negeri})
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-stone-500">Status Penghantaran Emel</dt>
                  <dd className="font-medium text-stone-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#14532D]" />
                    <span>
                      {submittedRecord.emailSent
                        ? 'PDF telah dihantar ke emel'
                        : submittedRecord.mode === 'preview_local'
                          ? 'Menunggu sambungan Apps Script'
                          : 'Sijil tersedia untuk muat turun'}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {submittedRecord.pdfUrl ? (
                  <a
                    href={submittedRecord.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] hover:bg-[#0f3f22] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Muat Turun Sijil PDF</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] hover:bg-[#0f3f22] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Cetak Slip &amp; Pratonton Sijil</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Daftar Peserta Lain</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
                  01. Borang Pendaftaran Peserta
                </p>
                <h2 className="font-serif text-2xl font-semibold text-stone-900 mt-1">
                  Maklumat Penerima Sijil
                </h2>
                <p className="text-sm text-stone-600 mt-1">
                  Pastikan ejaan nama penuh dan alamat emel adalah tepat kerana sijil akan dijana secara automatik.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm"
                >
                  {errorMsg}
                </div>
              )}

              <div>
                <label htmlFor="nama" className="block text-sm font-medium text-stone-800 mb-1.5">
                  Nama Penuh (Seperti Dalam Sijil) <span className="text-red-700">*</span>
                </label>
                <input
                  id="nama"
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({...form, nama: e.target.value})}
                  placeholder="Contoh: MUHAMMAD IMRAN BIN HAKIM"
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="noKp" className="block text-sm font-medium text-stone-800 mb-1.5">
                    No. Kad Pengenalan / Pasport <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="noKp"
                    type="text"
                    required
                    value={form.noKp}
                    onChange={(e) => setForm({...form, noKp: e.target.value})}
                    placeholder="Contoh: 080412-10-1234"
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                  />
                </div>

                <div>
                  <label htmlFor="emel" className="block text-sm font-medium text-stone-800 mb-1.5">
                    Alamat Emel <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="emel"
                    type="email"
                    required
                    value={form.emel}
                    onChange={(e) => setForm({...form, emel: e.target.value})}
                    placeholder="peserta@moe-dl.edu.my"
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="noTelefon" className="block text-sm font-medium text-stone-800 mb-1.5">
                    No. Telefon
                  </label>
                  <input
                    id="noTelefon"
                    type="tel"
                    value={form.noTelefon}
                    onChange={(e) => setForm({...form, noTelefon: e.target.value})}
                    placeholder="Contoh: 019-1234567"
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                  />
                </div>

                <div>
                  <label htmlFor="kategori" className="block text-sm font-medium text-stone-800 mb-1.5">
                    Kategori Penyertaan <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="kategori"
                    required
                    value={form.kategori}
                    onChange={(e) => setForm({...form, kategori: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {KATEGORI_OPTIONS.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sekolah" className="block text-sm font-medium text-stone-800 mb-1.5">
                    Sekolah / Institusi / Agensi <span className="text-red-700">*</span>
                  </label>
                  <input
                    id="sekolah"
                    type="text"
                    required
                    value={form.sekolah}
                    onChange={(e) => setForm({...form, sekolah: e.target.value})}
                    placeholder="Contoh: SMK Agama Sultan Muhammad"
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                  />
                </div>

                <div>
                  <label htmlFor="negeri" className="block text-sm font-medium text-stone-800 mb-1.5">
                    Negeri <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="negeri"
                    required
                    value={form.negeri}
                    onChange={(e) => setForm({...form, negeri: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#14532D] focus:border-[#14532D]"
                  >
                    <option value="">-- Pilih Negeri --</option>
                    {NEGERI_OPTIONS.map((neg) => (
                      <option key={neg} value={neg}>
                        {neg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#14532D] hover:bg-[#0f3f22] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Menjana Sijil &amp; Menghantar Emel...</span>
                    </>
                  ) : (
                    <span>Daftar &amp; Hantar Sijil ke Emel</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Live Certificate Preview + Operational Steps */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <CertificatePreview
            config={config}
            draft={submittedRecord ?? form}
            certNo={submittedRecord?.certNo}
          />

          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-3">
            <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
              Aliran Automasi Sijil
            </p>
            <ol className="space-y-2.5 text-sm text-stone-700">
              <li className="flex gap-3">
                <span className="font-mono tabular-nums text-xs text-[#78350F] pt-0.5">01.</span>
                <span>Data peserta disimpan terus ke Google Sheet rasmi karnival.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono tabular-nums text-xs text-[#78350F] pt-0.5">02.</span>
                <span>Templat Google Slides disalin, diisi placeholder, dan ditukar kepada fail PDF.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono tabular-nums text-xs text-[#78350F] pt-0.5">03.</span>
                <span>Salinan PDF arkib disimpan dalam folder Drive dan dihantar terus ke emel peserta.</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
