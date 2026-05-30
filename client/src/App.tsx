import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'
import ProtectedRoute from './routes/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import OAuthSuccess from './pages/OAuthSuccess'
import { Toaster } from 'react-hot-toast'
import DocumentList from './pages/DocumentList'
import { useState } from 'react'

function App () {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  return (
    <BrowserRouter>
      <Toaster
        position='top-center'
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff'
          }
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
              <DocumentList
                            onSelect={(doc: any) => {
                              setSelectedDoc(doc);
                            }}
                          />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
