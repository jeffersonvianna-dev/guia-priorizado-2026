import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// NOTA: design-system removido temporariamente (Vercel sem GITHUB_TOKEN p/ pacote privado,
// travava os deploys). Re-adicionar após configurar GITHUB_TOKEN no Vercel.
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
