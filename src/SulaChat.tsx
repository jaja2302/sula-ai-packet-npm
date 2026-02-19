import React, { useEffect, useRef, useState } from 'react'
import type { Message, AskParams, AskResult } from './types'

const STORAGE_KEY = 'sula-chat-history'
const MAX_HISTORY_MESSAGES = 20
const DEFAULT_PLACEHOLDER = 'Tanya SULA: barang, stok, request...'
const FRIENDLY_QUOTA_MESSAGE = 'Maaf, tunggu sesaat lagi ya. SULA lagi tidak bisa diakses.'

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
  }
  const messagesAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 200,
    ...(compact ? { maxHeight: '50vh' } : {}),
  }
  const bubbleBase: React.CSSProperties = {
    maxWidth: '85%',
    borderRadius: 16,
    padding: '10px 16px',
    fontSize: 14,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }

  return (
    <div style={containerStyle}>
      {messages.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid #eee', padding: '6px 8px', display: 'flex', justifyContent: 'flex-end', background: '#fafafa' }}>
          <button
            type="button"
            onClick={clearHistory}
            disabled={isLoading}
            style={{ background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: 13, color: '#666' }}
          >
            🗑 Bersihkan riwayat
          </button>
        </div>
      )}
      <div ref={scrollRef} style={messagesAreaStyle}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, color: '#666', textAlign: 'center' }}>
            <span style={{ fontSize: 40 }}>🤖</span>
            <p style={{ fontWeight: 500 }}>{title}</p>
            <p style={{ fontSize: 12 }}>Mulai obrolan. Contoh:</p>
            <ul style={{ fontSize: 12, textAlign: 'left', marginTop: 4, paddingLeft: 20 }}>
              <li>• Barang apa yang stoknya sedikit?</li>
              <li>• Ada berapa barang yang bisa dipinjam?</li>
              <li>• Request terbaru apa saja?</li>
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
            }}
          >
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                🤖
              </div>
            )}
            <div
              style={{
                ...bubbleBase,
                ...(m.role === 'user' ? { background: '#0f172a', color: '#fff' } : { background: '#f1f5f9' }),
              }}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                👤
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              🤖
            </div>
            <div style={{ ...bubbleBase, background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'sula-spin 0.8s linear infinite' }} />
              Memproses...
            </div>
          </div>
        )}
      </div>
      {error && <p style={{ padding: '8px 16px', fontSize: 13, color: '#b91c1c' }}>{error}</p>}
      <form
        onSubmit={handleSubmit}
        style={{ flexShrink: 0, display: 'flex', gap: 8, padding: 16, borderTop: '1px solid #e2e8f0', background: '#fff' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          autoComplete="off"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: isLoading ? '#cbd5e1' : '#0f172a',
            color: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          ➤
        </button>
      </form>
      <style>{`@keyframes sula-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
