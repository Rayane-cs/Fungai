import { useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import HeroSection from './components/HeroSection'
import Navbar from './components/Navbar'
import LoadingScreen from './components/LoadingScreen'
import { PageLoader } from './components/Skeleton'
import logo from './assets/logo.webp'

// Lazy load heavy components
const AboutSection = lazy(() => import('./components/AboutSection'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Scan = lazy(() => import('./pages/Scan'))
const History = lazy(() => import('./pages/History'))
const Profile = lazy(() => import('./pages/Profile'))
const ScanReportDebug = lazy(() => import('./pages/ScanReportDebug'))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem('user')
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function Home() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<div className="h-96" />}>
        <AboutSection />
      </Suspense>
    </>
  )
}

function AppContent() {
  const location = useLocation()
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname)
  const hideNavbar = isAuthPage

  return (
    <main className="min-h-screen bg-[#F5F0E6]">
      {!hideNavbar && <Navbar logoSrc={logo} />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/scan-report-debug" element={<ScanReportDebug />} />
                  </Routes>
      </Suspense>
    </main>
  )
}

function App() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <Router>
      {isLoading && <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />}
      <AppContent />
    </Router>
  )
}

export default App
