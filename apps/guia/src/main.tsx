import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// NOTA: @jeffersonvianna-dev/design-system removido temporariamente — o build do Vercel
// (conta pessoal) não tem GITHUB_TOKEN p/ instalar o pacote privado, o que travava TODOS
// os deploys desde abr/2026. Re-adicionar (dep + este import) após configurar GITHUB_TOKEN
// nas env vars do projeto Vercel. O index.css próprio já cobre a estilização.
import './index.css'
import App from './App'
import { PasswordGate } from './components/PasswordGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>,
)
