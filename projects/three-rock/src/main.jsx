import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import AppB from './AppB.jsx'
import AppC from './AppC.jsx'
import AppD from './AppD.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/b" element={<AppB />} />
        <Route path="/c" element={<AppC />} />
        <Route path="/d" element={<AppD />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
