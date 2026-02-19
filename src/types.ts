export type Message = { role: 'user' | 'assistant'; content: string }

export interface AskParams {
  message: string
  history: Array<Message>
  token?: string | null
  /** API key SULA (dari admin). Backend kirim ke SULA sebagai header X-Sula-Key. */
  sulaKey?: string | null
}

export type AskResult =
  | { reply: string }
  | { requestId: string; useAbly: true }

export interface SulaFabProps {
  /** Konteks SULA (warehouse, iot, dll.). Dikirim ke backend kamu. */
  appId: string
  /** Kirim pesan ke SULA; biasanya panggil backend kamu yang POST ke SULA dengan app_id. */
  askAssistant: (params: AskParams) => Promise<AskResult>
  /** Judul dialog. */
  title?: string
  /** Token auth (ERPDA) untuk backend. */
  getToken?: () => string | null
  /** Jika true, askAssistant boleh return { requestId, useAbly: true }; wajib beri waitForAblyReply. */
  useAbly?: boolean
  /** Dipakai bila useAbly === true. */
  waitForAblyReply?: (requestId: string) => Promise<{ reply: string } | { error: string }>
  /** FAB hanya tampil jika pathname dimulai dengan nilai ini (e.g. "/warehouse"). Kosong = selalu tampil. */
  showWhenPathPrefix?: string
  /** Pathname saat ini (dari useLocation() atau window.location.pathname). Untuk sinkron dengan router. */
  pathname?: string
  /** Placeholder input chat. */
  placeholder?: string
  /** API key SULA untuk web ini (dari admin). Dikirim ke backend lalu ke SULA (X-Sula-Key). */
  sulaKey?: string | null
  /** Atau ambil key dinamis (e.g. dari env). Prioritas: sulaKey > getSulaKey(). */
  getSulaKey?: () => string | null
}

export interface SulaChatProps {
  appId: string
  askAssistant: (params: AskParams) => Promise<AskResult>
  getToken?: () => string | null
  useAbly?: boolean
  waitForAblyReply?: (requestId: string) => Promise<{ reply: string } | { error: string }>
  title?: string
  placeholder?: string
  compact?: boolean
}
