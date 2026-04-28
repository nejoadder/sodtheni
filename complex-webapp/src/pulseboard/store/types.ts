export type TaskStatus = 'backlog' | 'doing' | 'done'
export type TaskPriority = 'low' | 'med' | 'high'

export type Task = {
  id: string
  title: string
  detail: string
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  createdAt: number
  updatedAt: number
  completedAt?: number
}

export type Settings = {
  version: 1
  theme: 'system' | 'light' | 'dark'
  defaultPriority: TaskPriority
  focusMinutes: number
  breakMinutes: number
}

export type WorkEvent = {
  id: string
  ts: number
  kind: 'focusStart' | 'focusStop' | 'taskDone'
  taskId?: string
  seconds?: number
}

export type AppState = {
  nav: { routeId: string }
  ui: {
    search: string
    focusSearchRequested: boolean
    commandPaletteRequested: boolean
  }
  tasks: {
    items: Task[]
    selectedId: string | null
    lastSavedAt: number | null
  }
  settings: Settings
  timer: {
    mode: 'idle' | 'focus' | 'break'
    endsAt: number | null
    durationSeconds: number
    boundTaskId: string | null
  }
}

export type Action =
  | { type: 'nav/navigate'; to: string }
  | { type: 'ui/setSearch'; value: string }
  | { type: 'ui/focusSearch' }
  | { type: 'ui/openCommandPalette' }
  | { type: 'ui/consumeFocusSearch' }
  | { type: 'ui/consumeCommandPalette' }
  | { type: 'tasks/load'; items: Task[] }
  | { type: 'tasks/select'; id: string | null }
  | { type: 'tasks/upsert'; task: Task }
  | { type: 'tasks/delete'; id: string }
  | { type: 'tasks/markDone'; id: string; ts: number }
  | { type: 'tasks/setSavedAt'; ts: number }
  | { type: 'settings/set'; settings: Settings }
  | { type: 'timer/startFocus'; seconds: number; ts: number; taskId: string | null }
  | { type: 'timer/startBreak'; seconds: number; ts: number }
  | { type: 'timer/stop' }
  | { type: 'timer/tick' }

