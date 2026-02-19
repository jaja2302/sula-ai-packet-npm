# sula-ai

Widget FAB (Floating Action Button) + chat untuk **SULA** (Sulung Lab Assistant). Bisa dipasang di berbagai web (Gudang, IoT, dll.) dengan `npm install sula-ai`; backend SULA tetap satu, tiap app pakai `app_id` sendiri.

## Ide

- **Backend SULA** tetap satu (service AI ASISTENT SRS). Setiap request chat kirim `app_id` (mis. `warehouse`, `iot`).
- **Package ini** hanya UI: tombol mengambang + dialog berisi chat. Cara “kirim pesan” di-inject dari app yang pakai (masing-masing app punya server/API yang memanggil SULA dengan `app_id`-nya).

Jadi di web IoT cukup:

```bash
npm install sula-ai
```

Lalu pasang komponen dan sambungkan ke backend kamu yang memanggil SULA dengan `app_id: 'iot'`.

## Pemakaian

### 1. Di app (React) yang sudah punya backend ke SULA

Kamu punya server function / API yang menerima `message`, `history`, `token`, dan `app_id`, lalu memanggil SULA (HTTP atau via Ably). Contoh untuk TanStack Start:

```tsx
import { SulaFab } from 'sula-ai'
import { askAssistant } from './api/assistant' // server fn kamu: POST SULA dengan app_id

function App() {
  return (
    <SulaFab
      appId="iot"
      title="SULA — Asisten IoT"
      askAssistant={async ({ message, history, token }) => {
        const result = await askAssistant({ data: { message, history, token, app_id: 'iot' } })
        if ('reply' in result) return { reply: result.reply }
        if ('requestId' in result && result.useAbly) return { requestId: result.requestId, useAbly: true }
        throw new Error('Invalid response')
      }}
      getToken={() => getToken()} // opsional: token ERPDA
      useAbly={true}
      waitForAblyReply={waitForSulaReply} // dari sulaAblyClient; opsional
    />
  )
}
```

### 2. Tanpa Ably (hanya HTTP)

Jika backend kamu langsung HTTP ke SULA dan mengembalikan `reply`:

```tsx
<SulaFab
  appId="warehouse"
  title="SULA — Tanya Gudang"
  askAssistant={async ({ message, history, token }) => {
    const { reply } = await yourServerAsk({ message, history, token })
    return { reply }
  }}
  getToken={() => getToken()}
/>
```

### 3. Props

| Prop | Tipe | Wajib | Keterangan |
|------|------|--------|------------|
| `appId` | `string` | ✅ | Konteks SULA (e.g. `warehouse`, `iot`). Dikirim ke backend kamu. |
| `askAssistant` | `(params) => Promise<{ reply } \| { requestId, useAbly }>` | ✅ | Fungsi yang mengirim pesan ke SULA (biasanya via backend). |
| `title` | `string` | - | Judul dialog. Default: `"SULA — Sulung Lab Assistant"`. |
| `getToken` | `() => string \| null` | - | Token auth (ERPDA) untuk backend. |
| `useAbly` | `boolean` | - | Jika `true`, `askAssistant` boleh return `{ requestId, useAbly: true }` dan pakai `waitForAblyReply`. |
| `waitForAblyReply` | `(requestId) => Promise<{ reply } \| { error }>` | - | Dipakai bila `useAbly === true`. |
| `showWhenPathPrefix` | `string` | - | FAB hanya tampil jika pathname dimulai dengan nilai ini (e.g. `"/warehouse"`). Kosong = selalu tampil. |
| `pathname` | `string` | - | Pathname saat ini (dari `useLocation().pathname`) agar FAB sinkron dengan router. |

## Build & publish (untuk maintainer)

```bash
cd sula-ai
npm install
npm run build
npm publish
```

Setelah publish, di web lain:

```bash
npm install sula-ai
```

## Arsitektur singkat

- **sula-ai**: hanya React component (FAB + Dialog + Chat UI). Tidak punya dependency ke TanStack Start, Ably, atau URL SULA.
- **Masing-masing web**: punya backend (server function / API route) yang memanggil SULA dengan `app_id`-nya. Backend itu yang baca `SULA_API_URL`, `ABLY`, token, dll.
- **SULA (AI ASISTENT SRS)**: satu service; routing tools/konteks berdasarkan `app_id` (warehouse → gudang, iot → nanti modul IoT, dll.).

Ini memungkinkan satu package dipakai di warehouse, IoT, dan app lain tanpa duplikasi UI, dan tanpa hardcode URL/token di package.
