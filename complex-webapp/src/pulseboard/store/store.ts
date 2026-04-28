import type { PulseDb } from '../persistence/db'
import type { Action, AppState, Settings, Task } from './types'
import { reduce } from './reducers'
import { nanoid } from '../util/nanoid'

export type Store = {
  getState: () => AppState
  subscribe: (cb: (s: AppState) => void) => () => void
  dispatch: (a: Action) => void
  persist: () => Promise<void>
  logWorkEvent: (e: { kind: 'focusStart' | 'focusStop' | 'taskDone'; taskId?: string; seconds?: number; ts?: number }) => Promise<void>
  getWorkEventsSince: (since: number) => Promise<import('./types').WorkEvent[]>
  clearAll: () => Promise<void>
}

const DEFAULT_SETTINGS: Settings = {
  version: 1,
  theme: 'system',
  defaultPriority: 'med',
  focusMinutes: 25,
  breakMinutes: 5,
}

function now() {
  return Date.now()
}

function seedTasks(ts: number): Task[] {
  return [
    {
      id: nanoid(),
      title: 'Välkommen! Skapa ett ärende',
      detail: 'Prova att lägga till taggar, byta status och filtrera med sökfältet.',
      status: 'backlog',
      priority: 'med',
      tags: ['intro'],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: nanoid(),
      title: 'Kör ett fokuspass',
      detail: 'Starta timern och koppla den till ett ärende (valfritt).',
      status: 'doing',
      priority: 'high',
      tags: ['focus'],
      createdAt: ts,
      updatedAt: ts,
    },
  ]
}

export async function createStore(db: PulseDb): Promise<Store> {
  const [tasks, settings] = await Promise.all([db.getAllTasks(), db.getSettings()])
  const ts = now()

  const initialTasks = tasks.length ? tasks : seedTasks(ts)
  const initialSettings = settings ?? DEFAULT_SETTINGS

  if (!tasks.length) {
    await Promise.all(initialTasks.map((t) => db.putTask(t)))
    await db.putSettings(initialSettings)
  }

  let state: AppState = {
    nav: { routeId: 'dashboard' },
    ui: { search: '', focusSearchRequested: false, commandPaletteRequested: false },
    tasks: { items: initialTasks, selectedId: initialTasks[0]?.id ?? null, lastSavedAt: null },
    settings: initialSettings,
    timer: { mode: 'idle', endsAt: null, durationSeconds: initialSettings.focusMinutes * 60, boundTaskId: null },
  }

  const subs = new Set<(s: AppState) => void>()

  function notify() {
    for (const cb of subs) cb(state)
  }

  let persistScheduled: number | null = null

  async function persist() {
    const s = state
    await Promise.all([
      db.putSettings(s.settings),
      ...s.tasks.items.map((t) => db.putTask(t)),
    ])
    state = reduce(state, { type: 'tasks/setSavedAt', ts: now() })
    notify()
  }

  function schedulePersist() {
    if (persistScheduled != null) return
    persistScheduled = window.setTimeout(() => {
      persistScheduled = null
      void persist()
    }, 350)
  }

  function dispatch(a: Action) {
    const prev = state
    state = reduce(state, a)
    if (state !== prev) notify()

    if (
      a.type === 'tasks/upsert' ||
      a.type === 'tasks/delete' ||
      a.type === 'tasks/markDone' ||
      a.type === 'settings/set'
    ) {
      schedulePersist()
    }
  }

  window.setInterval(() => dispatch({ type: 'timer/tick' }), 1000)

  return {
    getState: () => state,
    subscribe(cb) {
      subs.add(cb)
      cb(state)
      return () => subs.delete(cb)
    },
    dispatch,
    persist,
    async logWorkEvent(e) {
      const ts = e.ts ?? now()
      await db.addWorkEvent({ id: nanoid(), ts, kind: e.kind, taskId: e.taskId, seconds: e.seconds })
    },
    async getWorkEventsSince(since) {
      return await db.getWorkEvents(since)
    },
    async clearAll() {
      await db.clearAll()
      const ts = now()
      const seeded = seedTasks(ts)
      await Promise.all(seeded.map((t) => db.putTask(t)))
      await db.putSettings(DEFAULT_SETTINGS)
      state = {
        nav: { routeId: 'dashboard' },
        ui: { search: '', focusSearchRequested: false, commandPaletteRequested: false },
        tasks: { items: seeded, selectedId: seeded[0]?.id ?? null, lastSavedAt: null },
        settings: DEFAULT_SETTINGS,
        timer: { mode: 'idle', endsAt: null, durationSeconds: DEFAULT_SETTINGS.focusMinutes * 60, boundTaskId: null },
      }
      notify()
    },
  }
}

