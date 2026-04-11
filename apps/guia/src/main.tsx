import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@jeffersonvianna-dev/design-system/dist/styles.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
