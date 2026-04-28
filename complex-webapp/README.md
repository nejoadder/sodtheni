# Pulseboard (litet men “komplext”)

En **local-first** mini-app byggd för att vara lagom liten att förstå men ändå innehålla “riktiga” app-delar:

- **Client-side routing** (`/`, `/tasks`, `/insights`, `/settings`)
- **Central store + reducer**
- **Persistence via IndexedDB** (ärenden + events + settings)
- **Offline-stöd** (service worker + manifest)
- **Drag & drop** (flytta ärenden mellan kolumner)
- **Keyboard shortcuts**
  - `1–4` byter vy
  - `/` fokuserar sök (filtrerar ärenden)
  - `Ctrl+K` visar en liten hint/toast (placeholder för command palette)

## Köra

```bash
cd complex-webapp
npm install
npm run dev
```

## Bygga

```bash
npm run build
npm run preview
```

