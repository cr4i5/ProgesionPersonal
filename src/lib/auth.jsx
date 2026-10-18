import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { auth, db } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = cargando
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async u => {
    if (!u) { setProfile(null); return }
    try {
      let p = await db.getProfile(u.id)
      if (!p) { await new Promise(r => setTimeout(r, 600)); p = await db.getProfile(u.id) }
      setProfile(p)
    } catch { setProfile(null) }
  }, [])

  useEffect(() => { auth.init(async u => { setUser(u); await loadProfile(u) }) }, [loadProfile])

  const value = {
    user, profile, loading: user === undefined || (user && !profile),
    isAdult: profile?.role === 'adult',
    signIn: auth.signIn, signUp: auth.signUp, resetPassword: auth.resetPassword, setPassword: auth.setPassword,
    signOut: auth.signOut,
    async updateProfile(patch) { await db.updateProfile(user.id, patch); setProfile(p => ({ ...p, ...patch })) },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
