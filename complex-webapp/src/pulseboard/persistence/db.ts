import type { Task, Settings, WorkEvent } from '../store/types'

const DB_NAME = 'pulseboard'
const DB_VERSION = 1

export type PulseDb = {
  getAllTasks: () => Promise<Task[]>
  putTask: (t: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getSettings: () => Promise<Settings | null>
  putSettings: (s: Settings) => Promise<void>
  addWorkEvent: (e: WorkEvent) => Promise<void>
  getWorkEvents: (since: number) => Promise<WorkEvent[]>
  clearAll: () => Promise<void>
}

function reqToPromise<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export async function createDb(): Promise<PulseDb> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('tasks')) {
        const s = db.createObjectStore('tasks', { keyPath: 'id' })
        s.createIndex('status', 'status', { unique: false })
        s.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('workEvents')) {
        const s = db.createObjectStore('workEvents', { keyPath: 'id' })
        s.createIndex('ts', 'ts', { unique: false })
      }
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error ?? new Error('Failed opening IndexedDB'))
  })

  return {
    async getAllTasks() {
      const tx = db.transaction(['tasks'], 'readonly')
      const s = tx.objectStore('tasks')
      const res = await reqToPromise<Task[]>(s.getAll())
      await txDone(tx)
      return res
    },
    async putTask(t) {
      const tx = db.transaction(['tasks'], 'readwrite')
      tx.objectStore('tasks').put(t)
      await txDone(tx)
    },
    async deleteTask(id) {
      const tx = db.transaction(['tasks'], 'readwrite')
      tx.objectStore('tasks').delete(id)
      await txDone(tx)
    },
    async getSettings() {
      const tx = db.transaction(['settings'], 'readonly')
      const s = tx.objectStore('settings')
      const res = await reqToPromise<{ key: 'settings'; value: Settings } | undefined>(s.get('settings'))
      await txDone(tx)
      return res?.value ?? null
    },
    async putSettings(settings) {
      const tx = db.transaction(['settings'], 'readwrite')
      tx.objectStore('settings').put({ key: 'settings', value: settings })
      await txDone(tx)
    },
    async addWorkEvent(e) {
      const tx = db.transaction(['workEvents'], 'readwrite')
      tx.objectStore('workEvents').put(e)
      await txDone(tx)
    },
    async getWorkEvents(since) {
      const tx = db.transaction(['workEvents'], 'readonly')
      const s = tx.objectStore('workEvents')
      const idx = s.index('ts')
      const range = IDBKeyRange.lowerBound(since)
      const res = await reqToPromise<WorkEvent[]>(idx.getAll(range))
      await txDone(tx)
      return res
    },
    async clearAll() {
      const tx = db.transaction(['tasks', 'settings', 'workEvents'], 'readwrite')
      tx.objectStore('tasks').clear()
      tx.objectStore('settings').clear()
      tx.objectStore('workEvents').clear()
      await txDone(tx)
    },
  }
}

