export type Route = {
  id: string
  path: string
  title: string
  mount: (el: HTMLElement) => void | (() => void)
}

type RouterState = { id: string; path: string }

export function createRouter(routes: Route[]) {
  const subs = new Set<(s: RouterState) => void>()

  function normalize(path: string) {
    const u = new URL(path, window.location.origin)
    const p = u.pathname.replace(/\/+$/, '') || '/'
    return p
  }

  function match(pathname: string) {
    const p = normalize(pathname)
    const direct = routes.find((r) => r.path === p)
    return direct ?? routes[0]
  }

  function emit(pathname: string) {
    const r = match(pathname)
    const state: RouterState = { id: r.id, path: r.path }
    for (const cb of subs) cb(state)
  }

  function onLinkClick(e: MouseEvent) {
    const a = (e.target as HTMLElement | null)?.closest?.('a[data-nav="true"]') as HTMLAnchorElement | null
    if (!a) return
    const href = a.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) return
    e.preventDefault()
    go(href)
  }

  function go(path: string) {
    const next = normalize(path)
    window.history.pushState({}, '', next)
    emit(next)
  }

  function start() {
    document.addEventListener('click', onLinkClick)
    window.addEventListener('popstate', () => emit(window.location.pathname))
    emit(window.location.pathname)
  }

  function subscribe(cb: (s: RouterState) => void) {
    subs.add(cb)
    return () => subs.delete(cb)
  }

  return { start, subscribe, go }
}

