import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { configured } from './lib/api.js'
import { ProgressProvider } from './lib/progress.jsx'
import Shell from './components/Shell.jsx'
import Login, { NewPassword } from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import { AreasIndex, AreaPage } from './pages/Areas.jsx'
import { Aventurero, Especialidades, VidaGrupo, Cuaderno, Perfil } from './pages/Simple.jsx'
import Creditos from './pages/Creditos.jsx'
import Revisar from './pages/Revisar.jsx'
import Panel from './pages/Panel.jsx'

function Setup() {
  return (
    <div className="center-screen"><div className="card narrow-card">
      <h2>Falta conectar la base de datos</h2>
      <p>Agrega <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en las variables de entorno de Vercel y vuelve a desplegar. Los pasos están en el README.</p>
    </div></div>
  )
}

// Rutas compartidas: las mismas pantallas sirven al joven y al adulto que revisa.
const pages = (adult) => (
  <Route element={<Shell />}>
    <Route index element={<Home />} />
    <Route path="areas" element={<AreasIndex />} />
    <Route path="areas/:id" element={<AreaPage />} />
    <Route path="aventurero" element={<Aventurero />} />
    <Route path="especialidades" element={<Especialidades />} />
    <Route path="vida-de-grupo" element={<VidaGrupo />} />
    <Route path="creditos" element={<Creditos />} />
    <Route path="cuaderno" element={<Cuaderno />} />
    {adult ? <Route path="revisar" element={<Revisar />} /> : <Route path="perfil" element={<Perfil />} />}
    <Route path="*" element={<Navigate to="." replace />} />
  </Route>
)

function AdultScout() {
  const { uid } = useParams()
  return (
    <ProgressProvider key={uid} userId={uid} mode="adult" base={`/panel/${uid}`}>
      <Routes>{pages(true)}</Routes>
    </ProgressProvider>
  )
}

export default function App() {
  const { user, profile, loading, isAdult } = useAuth()
  if (!configured) return <Setup />
  if (loading) return <div className="center-screen"><div className="spinner" aria-label="Cargando" /></div>
  if (window.location.pathname === '/nueva-clave') return <NewPassword />
  if (!user) return <Login />
  if (isAdult) {
    return (
      <Routes>
        <Route path="/panel" element={<Panel />} />
        <Route path="/panel/:uid/*" element={<AdultScout />} />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    )
  }
  return (
    <ProgressProvider userId={user.id} mode="scout" base="">
      <Routes>{pages(false)}<Route path="/panel/*" element={<Navigate to="/" replace />} /></Routes>
    </ProgressProvider>
  )
}
