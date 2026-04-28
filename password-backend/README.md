# password-backend

Express-backend som exponerar ett API för att generera lösenord med max 10 tecken.

## Kör lokalt

1. `cd password-backend`
2. `npm install`
3. `npm start`

Servern kör på `http://localhost:3001`.

## API

### `POST /api/password`

Body (JSON):
```json
{
  "length": 10,
  "count": 3,
  "useLower": true,
  "useUpper": false,
  "useDigits": true,
  "useSymbols": false,
  "avoidAmbiguous": true,
  "symbolCustom": ""
}
```

Svar:
```json
{
  "createdAt": "...",
  "settingsUsed": { "...": "..." },
  "passwords": [
    { "password": "…", "entropyBits": 58.3, "strength": "Bra" }
  ]
}
```

## `GET /health`

Snabb healthcheck.

