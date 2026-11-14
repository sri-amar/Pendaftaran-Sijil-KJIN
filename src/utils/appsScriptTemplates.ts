import type {AppConfig} from '../types/karnival.ts';

function escapeJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function generateCodeGs(config: AppConfig): string {
  const p = config.placeholders;
  return `/**
 * ============================================================================
 * SISTEM PENDAFTARAN & PENJANAAN SIJIL AUTOMATIK
 * ${config.eventTitle} (${config.eventSubtitle})
 * ============================================================================
 * Arahan Ringkas:
 * 1. Buka Google Sheet anda -> Extensions -> Apps Script.
 * 2. Padam semua kod sedia ada dan tampal keseluruhan kod ini ke dalam Code.gs.
 * 3. Jalankan fungsi "authorizePermissions" SEKALI sahaja untuk memberi kebenaran
 *    akses kepada Sheet, Drive, Slides dan MailApp.
 * 4. (Pilihan) Jalankan "debugSlidePlaceholders" untuk menyemak placeholder
 *    yang terdapat dalam Slide template anda.
 * 5. Klik Deploy -> New deployment -> Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Salin Web App URL (.../exec) dan tampal ke dalam panel Konfigurasi di sistem.
 */

const CONFIG = {
  SHEET_ID: '${escapeJsString(config.sheetId)}',
  SHEET_NAME: '', // Kosongkan untuk guna tab pertama secara automatik
  FOLDER_ID: '${escapeJsString(config.folderId)}',
  SLIDE_TEMPLATE_ID: '${escapeJsString(config.slideId)}',
  EVENT_TITLE: '${escapeJsString(config.eventTitle)} ${escapeJsString(config.eventSubtitle)}',
  EVENT_DATE: '${escapeJsString(config.eventDate)}',
  EMAIL_SUBJECT: '${escapeJsString(config.emailSubject)}',
  CERT_PREFIX: 'JIN-2026-',
  PLACEHOLDERS: {
    NAMA: '${escapeJsString(p.nama)}',
    NO_KP: '${escapeJsString(p.noKp)}',
    EMEL: '${escapeJsString(p.emel)}',
    NO_TELEFON: '${escapeJsString(p.noTelefon)}',
    KATEGORI: '${escapeJsString(p.kategori)}',
    SEKOLAH: '${escapeJsString(p.sekolah)}',
    NEGERI: '${escapeJsString(p.negeri)}',
    TARIKH: '${escapeJsString(p.tarikh)}',
    NO_SIJIL: '${escapeJsString(p.noSijil)}'
  }
};

/**
 * Mengendalikan permintaan GET (Semakan Sijil & Ujian Sambungan).
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';

    if (action === 'ping') {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const sheet = getTargetSheet_(ss);
      const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
      const slideFile = DriveApp.getFileById(CONFIG.SLIDE_TEMPLATE_ID);

      return jsonResponse_({
        ok: true,
        message: 'Sambungan Apps Script, Sheet, Folder Drive dan Slide berjaya disahkan.',
        details: {
          sheetName: ss.getName() + ' (' + sheet.getName() + ')',
          folderName: folder.getName(),
          slideTitle: slideFile.getName(),
          totalRows: Math.max(0, sheet.getLastRow() - 1)
        }
      });
    }

    if (action === 'lookup') {
      const query = String(params.query || '').trim().toLowerCase();
      if (!query) {
        return jsonResponse_({ ok: false, error: 'Sila masukkan emel atau No. Kad Pengenalan.', records: [] });
      }
      const records = findRecords_(query);
      return jsonResponse_({
        ok: true,
        records: records
      });
    }

    return jsonResponse_({ ok: true, message: 'Web App Karnival Jejak Imam Nawawi 2026 aktif.' });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * Mengendalikan permintaan POST daripada sistem Google AI Studio / HTML.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Elakkan pertindihan nombor siri apabila ramai pengunjung mendaftar serentak
    lock.waitLock(25000);

    const payload = parsePayload_(e);
    const nama = cleanUpperOrTitle_(payload.nama);
    const noKp = cleanIc_(payload.noKp);
    const emel = String(payload.emel || '').trim().toLowerCase();
    const noTelefon = String(payload.noTelefon || '').trim();
    const kategori = String(payload.kategori || '').trim();
    const sekolah = String(payload.sekolah || '').trim();
    const negeri = String(payload.negeri || '').trim();

    if (!nama || !noKp || !emel || !kategori || !sekolah) {
      return jsonResponse_({
        ok: false,
        error: 'Maklumat wajib (Nama, No. KP, Emel, Kategori, Sekolah/Institusi) tidak lengkap.'
      });
    }

    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = getTargetSheet_(ss);
    ensureHeaders_(sheet);

    // Semak jika No. KP & Emel yang sama sudah pernah menjana sijil (elak janaan berganda)
    const existing = findExistingByIcAndEmail_(sheet, noKp, emel);
    if (existing && payload.forceNew !== true) {
      // Hantar semula salinan emel jika fail PDF masih wujud
      let resent = false;
      if (existing.pdfFileId) {
        try {
          const pdfFile = DriveApp.getFileById(existing.pdfFileId);
          sendCertificateEmail_(existing.emel, existing.nama, existing.certNo, existing.pdfUrl, pdfFile.getBlob());
          resent = true;
        } catch (mailErr) {
          resent = false;
        }
      }
      return jsonResponse_({
        ok: true,
        duplicate: true,
        message: 'Rekod anda telah didaftarkan sebelum ini. Pautan sijil sedia ada dipaparkan' + (resent ? ' dan salinan telah dihantar semula ke emel anda.' : '.'),
        record: existing
      });
    }

    const nextSeq = Math.max(1, sheet.getLastRow());
    const certNo = CONFIG.CERT_PREFIX + String(nextSeq).padStart(4, '0');
    const tarikh = CONFIG.EVENT_DATE || Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd MMMM yyyy');
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');

    // 1. Jana salinan Slide, ganti placeholder, dan eksport sebagai PDF ke Folder Drive
    const generated = generateCertificatePdf_({
      nama: nama,
      noKp: noKp,
      emel: emel,
      noTelefon: noTelefon,
      kategori: kategori,
      sekolah: sekolah,
      negeri: negeri,
      tarikh: tarikh,
      noSijil: certNo
    });

    // 2. Hantar emel automatik bersama lampiran PDF sijil
    let emailSent = false;
    let emailStatus = 'Berjaya dihantar';
    try {
      sendCertificateEmail_(emel, nama, certNo, generated.pdfUrl, generated.pdfBlob);
      emailSent = true;
    } catch (mailErr) {
      emailSent = false;
      emailStatus = 'Gagal hantar emel: ' + (mailErr && mailErr.message ? mailErr.message : String(mailErr));
    }

    // 3. Simpan rekod ke dalam Google Sheet
    sheet.appendRow([
      timestamp,
      certNo,
      nama,
      noKp,
      emel,
      noTelefon,
      kategori,
      sekolah,
      negeri,
      generated.pdfUrl,
      generated.pdfFileId,
      emailStatus
    ]);

    return jsonResponse_({
      ok: true,
      message: emailSent
        ? 'Pendaftaran berjaya! Sijil PDF telah dijana dan dihantar terus ke emel ' + emel + '.'
        : 'Pendaftaran berjaya dan sijil PDF telah dijana. Anda boleh memuat turun sijil melalui pautan di bawah.',
      record: {
        certNo: certNo,
        nama: nama,
        noKp: noKp,
        emel: emel,
        noTelefon: noTelefon,
        kategori: kategori,
        sekolah: sekolah,
        negeri: negeri,
        tarikh: tarikh,
        pdfUrl: generated.pdfUrl,
        pdfFileId: generated.pdfFileId,
        emailSent: emailSent,
        createdAt: timestamp
      }
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Menjana sijil PDF daripada Slide template dan menyimpannya ke dalam Folder Drive.
 */
function generateCertificatePdf_(data) {
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const templateFile = DriveApp.getFileById(CONFIG.SLIDE_TEMPLATE_ID);

  const safeName = data.nama.replace(/[^a-zA-Z0-9\\s_-]/g, '').trim().replace(/\\s+/g, '_');
  const tempSlideName = 'TEMP_' + data.noSijil + '_' + safeName;
  const copySlideFile = templateFile.makeCopy(tempSlideName, folder);

  try {
    const presentation = SlidesApp.openById(copySlideFile.getId());
    const slides = presentation.getSlides();

    const replacements = [
      [CONFIG.PLACEHOLDERS.NAMA, data.nama],
      [CONFIG.PLACEHOLDERS.NO_KP, data.noKp],
      [CONFIG.PLACEHOLDERS.EMEL, data.emel],
      [CONFIG.PLACEHOLDERS.NO_TELEFON, data.noTelefon || '-'],
      [CONFIG.PLACEHOLDERS.KATEGORI, data.kategori],
      [CONFIG.PLACEHOLDERS.SEKOLAH, data.sekolah],
      [CONFIG.PLACEHOLDERS.NEGERI, data.negeri || '-'],
      [CONFIG.PLACEHOLDERS.TARIKH, data.tarikh],
      [CONFIG.PLACEHOLDERS.NO_SIJIL, data.noSijil]
    ];

    slides.forEach(function(slide) {
      replacements.forEach(function(pair) {
        if (pair[0]) {
          slide.replaceAllText(pair[0], String(pair[1] || ''));
        }
      });
    });

    presentation.saveAndClose();

    const pdfBlob = copySlideFile.getAs(MimeType.PDF);
    const pdfFileName = 'Sijil_' + data.noSijil + '_' + safeName + '.pdf';
    pdfBlob.setName(pdfFileName);

    const pdfFile = folder.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Access.VIEW);

    return {
      pdfFileId: pdfFile.getId(),
      pdfUrl: pdfFile.getUrl(),
      pdfBlob: pdfFile.getBlob()
    };
  } finally {
    // Padam fail Slide sementara supaya folder hanya mengandungi PDF sijil yang kemas
    copySlideFile.setTrashed(true);
  }
}

/**
 * Menghantar emel berserta lampiran sijil PDF kepada peserta.
 */
function sendCertificateEmail_(recipientEmail, nama, certNo, pdfUrl, pdfBlob) {
  const htmlBody = [
    '<div style="font-family: Arial, sans-serif; color: #1c1917; max-width: 600px; line-height: 1.6;">',
    '<h2 style="color: #14532d; margin-bottom: 4px;">' + CONFIG.EVENT_TITLE + '</h2>',
    '<p style="color: #57534e; margin-top: 0;">Pendaftaran &amp; Penjanaan Sijil Rasmi Digital</p>',
    '<hr style="border: none; border-top: 1px solid #e7e5e4; margin: 16px 0;" />',
    '<p>Assalamualaikum w.b.t. dan Salam Sejahtera,</p>',
    '<p>Tahniah dan terima kasih <strong>' + escapeHtml_(nama) + '</strong> atas penyertaan anda dalam <strong>' + CONFIG.EVENT_TITLE + '</strong>.</p>',
    '<p>Bersama-sama emel ini dilampirkan <strong>Sijil Penyertaan (PDF)</strong> rasmi anda. Maklumat rujukan sijil:</p>',
    '<ul style="background: #f5f5f4; padding: 14px 20px; border-radius: 6px; list-style: none;">',
    '<li><strong>No. Siri Sijil:</strong> ' + escapeHtml_(certNo) + '</li>',
    '<li><strong>Nama Penerima:</strong> ' + escapeHtml_(nama) + '</li>',
    '<li><strong>Pautan Salinan Google Drive:</strong> <a href="' + pdfUrl + '" style="color: #14532d;">Muat Turun Sijil PDF</a></li>',
    '</ul>',
    '<p>Sekian, terima kasih.<br/><strong>Urusetia ' + CONFIG.EVENT_TITLE + '</strong></p>',
    '</div>'
  ].join('');

  MailApp.sendEmail({
    to: recipientEmail,
    subject: CONFIG.EMAIL_SUBJECT + ' [' + certNo + ']',
    htmlBody: htmlBody,
    attachments: [pdfBlob]
  });
}

function getTargetSheet_(ss) {
  if (CONFIG.SHEET_NAME) {
    const named = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (named) return named;
  }
  return ss.getSheets()[0];
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Tarikh Daftar',
      'No. Siri Sijil',
      'Nama Penuh',
      'No. KP / Pasport',
      'Emel',
      'No. Telefon',
      'Kategori',
      'Sekolah / Institusi',
      'Negeri',
      'Pautan PDF Sijil',
      'ID Fail PDF',
      'Status Emel'
    ]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }
}

function findRecords_(queryLower) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = getTargetSheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const normalizedQuery = queryLower.replace(/[-\\s]/g, '');
  const matches = [];

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const rowIc = String(row[3] || '').toLowerCase().replace(/[-\\s]/g, '');
    const rowEmail = String(row[4] || '').toLowerCase().trim();
    if (rowEmail === queryLower || rowIc === normalizedQuery) {
      matches.push({
        createdAt: String(row[0] || ''),
        certNo: String(row[1] || ''),
        nama: String(row[2] || ''),
        noKp: String(row[3] || ''),
        emel: String(row[4] || ''),
        noTelefon: String(row[5] || ''),
        kategori: String(row[6] || ''),
        sekolah: String(row[7] || ''),
        negeri: String(row[8] || ''),
        pdfUrl: String(row[9] || ''),
        pdfFileId: String(row[10] || ''),
        emailSent: String(row[11] || '').indexOf('Berjaya') !== -1,
        tarikh: CONFIG.EVENT_DATE
      });
    }
  }
  return matches;
}

function findExistingByIcAndEmail_(sheet, noKp, emel) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const cleanTargetIc = String(noKp).toLowerCase().replace(/[-\\s]/g, '');

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const rowIc = String(row[3] || '').toLowerCase().replace(/[-\\s]/g, '');
    const rowEmail = String(row[4] || '').toLowerCase().trim();
    if (rowIc === cleanTargetIc && rowEmail === emel) {
      return {
        createdAt: String(row[0] || ''),
        certNo: String(row[1] || ''),
        nama: String(row[2] || ''),
        noKp: String(row[3] || ''),
        emel: String(row[4] || ''),
        noTelefon: String(row[5] || ''),
        kategori: String(row[6] || ''),
        sekolah: String(row[7] || ''),
        negeri: String(row[8] || ''),
        pdfUrl: String(row[9] || ''),
        pdfFileId: String(row[10] || ''),
        emailSent: true,
        tarikh: CONFIG.EVENT_DATE
      };
    }
  }
  return null;
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  return (e && e.parameter) ? e.parameter : {};
}

function cleanUpperOrTitle_(str) {
  return String(str || '').trim().replace(/\\s+/g, ' ').toUpperCase();
}

function cleanIc_(str) {
  return String(str || '').trim().toUpperCase();
}

function escapeHtml_(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * JALANKAN FUNGSI INI SEKALI DI EDITOR APPS SCRIPT UNTUK MEMBERI KEBENARAN (AUTHORIZE).
 */
function authorizePermissions() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const slide = SlidesApp.openById(CONFIG.SLIDE_TEMPLATE_ID);
  Logger.log('Sheet: ' + ss.getName());
  Logger.log('Folder: ' + folder.getName());
  Logger.log('Slide: ' + slide.getName());
  Logger.log('Baki kuota emel harian: ' + MailApp.getRemainingDailyQuota());
}

/**
 * FUNGSI BANTUAN: Jalankan untuk melihat semua placeholder teks di dalam Slide template anda.
 */
function debugSlidePlaceholders() {
  const presentation = SlidesApp.openById(CONFIG.SLIDE_TEMPLATE_ID);
  const found = [];
  presentation.getSlides().forEach(function(slide, idx) {
    slide.getShapes().forEach(function(shape) {
      const txt = shape.getText().asString();
      const matches = txt.match(/(\\{\\{.*?\\}\\}|<<.*?>>|\\[\\[.*?\\]\\])/g);
      if (matches) {
        found.push('Slide ' + (idx + 1) + ': ' + matches.join(', '));
      }
    });
  });
  Logger.log(found.length ? found.join('\\n') : 'Tiada placeholder {{...}} / <<...>> ditemui.');
}
`;
}

