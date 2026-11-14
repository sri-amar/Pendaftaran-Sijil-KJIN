import type {AppConfig, RegistrationInput} from '../types/karnival.ts';

interface CertificatePreviewProps {
  config: AppConfig;
  draft: RegistrationInput;
  certNo?: string;
  showPlaceholders?: boolean;
}

export function CertificatePreview({
  config,
  draft,
  certNo,
  showPlaceholders = false,
}: CertificatePreviewProps) {
  const displayNama = draft.nama.trim()
    ? draft.nama.trim().toUpperCase()
    : showPlaceholders
      ? config.placeholders.nama
      : 'NAMA PENUH PESERTA';

  const displayKp = draft.noKp.trim()
    ? draft.noKp.trim().toUpperCase()
    : showPlaceholders
      ? config.placeholders.noKp
      : '050101-01-1234';

  const displayKategori = draft.kategori.trim()
    ? draft.kategori.trim()
    : showPlaceholders
      ? config.placeholders.kategori
      : 'Murid Sekolah Menengah';

  const displaySekolah = draft.sekolah.trim()
    ? draft.sekolah.trim()
    : showPlaceholders
      ? config.placeholders.sekolah
      : 'Sekolah / Institusi / Agensi';

  const displayNegeri = draft.negeri.trim()
    ? draft.negeri.trim()
    : showPlaceholders
      ? config.placeholders.negeri
      : 'Negeri';

  const displayCertNo = certNo || (showPlaceholders ? config.placeholders.noSijil : 'JIN-2026-0001');

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 sm:p-7">
      <div className="relative border border-stone-300 bg-[#FBF9F5] p-6 sm:p-8 overflow-hidden">
        {/* Hairline inner architectural frame */}
        <div className="pointer-events-none absolute inset-2.5 border border-[#78350F]/25" />

        {/* Subtle geometric corner rosette SVG */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 120"
          className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 text-[#14532D]/[0.06]"
          fill="none"
        >
          <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="1" />
          <circle cx="60" cy="60" r="38" stroke="currentColor" strokeWidth="1" />
          <rect
            x="24"
            y="24"
            width="72"
            height="72"
            stroke="currentColor"
            strokeWidth="1"
            transform="rotate(45 60 60)"
          />
          <rect x="24" y="24" width="72" height="72" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative z-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-3 text-xs tracking-widest uppercase text-[#78350F] font-medium">
            <span>Specimen Pratinjau Sijil</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{displayCertNo}</span>
          </div>

          <div className="pt-1">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
              Sijil Penyertaan Rasmi
            </p>
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#14532D] mt-1 leading-tight">
              {config.eventTitle}
            </h3>
            <p className="text-xs uppercase tracking-widest text-stone-600 mt-1">
              {config.eventSubtitle}
            </p>
          </div>

          <div className="w-24 h-px bg-stone-300 mx-auto" />

          <div className="space-y-1.5 py-1">
            <p className="text-xs text-stone-500">Dengan sukacitanya diperakui bahawa</p>
            <p className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-wide break-words">
              {displayNama}
            </p>
            <p className="text-xs font-mono tabular-nums text-stone-600">
              No. KP / Pasport: {displayKp}
            </p>
          </div>

          <div className="text-xs text-stone-600 leading-relaxed max-w-md mx-auto">
            <p>
              dari <span className="font-medium text-stone-900">{displaySekolah}</span> ({displayNegeri})
            </p>
            <p className="mt-1">
              telah menyertai kategori <span className="font-medium text-[#14532D]">{displayKategori}</span> pada{' '}
              <span className="font-medium text-stone-900">{config.eventDate}</span>.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-stone-200/90 flex items-center justify-between text-[11px] text-stone-500">
            <div className="text-left">
              <p className="font-medium text-stone-700">Urusetia Induk</p>
              <p>{config.eventTitle}</p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <p className="text-stone-700">ID Template</p>
              <p>{config.slideId.slice(0, 12)}...</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-serif italic text-stone-500 mt-3 text-center">
        Fig. 1 — Sijil PDF sebenar dijana secara automatik daripada templat Google Slides anda dan dihantar terus ke emel peserta.
      </p>
    </div>
  );
}
