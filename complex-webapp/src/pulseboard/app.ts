import { createRouter, type Route } from './router'
import { createStore } from './store/store'
import { createDb } from './persistence/db'
import { mountDashboard } from './views/dashboard'
import { mountTasks } from './views/tasks'
import { mountInsights } from './views/insights'
import { mountSettings } from './views/settings'
import { mountToasts, toast } from './ui/toast'
import { mountTopbar } from './ui/topbar'
import { registerServiceWorker } from './pwa/sw'

export async function mountApp(root: HTMLElement) {
  const db = await createDb()
  const store = await createStore(db)

  root.innerHTML = `
    <div class="app">
      <header class="topbar" id="topbar"></header>
      <main class="content">
        <section class="panel" aria-label="Primärt innehåll">
          <div class="hd">
            <h2 id="viewTitle">Pulseboard</h2>
            <div class="meta" id="viewMeta"></div>
          </div>
          <div class="bd" id="viewRoot"></div>
        </section>
        <aside class="panel" aria-label="Snabbpanel">
          <div class="hd">
            <h2>Snabbpanel</h2>
            <div class="meta">Genvägar</div>
          </div>
          <div class="bd" id="sideRoot"></div>
        </aside>
      </main>
    </div>
  `

  mountToasts()
  mountTopbar({
    root: root.querySelector('#topbar') as HTMLElement,
    store,
  })

  const viewRoot = root.querySelector('#viewRoot') as HTMLElement
  const sideRoot = root.querySelector('#sideRoot') as HTMLElement
  const viewTitle = root.querySelector('#viewTitle') as HTMLElement
  const viewMeta = root.querySelector('#viewMeta') as HTMLElement

  const routes: Route[] = [
    {
      id: 'dashboard',
      path: '/',
      title: 'Översikt',
      mount: (el) => mountDashboard({ root: el, sideRoot, store, setMeta: (m) => (viewMeta.textContent = m) }),
    },
    {
      id: 'tasks',
      path: '/tasks',
      title: 'Ärenden',
      mount: (el) => mountTasks({ root: el, sideRoot, store, setMeta: (m) => (viewMeta.textContent = m) }),
    },
    {
      id: 'insights',
      path: '/insights',
      title: 'Insikter',
      mount: (el) => mountInsights({ root: el, sideRoot, store, setMeta: (m) => (viewMeta.textContent = m) }),
    },
    {
      id: 'settings',
      path: '/settings',
      title: 'Inställningar',
      mount: (el) => mountSettings({ root: el, sideRoot, store, setMeta: (m) => (viewMeta.textContent = m) }),
    },
  ]

  const router = createRouter(routes)
  const unmounters = new Map<string, () => void>()

  function swapView(routeId: string) {
    const route = routes.find((r) => r.id === routeId) ?? routes[0]
    viewTitle.textContent = route.title
    viewMeta.textContent = ''
    sideRoot.innerHTML = ''
    viewRoot.innerHTML = ''
    unmounters.get('active')?.()
    unmounters.delete('active')
    const unmount = route.mount(viewRoot)
    if (unmount) unmounters.set('active', unmount)
  }

  router.subscribe((route) => {
    store.dispatch({ type: 'nav/navigate', to: route.id })
    swapView(route.id)
  })

  store.subscribe((s) => {
    const titleSuffix = s.nav.routeId === 'dashboard' ? '' : ` · ${routes.find((r) => r.id === s.nav.routeId)?.title ?? ''}`
    document.title = `Pulseboard${titleSuffix}`

    const theme = s.settings.theme
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme === 'system' ? '' : theme
  })

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      store.dispatch({ type: 'ui/focusSearch' })
      toast('Sök: skriv för att filtrera i Ärenden.')
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      store.dispatch({ type: 'ui/openCommandPalette' })
      toast('Tips: Tryck 1–4 för att byta vy.')
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === '1') router.go('/')
      if (e.key === '2') router.go('/tasks')
      if (e.key === '3') router.go('/insights')
      if (e.key === '4') router.go('/settings')
    }
  })

  registerServiceWorker((msg) => toast(msg))
  toast('Redo. Prova 1–4 för vyer.')

  router.start()
}
