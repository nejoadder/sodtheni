let root: HTMLElement | null = null
let timeout: number | null = null

export function mountToasts() {
  if (root) return
  root = document.createElement('div')
  root.id = 'toast'
  root.style.display = 'none'
  root.className = 'toast'
  document.body.appendChild(root)
}

export function toast(message: string, ms = 2200) {
  if (!root) mountToasts()
  if (!root) return
  root.textContent = message
  root.style.display = 'block'
  if (timeout != null) window.clearTimeout(timeout)
  timeout = window.setTimeout(() => {
    if (!root) return
    root.style.display = 'none'
  }, ms)
}

