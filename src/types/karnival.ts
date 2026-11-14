export interface PlaceholderMapping {
  nama: string;
  noKp: string;
  emel: string;
  noTelefon: string;
  kategori: string;
  sekolah: string;
  negeri: string;
  tarikh: string;
  noSijil: string;
}

export interface AppConfig {
  eventTitle: string;
  eventSubtitle: string;
  eventDate: string;
  eventLocation: string;
  sheetId: string;
  folderId: string;
  slideId: string;
  appsScriptUrl: string;
  emailSubject: string;
  placeholders: PlaceholderMapping;
}

export interface RegistrationInput {
  nama: string;
  noKp: string;
  emel: string;
  noTelefon: string;
  kategori: string;
  sekolah: string;
  negeri: string;
}

export interface RegistrationRecord extends RegistrationInput {
  certNo: string;
  tarikh: string;
  pdfUrl: string | null;
  emailSent: boolean;
  mode: 'apps_script' | 'preview_local';
  createdAt: string;
}

export interface ApiRegisterResponse {
  ok: boolean;
  message: string;
  record?: RegistrationRecord;
  error?: string;
}

export interface ApiLookupResponse {
  ok: boolean;
  records: RegistrationRecord[];
  source: 'apps_script' | 'preview_local' | 'combined';
  error?: string;
}

export interface AppsScriptPingResponse {
  ok: boolean;
  message: string;
  details?: {
    sheetName?: string;
    folderName?: string;
    slideTitle?: string;
    totalRows?: number;
  };
  error?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  eventTitle: 'Karnival Jejak Imam Nawawi',
  eventSubtitle: 'Peringkat Kebangsaan 2026',
  eventDate: '14 November 2026',
  eventLocation: 'Peringkat Kebangsaan (Dalam Talian & Bersemuka)',
  sheetId: '1uaotn8fOC8SHBf-dZlf67_oMvEzsiuTx2WnQ-nrKsgU',
  folderId: '1xaPSTwLkSuBcprZfbyVQpBic9R8wl4M9',
  slideId: '14KuAfzSoidNXDU0wMCt_QUxsqCGa_kzTdlpYsIVMgpU',
  appsScriptUrl: '',
  emailSubject: 'Sijil Penyertaan Rasmi — Karnival Jejak Imam Nawawi Peringkat Kebangsaan 2026',
  placeholders: {
    nama: '{{NAMA}}',
    noKp: '{{NO_KP}}',
    emel: '{{EMEL}}',
    noTelefon: '{{NO_TELEFON}}',
    kategori: '{{KATEGORI}}',
    sekolah: '{{SEKOLAH}}',
    negeri: '{{NEGERI}}',
    tarikh: '{{TARIKH}}',
    noSijil: '{{NO_SIJIL}}',
  },
};

export const KATEGORI_OPTIONS: string[] = [
  'Murid Sekolah Rendah',
  'Murid Sekolah Menengah',
  'Guru & Pendidik',
  'Pelajar IPT / Maahad',
  'Ibu Bapa & Komuniti Awam',
  'Urusetia / Pegawai Teknikal',
];

export const NEGERI_OPTIONS: string[] = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'W.P. Kuala Lumpur',
  'W.P. Labuan',
  'W.P. Putrajaya',
];
