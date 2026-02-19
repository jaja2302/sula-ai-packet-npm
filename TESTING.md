# Testing sula-ai Lokal Sebelum Publish ke npm

Ada dua cara umum untuk nyobain package ini di project lain tanpa publish dulu.

---

## Cara 1: Pakai `file:` di package.json (paling simpel)

Cocok kalau project yang mau dipakai testing ada dalam satu repo (mis. warehouse-srs).

### 1. Build dulu package sula-ai

```bash
cd sula-ai
npm run build
```

### 2. Di project yang mau testing (mis. warehouse-srs)

Tambahkan dependency pakai path relatif ke folder `sula-ai`:

```json
"dependencies": {
  "sula-ai": "file:../sula-ai"
}
```

Kalau struktur folder kamu:

- `d:\PROJECT\WAREHOUSE SRS\sula-ai\`  ← package
- `d:\PROJECT\WAREHOUSE SRS\warehouse-srs\`  ← project

maka dari **warehouse-srs** path-nya: `file:../sula-ai`.

### 3. Install

```bash
cd warehouse-srs
npm install
```

npm akan meng-copy/link isi folder `sula-ai` (termasuk `dist/`) ke `node_modules/sula-ai`. Pastikan sudah `npm run build` di sula-ai supaya `dist/` ada.

### 4. Pakai di kode

```tsx
import { SulaFab } from 'sula-ai'

// Di layout atau halaman:
<SulaFab
  appId="warehouse"
  title="SULA — Tanya Gudang"
  askAssistant={async ({ message, history, token }) => {
    const result = await askAssistant({ data: { message, history, token, app_id: 'warehouse' } })
    if ('reply' in result) return { reply: result.reply }
    if ('requestId' in result && result.useAbly) return { requestId: result.requestId, useAbly: true }
    throw new Error('Invalid response')
  }}
  getToken={() => getToken()}
  showWhenPathPrefix="/warehouse"
/>
```

Setiap kali kamu ubah kode di **sula-ai**, jalankan lagi `npm run build` di folder sula-ai, lalu di project testing refresh (atau dev server akan hot-reload kalau resolve-nya ke folder asli).

---

## Cara 2: `npm link`

Cocok kalau project testing ada di repo/path lain.

### 1. Di folder sula-ai (setelah build)

```bash
cd sula-ai
npm run build
npm link
```

Ini bikin “global link” ke package sula-ai.

### 2. Di project yang mau testing

```bash
cd path/ke/project-mu
npm link sula-ai
```

Sekarang `node_modules/sula-ai` mengarah ke folder sula-ai-mu. Setiap kali ubah kode, jalankan `npm run build` di sula-ai; project yang pakai akan dapat versi terbaru (sesuai yang di-resolve oleh link).

### 3. Lepas link (kalau sudah selesai testing)

Di project testing:

```bash
npm unlink sula-ai
```

Lalu install versi normal (dari npm atau lagi pakai `file:../sula-ai`).

---

## Ringkasan

| Cara      | Kapan dipakai                          |
|----------|----------------------------------------|
| `file:../sula-ai` | Satu repo, project testing di samping folder sula-ai |
| `npm link`       | Project testing di repo/path lain      |

Sebelum publish ke npm, pastikan:

1. `npm run build` di sula-ai jalan tanpa error.
2. Di project testing, import `SulaFab` / `SulaChatUI` dan FAB + chat jalan (kirim pesan, dapat reply).
3. Kalau pakai `file:`, setelah yakin bisa ganti lagi ke `"sula-ai": "0.1.0"` (atau versi yang kamu publish) lalu `npm install` untuk cek versi dari npm.
