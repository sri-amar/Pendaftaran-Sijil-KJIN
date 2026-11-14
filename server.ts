import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {
  ApiLookupResponse,
  ApiRegisterResponse,
  AppConfig,
  AppsScriptPingResponse,
  RegistrationInput,
  RegistrationRecord,
} from './src/types/karnival.ts';
import {DEFAULT_CONFIG} from './src/types/karnival.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, {recursive: true});
}

async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      placeholders: {
        ...DEFAULT_CONFIG.placeholders,
        ...(parsed.placeholders ?? {}),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function writeConfig(config: AppConfig): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

async function readLocalRegistrations(): Promise<RegistrationRecord[]> {
  try {
    const raw = await fs.readFile(REGISTRATIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as RegistrationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendLocalRegistration(record: RegistrationRecord): Promise<void> {
  await ensureDataDir();
  const existing = await readLocalRegistrations();
  const filtered = existing.filter(
    (item) =>
      !(
        item.certNo === record.certNo ||
        (item.noKp.replace(/[-\s]/g, '').toLowerCase() ===
          record.noKp.replace(/[-\s]/g, '').toLowerCase() &&
          item.emel.toLowerCase() === record.emel.toLowerCase())
      ),
  );
  filtered.unshift(record);
  await fs.writeFile(REGISTRATIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
}

function isValidAppsScriptUrl(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://script.google.com/macros/s/') &&
    trimmed.includes('/exec')
  );
}

async function startServer(): Promise<void> {
  const app = express();
  const PORT = 3000;

  app.use(express.json({limit: '1mb'}));

  app.get('/api/config', async (_req, res) => {
    const config = await readConfig();
    res.json({ok: true, config});
  });

  app.post('/api/config', async (req, res) => {
    try {
      const current = await readConfig();
      const body = req.body as Partial<AppConfig>;
      const next: AppConfig = {
        ...current,
        ...body,
        sheetId: String(body.sheetId ?? current.sheetId).trim(),
        folderId: String(body.folderId ?? current.folderId).trim(),
        slideId: String(body.slideId ?? current.slideId).trim(),
        appsScriptUrl: String(body.appsScriptUrl ?? current.appsScriptUrl).trim(),
        placeholders: {
          ...current.placeholders,
          ...(body.placeholders ?? {}),
        },
      };
      await writeConfig(next);
      res.json({ok: true, config: next});
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.',
      });
    }
  });

  app.post('/api/test-apps-script', async (req, res) => {
    try {
      const body = req.body as {appsScriptUrl?: string};
      const config = await readConfig();
      const targetUrl = String(body.appsScriptUrl ?? config.appsScriptUrl ?? '').trim();

      if (!isValidAppsScriptUrl(targetUrl)) {
        const result: AppsScriptPingResponse = {
          ok: false,
          message: 'URL tidak sah.',
          error:
            'Sila masukkan URL Web App Google Apps Script yang sah (bermula dengan https://script.google.com/macros/s/... dan berakhir dengan /exec).',
        };
        res.status(400).json(result);
        return;
      }

      const pingUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=ping`;
      const upstream = await fetch(pingUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      const text = await upstream.text();
      let parsed: AppsScriptPingResponse;
      try {
        parsed = JSON.parse(text) as AppsScriptPingResponse;
      } catch {
        res.status(502).json({
          ok: false,
          message: 'Respons bukan JSON daripada Apps Script.',
          error:
            'Pastikan Web App Apps Script dideploy dengan tetapan "Execute as: Me" dan "Who has access: Anyone".',
        });
        return;
      }

      res.json(parsed);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: 'Gagal menghubungi Apps Script.',
        error: err instanceof Error ? err.message : 'Ralat rangkaian.',
      });
    }
  });

  app.post('/api/register', async (req, res) => {
    try {
      const input = req.body as Partial<RegistrationInput>;
      const nama = String(input.nama ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
      const noKp = String(input.noKp ?? '').trim().toUpperCase();
      const emel = String(input.emel ?? '').trim().toLowerCase();
      const noTelefon = String(input.noTelefon ?? '').trim();
      const kategori = String(input.kategori ?? '').trim();
      const sekolah = String(input.sekolah ?? '').trim();
      const negeri = String(input.negeri ?? '').trim();

      if (!nama || !noKp || !emel || !kategori || !sekolah || !negeri) {
        const errPayload: ApiRegisterResponse = {
          ok: false,
          message: 'Maklumat tidak lengkap.',
          error: 'Sila lengkapkan semua ruangan bertanda wajib (*).',
        };
        res.status(400).json(errPayload);
        return;
      }

      const config = await readConfig();

      // Jika URL Web App Apps Script telah dikonfigurasi, hantar terus ke Google Sheet + Slides + Drive + MailApp
      if (isValidAppsScriptUrl(config.appsScriptUrl)) {
        const upstream = await fetch(config.appsScriptUrl, {
          method: 'POST',
          headers: {'Content-Type': 'text/plain;charset=utf-8'},
          body: JSON.stringify({
            nama,
            noKp,
            emel,
            noTelefon,
            kategori,
            sekolah,
            negeri,
          }),
          redirect: 'follow',
        });

        const rawText = await upstream.text();
        let data: {
          ok?: boolean;
          message?: string;
          error?: string;
          record?: {
            certNo?: string;
            tarikh?: string;
            pdfUrl?: string;
            emailSent?: boolean;
            createdAt?: string;
          };
        };

        try {
          data = JSON.parse(rawText);
        } catch {
          res.status(502).json({
            ok: false,
            message: 'Apps Script memulangkan format tidak dijangka.',
            error:
              'Sila semak deployment Apps Script anda (pastikan akses ditetapkan kepada Anyone dan Code.gs terkini telah disimpan).',
          } satisfies ApiRegisterResponse);
          return;
        }

        if (!data.ok) {
          res.status(400).json({
            ok: false,
            message: 'Gagal memproses pendaftaran di Apps Script.',
            error: data.error || 'Ralat tidak diketahui daripada Apps Script.',
          } satisfies ApiRegisterResponse);
          return;
        }

        const record: RegistrationRecord = {
          nama,
          noKp,
          emel,
          noTelefon,
          kategori,
          sekolah,
          negeri,
          certNo: data.record?.certNo || `JIN-2026-${Date.now().toString().slice(-4)}`,
          tarikh: data.record?.tarikh || config.eventDate,
          pdfUrl: data.record?.pdfUrl || null,
          emailSent: Boolean(data.record?.emailSent),
          mode: 'apps_script',
          createdAt: data.record?.createdAt || new Date().toISOString(),
        };

        await appendLocalRegistration(record);
        res.json({
          ok: true,
          message:
            data.message ||
            'Pendaftaran berjaya dan sijil PDF telah dihantar ke emel anda.',
          record,
        } satisfies ApiRegisterResponse);
        return;
      }

      // Mod Pratonton Tempatan (sebelum pautan Web App Apps Script dimasukkan)
      const existing = await readLocalRegistrations();
      const normalizedIc = noKp.replace(/[-\s]/g, '').toLowerCase();
      const duplicate = existing.find(
        (r) =>
          r.noKp.replace(/[-\s]/g, '').toLowerCase() === normalizedIc &&
          r.emel.toLowerCase() === emel,
      );

      if (duplicate) {
        res.json({
          ok: true,
          message:
            'Rekod pratonton ditemui. Untuk penghantaran PDF automatik ke emel & Google Sheet sebenar, sambungkan URL Web App Apps Script di tab Kod Apps Script.',
          record: duplicate,
        } satisfies ApiRegisterResponse);
        return;
      }

      const seq = String(existing.length + 1).padStart(4, '0');
      const record: RegistrationRecord = {
        nama,
        noKp,
        emel,
        noTelefon,
        kategori,
        sekolah,
        negeri,
        certNo: `JIN-2026-${seq}`,
        tarikh: config.eventDate,
        pdfUrl: null,
        emailSent: false,
        mode: 'preview_local',
        createdAt: new Date().toISOString(),
      };

      await appendLocalRegistration(record);
      res.json({
        ok: true,
        message:
          'Pendaftaran direkodkan dalam Mod Pratonton. Masukkan URL Web App Apps Script (.../exec) di panel Pentadbir untuk menjana sijil Slide ke Drive & menghantar emel automatik.',
        record,
      } satisfies ApiRegisterResponse);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: 'Ralat pelayan semasa mendaftar.',
        error: err instanceof Error ? err.message : 'Ralat tidak diketahui.',
      } satisfies ApiRegisterResponse);
    }
  });

  app.get('/api/lookup', async (req, res) => {
    try {
      const query = String(req.query.query ?? '').trim().toLowerCase();
      if (!query) {
        res.status(400).json({
          ok: false,
          records: [],
          source: 'preview_local',
          error: 'Sila masukkan emel atau No. Kad Pengenalan untuk semakan.',
        } satisfies ApiLookupResponse);
        return;
      }

      const config = await readConfig();
      const normalizedQuery = query.replace(/[-\s]/g, '');

      if (isValidAppsScriptUrl(config.appsScriptUrl)) {
        try {
          const lookupUrl = `${config.appsScriptUrl}${
            config.appsScriptUrl.includes('?') ? '&' : '?'
          }action=lookup&query=${encodeURIComponent(query)}`;
          const upstream = await fetch(lookupUrl, {
            method: 'GET',
            redirect: 'follow',
          });
          const data = (await upstream.json()) as {
            ok?: boolean;
            records?: Array<Partial<RegistrationRecord>>;
          };
          if (data.ok && Array.isArray(data.records)) {
            const mapped: RegistrationRecord[] = data.records.map((r) => ({
              nama: String(r.nama ?? ''),
              noKp: String(r.noKp ?? ''),
              emel: String(r.emel ?? ''),
              noTelefon: String(r.noTelefon ?? ''),
              kategori: String(r.kategori ?? ''),
              sekolah: String(r.sekolah ?? ''),
              negeri: String(r.negeri ?? ''),
              certNo: String(r.certNo ?? ''),
              tarikh: String(r.tarikh ?? config.eventDate),
              pdfUrl: r.pdfUrl ? String(r.pdfUrl) : null,
              emailSent: Boolean(r.emailSent),
              mode: 'apps_script',
              createdAt: String(r.createdAt ?? ''),
            }));
            res.json({
              ok: true,
              records: mapped,
              source: 'apps_script',
            } satisfies ApiLookupResponse);
            return;
          }
        } catch {
          // Fallback to local records if upstream temporarily unreachable
        }
      }

      const local = await readLocalRegistrations();
      const matched = local.filter(
        (r) =>
          r.emel.toLowerCase() === query ||
          r.noKp.toLowerCase().replace(/[-\s]/g, '') === normalizedQuery,
      );

      res.json({
        ok: true,
        records: matched,
        source: 'preview_local',
      } satisfies ApiLookupResponse);
    } catch (err) {
      res.status(500).json({
        ok: false,
        records: [],
        source: 'preview_local',
        error: err instanceof Error ? err.message : 'Gagal membuat semakan.',
      } satisfies ApiLookupResponse);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
