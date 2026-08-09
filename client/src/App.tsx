import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'
import ProtectedRoute from './routes/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import OAuthSuccess from './pages/OAuthSuccess'
import { Toaster } from 'react-hot-toast'
import DocumentsPage from './pages/DocumentsPage'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCurrentUser } from './features/auth/authSlice'
import { useTheme } from './app/ThemeProvider'

function App () {
  const dispatch = useDispatch<any>()
  const user = useSelector((state: any) => state.auth.user)
  const { theme } = useTheme()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position='top-center'
        toastOptions={{
          duration: 4000,
          style: theme === 'dark'
            ? { background: '#333', color: '#fff' }
            : { background: '#fff', color: '#111', border: '1px solid #e5e7eb' }
        }}
      />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/oauth-success' element={<OAuthSuccess />} />
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path='/documents'
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