export function generateStandaloneHtml(config: AppConfig): string {
  const urlPlaceholder = config.appsScriptUrl || 'PASTE_URL_WEB_APP_APPS_SCRIPT_EXEC_DI_SINI';
  return `<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.eventTitle} — ${config.eventSubtitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#FBF9F5] text-[#1C1917] min-h-screen py-10 px-4">
  <div class="max-w-2xl mx-auto bg-white border border-stone-200 rounded-xl p-6 sm:p-10 shadow-sm">
    <p class="text-xs uppercase tracking-widest text-[#14532D] font-semibold">Pendaftaran &amp; Sijil Automatik</p>
    <h1 class="text-3xl font-bold mt-2 text-stone-900">${config.eventTitle}</h1>
    <p class="text-stone-600 mt-1">${config.eventSubtitle} &middot; ${config.eventDate}</p>

    <form id="regForm" class="mt-8 space-y-5">
      <div>
        <label class="block text-sm font-medium text-stone-800 mb-1.5">Nama Penuh (Seperti Dalam Sijil) *</label>
        <input type="text" name="nama" required placeholder="Contoh: AHMAD BIN ABDULLAH"
          class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-800 mb-1.5">No. Kad Pengenalan / Pasport *</label>
          <input type="text" name="noKp" required placeholder="Contoh: 050101-01-1234"
            class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-800 mb-1.5">Alamat Emel (Untuk Penghantaran Sijil) *</label>
          <input type="email" name="emel" required placeholder="nama@emel.com"
            class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-800 mb-1.5">No. Telefon</label>
          <input type="tel" name="noTelefon" placeholder="012-3456789"
            class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-800 mb-1.5">Kategori Penyertaan *</label>
          <select name="kategori" required
            class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]">
            <option value="">-- Pilih Kategori --</option>
            <option>Murid Sekolah Rendah</option>
            <option>Murid Sekolah Menengah</option>
            <option>Guru &amp; Pendidik</option>
            <option>Pelajar IPT / Maahad</option>
            <option>Ibu Bapa &amp; Komuniti Awam</option>
            <option>Urusetia / Pegawai Teknikal</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-800 mb-1.5">Sekolah / Institusi / Agensi *</label>
          <input type="text" name="sekolah" required placeholder="Contoh: SMK Agama Kebangsaan"
            class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-800 mb-1.5">Negeri *</label>
          <select name="negeri" required
            class="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#14532D]">
            <option value="">-- Pilih Negeri --</option>
            <option>Johor</option><option>Kedah</option><option>Kelantan</option><option>Melaka</option>
            <option>Negeri Sembilan</option><option>Pahang</option><option>Perak</option><option>Perlis</option>
            <option>Pulau Pinang</option><option>Sabah</option><option>Sarawak</option><option>Selangor</option>
            <option>Terengganu</option><option>W.P. Kuala Lumpur</option><option>W.P. Labuan</option><option>W.P. Putrajaya</option>
          </select>
        </div>
      </div>

      <button type="submit" id="submitBtn"
        class="w-full py-3 px-6 bg-[#14532D] hover:bg-[#0f3f22] text-white font-semibold rounded-lg text-sm transition-colors">
        Daftar &amp; Jana Sijil ke Emel
      </button>
    </form>

    <div id="statusBox" class="hidden mt-6 p-4 rounded-lg border text-sm"></div>
  </div>

  <script>
    const APPS_SCRIPT_URL = '${escapeJsString(urlPlaceholder)}';
    const form = document.getElementById('regForm');
    const btn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('statusBox');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('https://script.google.com') !== 0) {
        statusBox.className = 'mt-6 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm';
        statusBox.textContent = 'Sila gantikan APPS_SCRIPT_URL dengan URL Web App (.../exec) daripada Google Apps Script terlebih dahulu.';
        statusBox.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sedang menjana sijil & menghantar emel...';
      statusBox.classList.add('hidden');

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        // Guna text/plain supaya browser tidak mencetuskan preflight OPTIONS CORS pada Apps Script
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.ok) {
          statusBox.className = 'mt-6 p-4 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 text-sm';
          statusBox.innerHTML = '<strong>Berjaya!</strong> ' + result.message +
            (result.record && result.record.pdfUrl
              ? '<div class="mt-3"><a href="' + result.record.pdfUrl + '" target="_blank" rel="noopener noreferrer" class="inline-block px-4 py-2 bg-[#14532D] text-white rounded-md font-medium">Muat Turun Sijil PDF (' + result.record.certNo + ')</a></div>'
              : '');
          form.reset();
        } else {
          throw new Error(result.error || 'Ralat berlaku semasa memproses pendaftaran.');
        }
      } catch (err) {
        statusBox.className = 'mt-6 p-4 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm';
        statusBox.textContent = 'Ralat: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Daftar & Jana Sijil ke Emel';
      }
    });
  </script>
</body>
</html>`;
}
