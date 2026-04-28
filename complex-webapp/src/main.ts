import './style.css'
import { mountApp } from './pulseboard/app'

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('Missing #app root')

mountApp(root).catch((err) => {
  console.error(err)
  root.innerHTML = `
    <div class="fatal">
      <h1>Något gick fel</h1>
      <pre>${String(err instanceof Error ? err.stack ?? err.message : err)}</pre>
    </div>
  `
})
