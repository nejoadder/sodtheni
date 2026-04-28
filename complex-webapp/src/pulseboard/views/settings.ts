import type { Store } from '../store/store'
import type { Settings, TaskPriority } from '../store/types'
import { mountTimerPanel } from '../ui/timerPanel'

export function mountSettings({
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
    <div class="panel">
      <div class="hd">
        <h2>App-inställningar</h2>
        <div class="meta">Sparas lokalt</div>
      </div>
      <div class="bd" id="settingsRoot"></div>
    </div>
  `

  const settingsRoot = root.querySelector<HTMLElement>('#settingsRoot')!

  function render() {
    const s = store.getState()
    const st = s.settings
    setMeta(s.tasks.lastSavedAt ? `Senast sparat: ${new Date(s.tasks.lastSavedAt).toLocaleString()}` : 'Ännu ej sparat')
    settingsRoot.innerHTML = `
      <div class="row" style="align-items: start">
        <div class="field" style="min-width: 200px">
          <label for="theme">Tema</label>
          <select id="theme" class="select">
            ${opt('system', 'System', st.theme)}
            ${opt('light', 'Ljust', st.theme)}
            ${opt('dark', 'Mörkt', st.theme)}
          </select>
        </div>
        <div class="field" style="min-width: 220px">
          <label for="prio">Standard-prioritet</label>
          <select id="prio" class="select">
            ${opt('low', 'Low', st.defaultPriority)}
            ${opt('med', 'Med', st.defaultPriority)}
            ${opt('high', 'High', st.defaultPriority)}
          </select>
        </div>
        <div class="field" style="min-width: 160px">
          <label for="focus">Fokus (min)</label>
          <input id="focus" class="input" type="number" min="5" max="90" step="1" value="${st.focusMinutes}" />
        </div>
        <div class="field" style="min-width: 160px">
          <label for="break">Paus (min)</label>
          <input id="break" class="input" type="number" min="1" max="30" step="1" value="${st.breakMinutes}" />
        </div>
      </div>

      <div class="panel" style="margin-top: 14px">
        <div class="hd">
          <h2>Data</h2>
          <div class="meta">Rensa lokalt</div>
        </div>
        <div class="bd">
          <div class="row" style="justify-content: space-between">
            <div>
              <div><strong>Återställ allt</strong></div>
              <div class="muted">Tar bort ärenden, events och inställningar (seedar om 2 demo-ärenden).</div>
            </div>
            <button class="btn danger" id="reset" type="button">Återställ</button>
          </div>
        </div>
      </div>
    `

    const theme = settingsRoot.querySelector<HTMLSelectElement>('#theme')!
    const prio = settingsRoot.querySelector<HTMLSelectElement>('#prio')!
    const focus = settingsRoot.querySelector<HTMLInputElement>('#focus')!
    const brk = settingsRoot.querySelector<HTMLInputElement>('#break')!
    const reset = settingsRoot.querySelector<HTMLButtonElement>('#reset')!

    const commit = () => {
      const next: Settings = {
        version: 1,
        theme: theme.value as Settings['theme'],
        defaultPriority: prio.value as TaskPriority,
        focusMinutes: Number(focus.value || st.focusMinutes),
        breakMinutes: Number(brk.value || st.breakMinutes),
      }
      store.dispatch({ type: 'settings/set', settings: next })
    }
    theme.addEventListener('change', commit)
    prio.addEventListener('change', commit)
    focus.addEventListener('input', commit)
    brk.addEventListener('input', commit)

    reset.addEventListener('click', async () => {
      reset.disabled = true
      await store.clearAll()
      reset.disabled = false
    })
  }

  const unsub = store.subscribe(render)
  render()

  return () => {
    unsub()
    unTimer?.()
  }
}

function opt(value: string, label: string, current: string) {
  return `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`
}

