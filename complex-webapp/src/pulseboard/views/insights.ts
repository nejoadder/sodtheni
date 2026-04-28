import type { Store } from '../store/store'
import { mountTimerPanel } from '../ui/timerPanel'

export function mountInsights({
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
        <h2>Aktivitet senaste 7 dagar</h2>
        <div class="meta" id="meta"></div>
      </div>
      <div class="bd">
        <canvas id="c" width="980" height="260" style="width: 100%; height: 260px"></canvas>
        <div class="row" style="margin-top: 10px; justify-content: space-between">
          <div class="muted" id="legend"></div>
          <button class="btn" id="refresh" type="button">Uppdatera</button>
        </div>
      </div>
    </div>
  `

  const meta = root.querySelector<HTMLElement>('#meta')!
  const legend = root.querySelector<HTMLElement>('#legend')!
  const canvas = root.querySelector<HTMLCanvasElement>('#c')!
  const refresh = root.querySelector<HTMLButtonElement>('#refresh')!

  let alive = true

  async function loadAndRender() {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    const events = await store.getWorkEventsSince(since)
    if (!alive) return

    const day = (ts: number) => {
      const d = new Date(ts)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    const buckets = new Map<number, { focus: number; done: number }>()
    for (let i = 0; i < 7; i++) {
      const t = day(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      buckets.set(t, { focus: 0, done: 0 })
    }
    for (const e of events) {
      const b = buckets.get(day(e.ts))
      if (!b) continue
      if (e.kind === 'focusStart') b.focus++
      if (e.kind === 'taskDone') b.done++
    }

    const labels = Array.from(buckets.keys()).sort((a, b) => a - b)
    const series = labels.map((k) => buckets.get(k)!)
    const focusMax = Math.max(1, ...series.map((x) => x.focus))
    const doneMax = Math.max(1, ...series.map((x) => x.done))

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    const pad = 18
    const innerW = w - pad * 2
    const innerH = h - pad * 2
    const colW = innerW / series.length

    const bg = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || 'rgba(0,0,0,0.08)'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const grid = 'rgba(255,255,255,0.10)'
    ctx.strokeStyle = grid
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad + (innerH * i) / 4
      ctx.beginPath()
      ctx.moveTo(pad, y)
      ctx.lineTo(w - pad, y)
      ctx.stroke()
    }

    const focusColor = 'rgba(124,58,237,0.85)'
    const doneColor = 'rgba(34,197,94,0.75)'
    for (let i = 0; i < series.length; i++) {
      const x0 = pad + i * colW + 10
      const bw = colW - 20
      const fH = Math.round((series[i].focus / focusMax) * (innerH * 0.75))
      const dH = Math.round((series[i].done / doneMax) * (innerH * 0.75))

      ctx.fillStyle = focusColor
      ctx.fillRect(x0, pad + innerH - fH, Math.max(6, bw * 0.55), fH)

      ctx.fillStyle = doneColor
      ctx.fillRect(x0 + bw * 0.62, pad + innerH - dH, Math.max(6, bw * 0.35), dH)

      ctx.fillStyle = 'rgba(255,255,255,0.70)'
      ctx.font = '12px ui-monospace, Consolas, monospace'
      const d = new Date(labels[i])
      const lab = `${d.getMonth() + 1}/${d.getDate()}`
      ctx.fillText(lab, x0, h - 6)
    }

    const focusTotal = series.reduce((a, b) => a + b.focus, 0)
    const doneTotal = series.reduce((a, b) => a + b.done, 0)
    legend.textContent = `Fokuspass: ${focusTotal} · Avklarade: ${doneTotal}`
    meta.textContent = `${events.length} events`
    setMeta('Baserat på lokala events')
  }

  refresh.addEventListener('click', () => void loadAndRender())
  void loadAndRender()

  return () => {
    alive = false
    unTimer?.()
  }
}

