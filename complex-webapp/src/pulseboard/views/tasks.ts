import type { Store } from '../store/store'
import type { Task, TaskPriority, TaskStatus } from '../store/types'
import { nanoid } from '../util/nanoid'
import { formatRelative } from '../util/format'
import { mountTimerPanel } from '../ui/timerPanel'

export function mountTasks({
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
    <div class="row" style="justify-content: space-between; align-items: start; gap: 14px">
      <div class="field" style="flex: 1 1 420px; min-width: 260px">
        <label for="quickTitle">Nytt ärende</label>
        <input id="quickTitle" class="input" placeholder="Titel…" maxlength="90" />
      </div>
      <div class="field" style="flex: 1 1 320px; min-width: 220px">
        <label for="quickTags">Taggar (komma-separerat)</label>
        <input id="quickTags" class="input" placeholder="ex: frontend, bug" />
      </div>
      <div class="field" style="min-width: 160px">
        <label for="quickPrio">Prioritet</label>
        <select id="quickPrio" class="select">
          <option value="low">Low</option>
          <option value="med">Med</option>
          <option value="high">High</option>
        </select>
      </div>
      <div style="padding-top: 20px">
        <button class="btn primary" id="addBtn" type="button">Lägg till</button>
      </div>
    </div>

    <div class="row" style="margin-top: 10px; justify-content: space-between">
      <div class="muted" id="hint">Tips: dra kort mellan kolumner.</div>
      <div class="muted" id="stats"></div>
    </div>

    <div class="row" style="margin-top: 12px; align-items: start">
      ${column('backlog', 'Backlog')}
      ${column('doing', 'Pågår')}
      ${column('done', 'Klart')}
    </div>

    <div class="panel" style="margin-top: 14px">
      <div class="hd">
        <h2>Editor</h2>
        <div class="meta" id="editorMeta">Välj ett ärende</div>
      </div>
      <div class="bd" id="editor"></div>
    </div>
  `

  const quickTitle = root.querySelector<HTMLInputElement>('#quickTitle')!
  const quickTags = root.querySelector<HTMLInputElement>('#quickTags')!
  const quickPrio = root.querySelector<HTMLSelectElement>('#quickPrio')!
  const addBtn = root.querySelector<HTMLButtonElement>('#addBtn')!
  const stats = root.querySelector<HTMLElement>('#stats')!
  const editor = root.querySelector<HTMLElement>('#editor')!
  const editorMeta = root.querySelector<HTMLElement>('#editorMeta')!

  addBtn.addEventListener('click', () => {
    const title = quickTitle.value.trim()
    if (!title) return
    const ts = Date.now()
    const tags = parseTags(quickTags.value)
    const task: Task = {
      id: nanoid(),
      title,
      detail: '',
      status: 'backlog',
      priority: (quickPrio.value as TaskPriority) || 'med',
      tags,
      createdAt: ts,
      updatedAt: ts,
    }
    store.dispatch({ type: 'tasks/upsert', task })
    store.dispatch({ type: 'tasks/select', id: task.id })
    quickTitle.value = ''
    quickTags.value = ''
    quickTitle.focus()
  })

  function onQuickEnter(e: KeyboardEvent) {
    if (e.key === 'Enter') addBtn.click()
  }
  quickTitle.addEventListener('keydown', onQuickEnter)
  quickTags.addEventListener('keydown', onQuickEnter)

  function renderColumns() {
    const s = store.getState()
    const q = s.ui.search.trim().toLowerCase()
    const items = s.tasks.items
      .filter((t) => {
        if (!q) return true
        return (
          t.title.toLowerCase().includes(q) ||
          t.detail.toLowerCase().includes(q) ||
          t.tags.some((x) => x.toLowerCase().includes(q))
        )
      })
      .slice()
      .sort((a, b) => score(b) - score(a) || b.updatedAt - a.updatedAt)

    const counts = { backlog: 0, doing: 0, done: 0 }
    for (const t of items) counts[t.status]++
    stats.textContent = `${items.length} matchar · backlog ${counts.backlog} · pågår ${counts.doing} · klara ${counts.done}`
    setMeta(s.tasks.lastSavedAt ? `Sparat ${formatRelative(s.tasks.lastSavedAt)}` : 'Ännu ej sparat')

    for (const status of ['backlog', 'doing', 'done'] as const) {
      const col = root.querySelector<HTMLElement>(`[data-col="${status}"] .list`)!
      const subset = items.filter((t) => t.status === status)
      col.innerHTML = subset.map((t) => taskCard(t, s.tasks.selectedId === t.id)).join('') || `<div class="muted">—</div>`
    }
  }

  function renderEditor() {
    const s = store.getState()
    const t = s.tasks.items.find((x) => x.id === s.tasks.selectedId) ?? null
    if (!t) {
      editor.innerHTML = `<div class="muted">Välj ett ärende för att redigera.</div>`
      editorMeta.textContent = 'Välj ett ärende'
      return
    }
    editorMeta.textContent = `${t.status} · ${t.priority} · uppdaterad ${formatRelative(t.updatedAt)}`
    editor.innerHTML = `
      <div class="row" style="align-items: start">
        <div class="field" style="flex: 1 1 320px; min-width: 260px">
          <label for="edTitle">Titel</label>
          <input id="edTitle" class="input" value="${escapeAttr(t.title)}" maxlength="90" />
        </div>
        <div class="field" style="min-width: 180px">
          <label for="edStatus">Status</label>
          <select id="edStatus" class="select">
            ${opt('backlog', 'Backlog', t.status)}
            ${opt('doing', 'Pågår', t.status)}
            ${opt('done', 'Klart', t.status)}
          </select>
        </div>
        <div class="field" style="min-width: 180px">
          <label for="edPrio">Prioritet</label>
          <select id="edPrio" class="select">
            ${opt('low', 'Low', t.priority)}
            ${opt('med', 'Med', t.priority)}
            ${opt('high', 'High', t.priority)}
          </select>
        </div>
      </div>
      <div class="field" style="margin-top: 10px">
        <label for="edDetail">Detalj</label>
        <textarea id="edDetail" class="textarea" maxlength="600">${escapeHtml(t.detail)}</textarea>
      </div>
      <div class="row" style="margin-top: 10px; justify-content: space-between">
        <div class="field" style="flex: 1 1 360px; min-width: 260px">
          <label for="edTags">Taggar</label>
          <input id="edTags" class="input" value="${escapeAttr(t.tags.join(', '))}" placeholder="ex: backend, ui" />
        </div>
        <div class="row" style="padding-top: 20px">
          ${t.status !== 'done' ? `<button class="btn primary" id="edDone" type="button">Markera klar</button>` : ''}
          <button class="btn danger" id="edDelete" type="button">Ta bort</button>
        </div>
      </div>
    `

    const edTitle = editor.querySelector<HTMLInputElement>('#edTitle')!
    const edStatus = editor.querySelector<HTMLSelectElement>('#edStatus')!
    const edPrio = editor.querySelector<HTMLSelectElement>('#edPrio')!
    const edDetail = editor.querySelector<HTMLTextAreaElement>('#edDetail')!
    const edTags = editor.querySelector<HTMLInputElement>('#edTags')!

    const flush = () => {
      const ts = Date.now()
      const next: Task = {
        ...t,
        title: edTitle.value.trim() || t.title,
        detail: edDetail.value,
        status: edStatus.value as TaskStatus,
        priority: edPrio.value as TaskPriority,
        tags: parseTags(edTags.value),
        updatedAt: ts,
        completedAt: edStatus.value === 'done' ? t.completedAt ?? ts : undefined,
      }
      store.dispatch({ type: 'tasks/upsert', task: next })
    }

    const onInput = () => flush()
    edTitle.addEventListener('input', onInput)
    edStatus.addEventListener('change', onInput)
    edPrio.addEventListener('change', onInput)
    edDetail.addEventListener('input', onInput)
    edTags.addEventListener('input', onInput)

    const doneBtn = editor.querySelector<HTMLButtonElement>('#edDone')
    doneBtn?.addEventListener('click', () => {
      const ts = Date.now()
      store.dispatch({ type: 'tasks/markDone', id: t.id, ts })
      void store.logWorkEvent({ kind: 'taskDone', taskId: t.id })
    })
    editor.querySelector<HTMLButtonElement>('#edDelete')!.addEventListener('click', () => {
      store.dispatch({ type: 'tasks/delete', id: t.id })
    })
  }

  function onRootClick(e: MouseEvent) {
    const el = e.target as HTMLElement
    const cardBtn = el.closest<HTMLElement>('[data-task]')
    if (cardBtn?.dataset.task) {
      store.dispatch({ type: 'tasks/select', id: cardBtn.dataset.task })
    }
  }

  function onDragStart(e: DragEvent) {
    const el = (e.target as HTMLElement | null)?.closest?.('[data-task]') as HTMLElement | null
    if (!el?.dataset.task) return
    e.dataTransfer?.setData('text/plain', el.dataset.task)
    e.dataTransfer?.setDragImage(el, 10, 10)
  }

  function onDragOver(e: DragEvent) {
    const col = (e.target as HTMLElement | null)?.closest?.('[data-col]') as HTMLElement | null
    if (!col) return
    e.preventDefault()
  }

  function onDrop(e: DragEvent) {
    const col = (e.target as HTMLElement | null)?.closest?.('[data-col]') as HTMLElement | null
    if (!col) return
    e.preventDefault()
    const id = e.dataTransfer?.getData('text/plain')
    const status = col.dataset.col as TaskStatus | undefined
    if (!id || !status) return
    const s = store.getState()
    const t = s.tasks.items.find((x) => x.id === id)
    if (!t || t.status === status) return
    const ts = Date.now()
    store.dispatch({ type: 'tasks/upsert', task: { ...t, status, updatedAt: ts } })
  }

  root.addEventListener('click', onRootClick)
  root.addEventListener('dragstart', onDragStart)
  root.addEventListener('dragover', onDragOver)
  root.addEventListener('drop', onDrop)

  const unsub = store.subscribe(() => {
    renderColumns()
    renderEditor()
  })
  renderColumns()
  renderEditor()

  return () => {
    root.removeEventListener('click', onRootClick)
    root.removeEventListener('dragstart', onDragStart)
    root.removeEventListener('dragover', onDragOver)
    root.removeEventListener('drop', onDrop)
    unsub()
    unTimer?.()
  }
}

function column(status: TaskStatus, label: string) {
  return `
    <div class="panel" data-col="${status}" style="flex: 1 1 0; min-width: 220px">
      <div class="hd">
        <h2>${label}</h2>
        <div class="meta">${status}</div>
      </div>
      <div class="bd">
        <div class="list"></div>
      </div>
    </div>
  `
}

function taskCard(t: Task, selected: boolean) {
  const tags = t.tags.slice(0, 3).map((x) => `<span class="pill">#${escapeHtml(x)}</span>`).join(' ')
  return `
    <div class="card" draggable="true" data-task="${t.id}" style="outline: ${selected ? '2px solid rgba(124,58,237,0.75)' : 'none'}">
      <div class="title">
        <strong>${escapeHtml(t.title)}</strong>
        <span class="pill">${t.priority}</span>
      </div>
      ${t.detail ? `<div class="muted">${escapeHtml(t.detail.slice(0, 120))}</div>` : `<div class="muted">—</div>`}
      <div class="row" style="justify-content: space-between">
        <div class="row" style="gap:6px">${tags}</div>
        <div class="muted">${formatRelative(t.updatedAt)}</div>
      </div>
    </div>
  `
}

function score(t: Task) {
  const p = t.priority === 'high' ? 3 : t.priority === 'med' ? 2 : 1
  const s = t.status === 'doing' ? 2 : t.status === 'backlog' ? 1 : 0
  return p * 10 + s
}

function parseTags(s: string) {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function opt(value: string, label: string, current: string) {
  return `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
function escapeAttr(s: string) {
  return escapeHtml(s).replace(/`/g, '&#96;')
}

