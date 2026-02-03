import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Log4netMonitor from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Log4netMonitor />
  </StrictMode>,
)
