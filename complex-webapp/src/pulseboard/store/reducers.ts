import type { Action, AppState, Task } from './types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function uniqTags(tags: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of tags.map((x) => x.trim()).filter(Boolean)) {
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function upsert(items: Task[], task: Task) {
  const idx = items.findIndex((t) => t.id === task.id)
  if (idx === -1) return [task, ...items]
  const next = items.slice()
  next[idx] = task
  return next
}

export function reduce(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'nav/navigate':
      return { ...s, nav: { routeId: a.to } }
    case 'ui/setSearch':
      return { ...s, ui: { ...s.ui, search: a.value } }
    case 'ui/focusSearch':
      return { ...s, ui: { ...s.ui, focusSearchRequested: true } }
    case 'ui/openCommandPalette':
      return { ...s, ui: { ...s.ui, commandPaletteRequested: true } }
    case 'ui/consumeFocusSearch':
      return { ...s, ui: { ...s.ui, focusSearchRequested: false } }
    case 'ui/consumeCommandPalette':
      return { ...s, ui: { ...s.ui, commandPaletteRequested: false } }
    case 'tasks/load':
      return { ...s, tasks: { ...s.tasks, items: a.items } }
    case 'tasks/select':
      return { ...s, tasks: { ...s.tasks, selectedId: a.id } }
    case 'tasks/upsert': {
      const task = { ...a.task, tags: uniqTags(a.task.tags) }
      return { ...s, tasks: { ...s.tasks, items: upsert(s.tasks.items, task) } }
    }
    case 'tasks/delete':
      return {
        ...s,
        tasks: {
          ...s.tasks,
          items: s.tasks.items.filter((t) => t.id !== a.id),
          selectedId: s.tasks.selectedId === a.id ? null : s.tasks.selectedId,
        },
      }
    case 'tasks/markDone': {
      const t = s.tasks.items.find((x) => x.id === a.id)
      if (!t) return s
      const next: Task = { ...t, status: 'done', completedAt: a.ts, updatedAt: a.ts }
      return { ...s, tasks: { ...s.tasks, items: upsert(s.tasks.items, next) } }
    }
    case 'tasks/setSavedAt':
      return { ...s, tasks: { ...s.tasks, lastSavedAt: a.ts } }
    case 'settings/set': {
      const st = a.settings
      const focus = clamp(st.focusMinutes, 5, 90) * 60
      const timer =
        s.timer.mode === 'idle'
          ? { ...s.timer, durationSeconds: focus }
            : s.timer
      return { ...s, settings: st, timer }
    }
    case 'timer/startFocus':
      return {
        ...s,
        timer: {
          mode: 'focus',
          endsAt: a.ts + a.seconds * 1000,
          durationSeconds: a.seconds,
          boundTaskId: a.taskId,
        },
      }
    case 'timer/startBreak':
      return {
        ...s,
        timer: {
          mode: 'break',
          endsAt: a.ts + a.seconds * 1000,
          durationSeconds: a.seconds,
          boundTaskId: null,
        },
      }
    case 'timer/stop':
      return { ...s, timer: { ...s.timer, mode: 'idle', endsAt: null, boundTaskId: null } }
    case 'timer/tick': {
      if (s.timer.mode === 'idle' || s.timer.endsAt == null) return s
      if (Date.now() < s.timer.endsAt) return s
      return { ...s, timer: { ...s.timer, endsAt: null, mode: 'idle', boundTaskId: null } }
    }
    default:
      return s
  }
}

