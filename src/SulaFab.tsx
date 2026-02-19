import React, { useMemo, useState, useEffect } from 'react'
import { SulaChatUI } from './SulaChat'
import { createAskSulaViaAbly } from './sulaAbly'
import type { SulaFabProps } from './types'

export function SulaFab({
  appId,
  askAssistant: askAssistantProp,
  ablyApiKey,
  getAblyKey,
  title = 'SULA — Sulung Lab Assistant',
  getToken,
  sulaKey,
  getSulaKey,
  useAbly,
  waitForAblyReply,
  showWhenPathPrefix = '',
  pathname: pathnameProp,
  placeholder,
}: SulaFabProps) {
  const resolvedAblyKey = ablyApiKey ?? (typeof getAblyKey === 'function' ? getAblyKey() : null)
  const askAssistant = useMemo(() => {
    if (resolvedAblyKey) {
      return createAskSulaViaAbly(resolvedAblyKey, { appId, getToken, getSulaKey })
    }
    return askAssistantProp
  }, [resolvedAblyKey, appId, getToken, getSulaKey, askAssistantProp])

  const [open, setOpen] = useState(false)
  const [internalPath, setInternalPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => setInternalPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const pathname = pathnameProp ?? internalPath
  const visible = !showWhenPathPrefix || pathname.startsWith(showWhenPathPrefix)
  if (!visible) return null
  if (!askAssistant) return null

  const primaryDark = '#4f46e5'
  const border = '#e2e8f0'
  const bgMuted = '#f8fafc'
  const textMuted = '#64748b'

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 50,
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: 'none',
    background: primaryDark,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  }
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }
  const dialogStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
    maxWidth: 480,
    width: '100%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }
  const headerStyle: React.CSSProperties = {
    padding: '14px 18px',
    borderBottom: `1px solid ${border}`,
    background: bgMuted,
    fontSize: 17,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#0f172a',
  }
  const closeStyle: React.CSSProperties = {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 22,
    lineHeight: 1,
    color: textMuted,
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sula-fab-btn"
        style={fabStyle}
        aria-label="Buka SULA"
      >
        💬
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sula-dialog-title"
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={headerStyle}>
              <span id="sula-dialog-title">💬 {title}</span>
              <button type="button" className="sula-close-btn" style={closeStyle} onClick={() => setOpen(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <SulaChatUI
                askAssistant={askAssistant}
                getToken={getToken}
                sulaKey={sulaKey}
                getSulaKey={getSulaKey}
                useAbly={!!resolvedAblyKey ? false : useAbly}
                waitForAblyReply={!!resolvedAblyKey ? undefined : waitForAblyReply}
                title={title}
                placeholder={placeholder}
                compact
              />
            </div>
          </div>
        </div>
      )}
      <style>{`
        .sula-fab-btn:hover { filter: brightness(1.08); transform: scale(1.02); }
        .sula-fab-btn:active { transform: scale(0.98); }
        .sula-close-btn:hover { background: rgba(0,0,0,0.06); color: #0f172a; }
      `}</style>
    </>
  )
}
