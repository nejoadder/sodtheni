# Enkel webapp (HTML/CSS/JS)

En liten antecknings-app som:

- kör helt i webbläsaren (ingen serverkod)
- sparar anteckningar i `localStorage`
- har sök, redigera/ta bort, rensa allt och tema-växling

## Kör appen

Öppna `index.html` i en webbläsare.

Om din webbläsare blockar vissa funktioner när man öppnar filer direkt (ovanligt här), kör en enkel lokal server:

### Alternativ A: Python (om du har Python)

```powershell
cd C:\Users\nejoa\simple-webapp
py -m http.server 5173
```

Öppna sedan `http://localhost:5173`.

### Alternativ B: Node (om du har Node)

```powershell
cd C:\Users\nejoa\simple-webapp
npx serve .
```

## Filer

- `index.html` – layout
- `styles.css` – styling
- `app.js` – logik + `localStorage`

