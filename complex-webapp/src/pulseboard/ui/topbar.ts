import type { Store } from '../store/store'

export function mountTopbar({ root, store }: { root: HTMLElement; store: Store }) {
  root.innerHTML = `
    <div class="brand">
      <h1>Pulseboard</h1>
      <span class="badge">local-first</span>
    </div>
    <nav class="nav" aria-label="Navigering">
      <a href="/" data-nav="true" data-route="dashboard">Översikt</a>
      <a href="/tasks" data-nav="true" data-route="tasks">Ärenden</a>
      <a href="/insights" data-nav="true" data-route="insights">Insikter</a>
      <a href="/settings" data-nav="true" data-route="settings">Inställningar</a>
    </nav>
    <div class="actions">
      <input class="input" id="globalSearch" type="search" placeholder="Sök (/)…" aria-label="Sök" style="max-width: 260px" />
      <button class="btn" id="cmdBtn" type="button" title="Kommandon (Ctrl+K)">Ctrl+K</button>
    </div>
  `

  const search = root.querySelector<HTMLInputElement>('#globalSearch')!
  const cmdBtn = root.querySelector<HTMLButtonElement>('#cmdBtn')!
  const navLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[data-route]'))

  search.addEventListener('input', () => store.dispatch({ type: 'ui/setSearch', value: search.value }))
  cmdBtn.addEventListener('click', () => store.dispatch({ type: 'ui/openCommandPalette' }))

  return store.subscribe((s) => {
    for (const a of navLinks) {
      a.dataset.active = String(a.dataset.route === s.nav.routeId)
    }
    if (search.value !== s.ui.search) search.value = s.ui.search
    if (s.ui.focusSearchRequested) {
      search.focus()
      search.select()
      store.dispatch({ type: 'ui/consumeFocusSearch' })
    }
  })
}

