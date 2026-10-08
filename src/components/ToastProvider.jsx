import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const ICONS = { info: 'ℹ️', success: '✅', error: '⚠️' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250)
  }, [])

  const toast = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type, leaving: false }])
    setTimeout(() => dismiss(id), 3500)
  }, [dismiss])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type} ${t.leaving ? 'leaving' : ''}`} onClick={() => dismiss(t.id)}>
            <span className="icon">{ICONS[t.type] || ICONS.info}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Usage: const toast = useToast(); toast('Saved!', 'success')
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
