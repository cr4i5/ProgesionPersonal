import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'

const UI = createContext(null)
export const useUI = () => useContext(UI)

const CONFETTI = ['#FF6B2C', '#FFC933', '#0E7C86', '#3F8F4E', '#8A5CD6', '#D83F7B']

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [burst, setBurst] = useState(0)
  const id = useRef(0)
  const toast = useCallback((msg, kind = 'ok') => {
    const t = ++id.current
    setToasts(l => [...l.slice(-2), { id: t, msg, kind }])
    setTimeout(() => setToasts(l => l.filter(x => x.id !== t)), 3200)
  }, [])
  const celebrate = useCallback(() => { setBurst(b => b + 1); setTimeout(() => setBurst(0), 2200) }, [])
  return (
    <UI.Provider value={{ toast, celebrate }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'err' ? <AlertCircle size={18} /> : <Check size={18} />} {t.msg}
          </div>
        ))}
      </div>
      {burst > 0 && (
        <div className="confetti" aria-hidden="true" key={burst}>
          {Array.from({ length: 36 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 97) % 100}%`, background: CONFETTI[i % 6], animationDelay: `${(i % 9) * 60}ms`, '--dx': `${((i * 37) % 120) - 60}px`, '--r': `${(i * 53) % 360}deg` }} />
          ))}
        </div>
      )}
    </UI.Provider>
  )
}
