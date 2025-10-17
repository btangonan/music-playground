import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoopLabView from './views/LoopLabView'
import { SongArrangementView } from './views/SongArrangementView'
import { ToastProvider } from './components/ToastContext'

// Authentication disabled for local development
// To re-enable: uncomment AuthProvider, useAuth, LoginView, SignupView imports
// and wrap routes with ProtectedRoute

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoopLabView />} />
          <Route path="/song" element={<SongArrangementView />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
