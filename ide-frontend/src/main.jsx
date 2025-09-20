import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './components'

createRoot(document.getElementById('root')).render(
  // Temporarily disable StrictMode in development to prevent double effect execution
  // which causes rate limiting issues with the backend API
  import.meta.env.DEV ? <App /> : <StrictMode><App /></StrictMode>
)
