import type { Store } from '../store/store'
import { mountTimerPanel } from '../ui/timerPanel'
import { formatRelative } from '../util/format'

export function mountDashboard({
  root,
  sideRoot,
  store,
  setMeta,
}: {
  root: HTMLElement
  sideRoot: HTMLElement
  store: Store
  setMeta: (m: string) => void
}) {
  sideRoot.innerHTML = ''
  const unTimer = mountTimerPanel(sideRoot, store)

  root.innerHTML = `
    <div class="kpi" id="kpi"></div>
    <div class="row" style="margin-top: 12px; align-items: start">
      <div class="panel" style="width: 100%">
        <div class="hd">
          <h2>Senaste ändringar</h2>
          <div class="meta">Local-first</div>
        </div>
        <div class="bd">
          <div class="list" id="recent"></div>
        </div>
      </div>
    </div>
  `

  const kpi = root.querySelector('#kpi') as HTMLElement
  const recent = root.querySelector('#recent') as HTMLElement

  function render() {
    const s = store.getState()
    const items = s.tasks.items
    const done = items.filter((t) => t.status === 'done').length
    const doing = items.filter((t) => t.status === 'doing').length
    const backlog = items.filter((t) => t.status === 'backlog').length
    setMeta(s.tasks.lastSavedAt ? `Sparat ${formatRelative(s.tasks.lastSavedAt)}` : 'Ännu ej sparat')

    kpi.innerHTML = `
      <div class="box"><div class="n">${doing}</div><div class="l">pågår</div></div>
      <div class="box"><div class="n">${backlog}</div><div class="l">backlog</div></div>
      <div class="box"><div class="n">${done}</div><div class="l">klara</div></div>
    `

    const sorted = items.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
    recent.innerHTML =
      sorted
        .map(
          (t) => `
            <div class="card">
              <div class="title">
                <strong>${escapeHtml(t.title)}</strong>
                <span class="pill">${t.status} · ${t.priority}</span>
              </div>
              <div class="muted">${escapeHtml(t.detail || '—')}</div>
              <div class="muted">${formatRelative(t.updatedAt)}</div>
              <div class="row">
                <button class="btn" data-open="${t.id}" type="button">Öppna</button>
                ${t.status !== 'done' ? `<button class="btn primary" data-done="${t.id}" type="button">Markera klar</button>` : ''}
              </div>
            </div>
          `,
        )
        .join('') || `<div class="muted">Inga ärenden ännu.</div>`
  }

  function onClick(e: MouseEvent) {
    const t = e.target as HTMLElement
    const open = t.closest<HTMLButtonElement>('button[data-open]')
    if (open) {
      store.dispatch({ type: 'tasks/select', id: open.dataset.open ?? null })
      window.history.pushState({}, '', '/tasks')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }
    const done = t.closest<HTMLButtonElement>('button[data-done]')
    if (done?.dataset.done) {
      const ts = Date.now()
      store.dispatch({ type: 'tasks/markDone', id: done.dataset.done, ts })
      void store.logWorkEvent({ kind: 'taskDone', taskId: done.dataset.done })
      return
    }
  }

  root.addEventListener('click', onClick)
  const unsub = store.subscribe(render)
  render()

  return () => {
    root.removeEventListener('click', onClick)
    unsub()
    unTimer?.()
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

