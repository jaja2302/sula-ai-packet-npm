import React, { useEffect, useRef, useState } from 'react'
import type { Message, AskParams, AskResult } from './types'

const STORAGE_KEY = 'sula-chat-history'
const MAX_HISTORY_MESSAGES = 20
const DEFAULT_PLACEHOLDER = 'Tanya SULA: barang, stok, request...'
const FRIENDLY_QUOTA_MESSAGE = 'Maaf, tunggu sesaat lagi ya. SULA lagi tidak bisa diakses.'

/** Design tokens — satu palet untuk konsistensi UI/UX */
const tokens = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  bg: '#ffffff',
  bgMuted: '#f8fafc',
  surface: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
  textSoft: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  error: '#dc2626',
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusFull: 9999,
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
  shadowBubble: '0 1px 3px rgba(0,0,0,0.08)',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const

function isQuotaOrRateLimitError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('quota') ||
    lower.includes('exceeded') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limit') ||
    lower.includes('sibuk') ||
    lower.includes('503')
  )
}

function loadStoredMessages(): Array<Message> {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ role: string; content: string }>
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is Message =>
        (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    ).slice(-MAX_HISTORY_MESSAGES)
  } catch {
    return []
  }
}

function saveStoredMessages(messages: Array<Message>) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)))
  } catch {}
}

export interface SulaChatUIProps {
  askAssistant: (params: AskParams) => Promise<AskResult>
  getToken?: () => string | null
  /** API key SULA (prioritas di atas getSulaKey). */
  sulaKey?: string | null
  getSulaKey?: () => string | null
  useAbly?: boolean
  waitForAblyReply?: (requestId: string) => Promise<{ reply: string } | { error: string }>
  title?: string
  placeholder?: string
  compact?: boolean
}

export function SulaChatUI({
  askAssistant,
  getToken,
  sulaKey: sulaKeyProp,
  getSulaKey,
  useAbly,
  waitForAblyReply,
  title = 'SULA — Sulung Lab Assistant',
  placeholder = DEFAULT_PLACEHOLDER,
  compact = false,
}: SulaChatUIProps) {
  const [messages, setMessages] = useState<Array<Message>>(loadStoredMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    saveStoredMessages(messages)
  }, [messages])

  function clearHistory() {
    setMessages([])
    setError(null)
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)
    const recent = messages.slice(-MAX_HISTORY_MESSAGES)
    const newMessages: Array<Message> = [...recent, { role: 'user', content: text }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const history = newMessages.slice(0, -1)
      const token = typeof getToken === 'function' ? getToken() : null
      const sulaKey = sulaKeyProp ?? (typeof getSulaKey === 'function' ? getSulaKey() : null)
      const result = await askAssistant({ message: text, history, token, sulaKey })

      let reply: string
      if ('requestId' in result && result.useAbly) {
        if (!waitForAblyReply) throw new Error('Ably tidak dikonfigurasi (waitForAblyReply).')
        const ablyResult = await waitForAblyReply(result.requestId)
        reply = 'error' in ablyResult ? ablyResult.error : ablyResult.reply
      } else if ('reply' in result) {
        reply = result.reply
      } else {
        throw new Error('Respons asisten tidak valid.')
      }

      setMessages((prev) => [...prev.slice(-MAX_HISTORY_MESSAGES), { role: 'assistant', content: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const displayMessage = isQuotaOrRateLimitError(msg) ? FRIENDLY_QUOTA_MESSAGE : `Maaf, SULA mengalami kesalahan: ${msg}`
      if (!isQuotaOrRateLimitError(msg)) setError(msg)
      setMessages((prev) => [...prev.slice(-MAX_HISTORY_MESSAGES), { role: 'assistant', content: displayMessage }])
    } finally {
      setIsLoading(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    fontFamily: tokens.fontFamily,
  }
  const messagesAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 200,
    background: tokens.bg,
    ...(compact ? { maxHeight: '50vh' } : {}),
  }
  const bubbleBase: React.CSSProperties = {
    maxWidth: '85%',
    borderRadius: tokens.radiusLg,
    padding: '12px 16px',
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxShadow: tokens.shadowBubble,
  }

  const examples = [
    'Barang apa yang stoknya sedikit?',
    'Ada berapa barang yang bisa dipinjam?',
    'Request terbaru apa saja?',
  ]

  return (
    <div style={containerStyle}>
      {messages.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${tokens.border}`, padding: '8px 16px', display: 'flex', justifyContent: 'flex-end', background: tokens.bgMuted }}>
          <button
            type="button"
            onClick={clearHistory}
            disabled={isLoading}
            className="sula-clear-btn"
            style={{ background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: 13, color: tokens.textMuted }}
          >
            🗑 Bersihkan riwayat
          </button>
        </div>
      )}
      <div ref={scrollRef} style={messagesAreaStyle}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: tokens.radiusLg, background: `linear-gradient(135deg, ${tokens.primary}22 0%, ${tokens.primary}11 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              🤖
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 16, color: tokens.text, margin: 0 }}>{title}</p>
              <p style={{ fontSize: 13, color: tokens.textMuted, margin: '6px 0 0 0' }}>Mulai obrolan. Contoh:</p>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, width: '100%', maxWidth: 320 }}>
              {examples.map((q, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13,
                    color: tokens.textMuted,
                    textAlign: 'left',
                    padding: '10px 14px',
                    marginTop: 6,
                    background: tokens.bgMuted,
                    border: `1px solid ${tokens.borderLight}`,
                    borderRadius: tokens.radiusSm,
                  }}
                >
                  • {q}
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
            }}
          >
            {m.role === 'assistant' && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${tokens.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                🤖
              </div>
            )}
            <div
              style={{
                ...bubbleBase,
                ...(m.role === 'user'
                  ? { background: tokens.primaryDark, color: '#fff' }
                  : { background: tokens.surface, color: tokens.text }),
              }}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: tokens.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                👤
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${tokens.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
              🤖
            </div>
            <div style={{ ...bubbleBase, background: tokens.surface, color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="sula-spinner" style={{ width: 18, height: 18, border: `2px solid ${tokens.border}`, borderTopColor: tokens.primary, borderRadius: '50%', flexShrink: 0 }} />
              Memproses...
            </div>
          </div>
        )}
      </div>
      {error && (
        <p style={{ padding: '10px 16px', fontSize: 13, color: tokens.error, background: `${tokens.error}12`, margin: 0, flexShrink: 0 }}>
          {error}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        style={{ flexShrink: 0, display: 'flex', gap: 10, padding: 16, borderTop: `1px solid ${tokens.border}`, background: tokens.bg }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          autoComplete="off"
          className="sula-input"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: tokens.radiusMd,
            border: `1px solid ${tokens.border}`,
            fontSize: 14,
            color: tokens.text,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="sula-send-btn"
          style={{
            width: 48,
            height: 48,
            borderRadius: tokens.radiusMd,
            border: 'none',
            background: isLoading || !input.trim() ? tokens.border : tokens.primaryDark,
            color: '#fff',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ➤
        </button>
      </form>
      <style>{`
        @keyframes sula-spin { to { transform: rotate(360deg); } }
        .sula-spinner { animation: sula-spin 0.7s linear infinite; }
        .sula-input:focus { border-color: ${tokens.primary}; box-shadow: 0 0 0 2px ${tokens.primary}33; }
        .sula-send-btn:not(:disabled):hover { background: ${tokens.primary} !important; filter: brightness(1.05); }
        .sula-clear-btn:hover:not(:disabled) { color: ${tokens.primary}; text-decoration: underline; }
      `}</style>
    </div>
  )
}
