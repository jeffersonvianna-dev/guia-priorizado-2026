let container: HTMLElement | null = null

function getContainer(): HTMLElement {
  if (!container) {
    container = document.getElementById('toast-root')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toast-root'
      document.body.appendChild(container)
    }
  }
  return container
}

export function toast(msg: string, type: 'ok' | 'err' = 'ok') {
  const c = getContainer()
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  c.appendChild(el)
  setTimeout(() => el.classList.add('fading'), 2700)
  setTimeout(() => el.remove(), 3100)
}
