# password-webapp

En liten men “komplex” webbaserad lösenordsgenerator byggd med bara:
- HTML
- CSS
- Vanilla JavaScript

## Kör

1. Öppna `index.html` i din webbläsare.
2. Klicka på **Generera lösenord**.

## Regler

- Max **10** tecken per lösenord.
- Teckenuppsättningar väljs i inställningarna (gemener/versaler/siffror/symboler).
- Kryptografiskt slump (via `crypto.getRandomValues`) och entropi/”styrka”-bedömning visas i UI:t.
- Historik sparas lokalt i din webbläsare (max 20 poster).

