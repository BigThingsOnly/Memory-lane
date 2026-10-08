import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null) // { title, message, confirmLabel, danger }
  const resolveRef = useRef(null)

  const confirm = useCallback((opts) => {
    setDialog(typeof opts === 'string' ? { message: opts } : opts)
    return new Promise((resolve) => { resolveRef.current = resolve })
  }, [])

  function close(result) {
    setDialog(null)
    resolveRef.current?.(result)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-overlay" onClick={() => close(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{dialog.title || 'Are you sure?'}</h3>
            <p>{dialog.message}</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => close(false)}>Cancel</button>
              <button
                className="btn"
                style={dialog.danger ? { background: '#b3261e' } : undefined}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// Usage: const confirm = useConfirm(); if (await confirm({ message: '...', danger: true })) { ... }
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
