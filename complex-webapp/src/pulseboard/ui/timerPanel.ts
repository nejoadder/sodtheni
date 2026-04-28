import type { Store } from '../store/store'
import { formatClock } from '../util/format'

export function mountTimerPanel(root: HTMLElement, store: Store) {
  root.innerHTML = `
    <div class="card">
      <div class="title">
        <strong>Fokus-timer</strong>
        <span class="pill" id="modePill">idle</span>
      </div>
      <div class="row" style="justify-content: space-between">
        <div style="display:grid; gap:4px">
          <div class="pill" id="clock" style="font-size: 14px">00:00</div>
          <div class="muted" id="bound"></div>
        </div>
        <div class="row">
          <button class="btn primary" id="startFocus" type="button">Start</button>
          <button class="btn" id="startBreak" type="button">Paus</button>
          <button class="btn danger" id="stop" type="button">Stop</button>
        </div>
      </div>
    </div>
  `

  const clock = root.querySelector<HTMLElement>('#clock')!
  const modePill = root.querySelector<HTMLElement>('#modePill')!
  const bound = root.querySelector<HTMLElement>('#bound')!
  const startFocus = root.querySelector<HTMLButtonElement>('#startFocus')!
  const startBreak = root.querySelector<HTMLButtonElement>('#startBreak')!
  const stop = root.querySelector<HTMLButtonElement>('#stop')!

  startFocus.addEventListener('click', () => {
    const s = store.getState()
    const seconds = s.settings.focusMinutes * 60
    store.dispatch({ type: 'timer/startFocus', seconds, ts: Date.now(), taskId: s.tasks.selectedId })
    void store.logWorkEvent({ kind: 'focusStart', taskId: s.tasks.selectedId ?? undefined })
  })
  startBreak.addEventListener('click', () => {
    const s = store.getState()
    const seconds = s.settings.breakMinutes * 60
    store.dispatch({ type: 'timer/startBreak', seconds, ts: Date.now() })
  })
  stop.addEventListener('click', () => {
    const s = store.getState()
    if (s.timer.mode !== 'idle') void store.logWorkEvent({ kind: 'focusStop', taskId: s.timer.boundTaskId ?? undefined })
    store.dispatch({ type: 'timer/stop' })
  })

  function render() {
    const s = store.getState()
    modePill.textContent = s.timer.mode
    const remaining = s.timer.endsAt == null ? s.timer.durationSeconds : Math.max(0, Math.ceil((s.timer.endsAt - Date.now()) / 1000))
    clock.textContent = formatClock(remaining)
    const selected = s.tasks.items.find((t) => t.id === (s.timer.mode === 'focus' ? s.timer.boundTaskId : s.tasks.selectedId))
    bound.textContent = selected ? `Ärende: ${selected.title}` : 'Inte kopplad till ärende'
    stop.disabled = s.timer.mode === 'idle'
  }

  const unsub = store.subscribe(render)
  const i = window.setInterval(render, 250)
  render()
  return () => {
    window.clearInterval(i)
    unsub()
  }
}

