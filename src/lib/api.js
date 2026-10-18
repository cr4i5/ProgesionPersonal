import * as real from './api.supabase.js'
import * as demo from './api.demo.js'
export const DEMO = import.meta.env.VITE_DEMO === 'true'
const impl = DEMO ? demo : real
export const configured = impl.configured
export const auth = impl.auth
export const db = impl.db
