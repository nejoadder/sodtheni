# F1 Live (enkel webapp)

En statisk webapp (HTML/CSS/JS) som hämtar aktuell F1-info från Ergast API (ingen nyckel krävs):

- nästa race (current/next)
- senaste race + topp 10 resultat (current/last)
- förarställning topp 10 för vald säsong

## Kör

### Alternativ A: öppna filen direkt

Öppna `index.html` i webbläsaren.

### Alternativ B: lokal server (rekommenderas)

```powershell
cd C:\Users\nejoa\f1-webapp
py -m http.server 5174
```

Öppna sedan `http://localhost:5174`.

## Datakälla

Ergast Developer API: `https://ergast.com/mrd/`

