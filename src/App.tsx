import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import Agendas from './pages/Agendas'
import ArtifactCategory from './pages/ArtifactCategory'
import Artifacts from './pages/Artifacts'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Meetings from './pages/Meetings'
import Metrics from './pages/Metrics'
import NotFound from './pages/NotFound'
import Tasks from './pages/Tasks'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/agendas" element={<Agendas />} />
            <Route path="/artifacts" element={<Artifacts />} />
            {/* 4Ups moved out of Artifacts; keep old links working. */}
            <Route path="/artifacts/4ups" element={<Navigate to="/agendas?show=4ups" replace />} />
            <Route path="/artifacts/:category" element={<ArtifactCategory />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
