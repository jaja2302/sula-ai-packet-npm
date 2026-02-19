# sula-ai

Widget FAB (Floating Action Button) + chat untuk **SULA** (Sulung Lab Assistant). Bisa dipasang di berbagai web (Gudang, IoT, dll.) dengan `npm install sula-ai`; backend SULA tetap satu, tiap app pakai `app_id` sendiri.

**UI mandiri** — tidak pakai shadcn, Tailwind, atau Radix; styling pakai inline CSS. Cukup `react` + `react-dom` (peer dependency), jadi install ringan dan tidak bentrok dengan design system project kamu.

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
      askAssistant={async ({ message, history, token, sulaKey }) => {
        const result = await askAssistant({ data: { message, history, token, app_id: 'iot', sulaKey } })
        if ('reply' in result) return { reply: result.reply }
        if ('requestId' in result && result.useAbly) return { requestId: result.requestId, useAbly: true }
        throw new Error('Invalid response')
      }}
      getToken={() => getToken()} // opsional: token ERPDA
      sulaKey={import.meta.env.VITE_SULA_KEY} // API key dari admin SULA (opsional)
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
  askAssistant={async ({ message, history, token, sulaKey }) => {
    const { reply } = await yourServerAsk({ message, history, token, sulaKey })
    return { reply }
  }}
  getToken={() => getToken()}
  sulaKey={import.meta.env.VITE_SULA_KEY}
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
| `sulaKey` | `string` | - | API key SULA (dari admin). Dikirim ke backend; backend harus kirim header `X-Sula-Key` ke SULA. |
| `getSulaKey` | `() => string \| null` | - | Ambil key dinamis (e.g. dari env). Prioritas: `sulaKey` > `getSulaKey()`. |

## Testing lokal sebelum publish

Supaya bisa nyoba dulu di project (mis. warehouse-srs) tanpa publish ke npm:

1. **Build** package: `cd sula-ai` → `npm run build`
2. Di project yang mau testing, di `package.json` tambah: `"sula-ai": "file:../sula-ai"` (sesuaikan path ke folder sula-ai).
3. Jalankan `npm install` di project tersebut, lalu pakai `import { SulaFab } from 'sula-ai'` seperti biasa.

Detail (termasuk opsi `npm link`) ada di [TESTING.md](./TESTING.md).

---

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

---

## sula_key (API key)

Agar web lain (mis. IoT) bisa memanggil SULA tanpa login ERPDA, admin SULA bisa mengeluarkan **API key** (sula_key):

1. **Di server SULA** (AI ASISTENT SRS): di `.env` set `SULA_API_KEYS=key1,key2,...` (pisah koma). Key bisa string acak yang kamu buat (mis. `sk-iot-abc123`).
2. **Di web yang pakai sula-ai**: set env (mis. `VITE_SULA_KEY=sk-iot-abc123`) dan pass ke widget: `sulaKey={import.meta.env.VITE_SULA_KEY}` atau `getSulaKey={() => import.meta.env.VITE_SULA_KEY}`.
3. **Backend web tersebut** saat POST ke SULA harus kirim header: `X-Sula-Key: <key>`. SULA akan cek key; jika cocok dengan salah satu di `SULA_API_KEYS`, request diterima (tanpa perlu Bearer ERPDA).

**Contoh backend (Node)** saat memanggil SULA:

```ts
const res = await fetch(`${SULA_API_URL}/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(sulaKey ? { 'X-Sula-Key': sulaKey } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ message, history, app_id: 'iot' }),
})
```
