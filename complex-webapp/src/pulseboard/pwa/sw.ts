export function registerServiceWorker(onMessage: (msg: string) => void) {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      if (reg.waiting) onMessage('Offline-stöd aktivt (redo).')
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed') onMessage('Offline-cache uppdaterad.')
        })
      })
    } catch {
      onMessage('Kunde inte starta offline-stöd.')
    }
  })
}

