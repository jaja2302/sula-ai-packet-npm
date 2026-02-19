/**
 * Chat ke SULA via WebSocket (Ably): subscribe sula:reply, attach, lalu publish sula:request.
 * Supaya error (mis. 401) dari backend tidak terlewat dan UI tidak loading terus.
 * Memerlukan peer dependency "ably".
 */

import type { AskParams, AskResult } from './types'

const SULA_REQUEST_CHANNEL = 'sula:request'
const SULA_REQUEST_EVENT = 'request'
const SULA_REPLY_CHANNEL = 'sula:reply'
const SULA_REPLY_EVENT = 'reply'
const DEFAULT_TIMEOUT_MS = 120_000

type AblyReply = { requestId: string; reply?: string; error?: string }

export interface CreateAskSulaViaAblyOptions {
  appId: string
  getToken?: () => string | null
  getSulaKey?: () => string | null
  timeoutMs?: number
}

/**
 * Buat fungsi askAssistant yang kirim chat hanya via Ably (subscribe dulu, baru publish).
 * Pasang di root layout dengan env VITE_ABLY_API_KEY dan VITE_SULA_KEY; tidak perlu route/API.
 */
export function createAskSulaViaAbly(
  ablyApiKey: string,
  options: CreateAskSulaViaAblyOptions,
): (params: AskParams) => Promise<AskResult> {
  const { appId, getToken, getSulaKey, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  return async (params: AskParams): Promise<AskResult> => {
    const Ably = (await import('ably')).default
    const requestId = crypto.randomUUID()
    const client = new Ably.Realtime({ key: ablyApiKey })
    const replyChannel = client.channels.get(SULA_REPLY_CHANNEL)

    const resultPromise = new Promise<{ reply: string } | { error: string }>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('SULA tidak merespons dalam waktu yang ditentukan. Coba lagi.'))
      }, timeoutMs)

      function cleanup() {
        clearTimeout(timeoutId)
        replyChannel.unsubscribe(SULA_REPLY_EVENT, onMessage)
        client.close()
      }

      function onMessage(message: { data: unknown }) {
        const data = message.data as AblyReply | undefined
        if (!data || data.requestId !== requestId) return
        cleanup()
        if (data.error != null) resolve({ error: String(data.error) })
        else if (data.reply != null) resolve({ reply: String(data.reply) })
        else resolve({ error: 'Balasan SULA tidak valid.' })
      }

      replyChannel.subscribe(SULA_REPLY_EVENT, onMessage)
    })

    await replyChannel.attach()
    await client.channels.get(SULA_REQUEST_CHANNEL).publish(SULA_REQUEST_EVENT, {
      requestId,
      message: params.message,
      history: params.history ?? [],
      token: params.token ?? (typeof getToken === 'function' ? getToken() : null) ?? undefined,
      app_id: appId,
      sulaKey: params.sulaKey ?? (typeof getSulaKey === 'function' ? getSulaKey() : null) ?? undefined,
    })

    const result = await resultPromise
    if ('error' in result) throw new Error(result.error)
    return { reply: result.reply }
  }
}
