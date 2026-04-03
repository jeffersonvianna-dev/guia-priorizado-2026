import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import crypto from 'node:crypto'

function devAuthPlugin(env: Record<string, string>): Plugin {
  const COOKIE = 'cms_session'
  const PASSWORD = env['CMS_ADMIN_PASSWORD'] || 'admin123'
  const SECRET   = env['CMS_SESSION_SECRET']  || 'local-dev-secret-32-chars-minimum'

  function sign(payload: string) {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  }
  function buildToken() {
    const now = Date.now()
    const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 1000 * 60 * 60 * 24 * 7 })).toString('base64url')
    return `${payload}.${sign(payload)}`
  }
  function verifyToken(token: string | undefined) {
    if (!token) return false
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return false
    if (sign(payload) !== sig) return false
    try {
      const d = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: number }
      return typeof d.exp === 'number' && d.exp > Date.now()
    } catch { return false }
  }
  function parseCookies(header: string | undefined) {
    const map = new Map<string, string>()
    if (!header) return map
    for (const chunk of header.split(';')) {
      const [k, ...v] = chunk.trim().split('=')
      if (k) map.set(k, v.join('='))
    }
    return map
  }

  return {
    name: 'dev-auth',
    configureServer(server) {
      server.middlewares.use('/api/auth', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json')

        const cookies = parseCookies(req.headers.cookie)
        const authed  = verifyToken(cookies.get(COOKIE))

        if (req.method === 'GET') {
          res.end(JSON.stringify({ ok: true, authenticated: authed }))
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { action, password } = JSON.parse(body) as { action?: string; password?: string }
              if (action === 'login') {
                if (!password) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ ok: false, error: 'Informe a senha do CMS.' }))
                  return
                }
                if (password !== PASSWORD) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ ok: false, error: 'Senha inválida.' }))
                  return
                }
                const token = buildToken()
                res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax`)
                res.end(JSON.stringify({ ok: true, authenticated: true }))
                return
              }
              if (action === 'logout') {
                res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
                res.end(JSON.stringify({ ok: true, authenticated: false }))
                return
              }
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false, error: 'Ação inválida.' }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false, error: 'JSON inválido.' }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devAuthPlugin(env)],
    server: { port: 5174 },
  }
})
