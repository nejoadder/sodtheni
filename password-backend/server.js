const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "50kb" }));

// Minimal CORS so a browser frontend can call the API directly.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Very small in-memory rate limiter (per IP, 30/min).
const rate = new Map();
const WINDOW_MS = 60_000;
const LIMIT = 30;
function rateLimit(req, res, next) {
  const ip = req.ip || "anon";
  const now = Date.now();
  const cur = rate.get(ip);
  if (!cur || now - cur.windowStart > WINDOW_MS) {
    rate.set(ip, { count: 1, windowStart: now });
    return next();
  }
  if (cur.count >= LIMIT) return res.status(429).json({ error: "Too many requests" });
  cur.count += 1;
  return next();
}

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "password-backend" });
});

const baseSymbols = "!@#$%^&*()-_=+[]{};:,.?/~";
const ambiguousChars = new Set(["0", "1", "O", "I", "l"]);

function clampInt(n, min, max, fallback) {
  const x = Number.parseInt(String(n), 10);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function uniqueChars(str) {
  return Array.from(new Set(Array.from(String(str ?? ""))));
}

function buildPool(s) {
  let pool = "";
  if (s.useLower) pool += "abcdefghijklmnopqrstuvwxyz";
  if (s.useUpper) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (s.useDigits) pool += "0123456789";
  if (s.useSymbols) {
    const custom = String(s.symbolCustom ?? "").trim();
    if (custom.length > 0) {
      pool += custom.replace(/\s+/g, "");
    } else {
      pool += baseSymbols;
    }
  }

  pool = pool.replace(/\s/g, "");
  let chars = uniqueChars(pool);
  if (s.avoidAmbiguous) chars = chars.filter((c) => !ambiguousChars.has(c));
  return chars;
}

function estimateEntropyBits(poolSize, length) {
  if (poolSize <= 1) return 0;
  return length * Math.log2(poolSize);
}

function strengthFromEntropy(entropyBits) {
  // UI-heuristik (matchar frontendens känsla)
  if (!Number.isFinite(entropyBits)) return "—";
  if (entropyBits < 30) return "Svag";
  if (entropyBits < 45) return "Okej";
  if (entropyBits < 60) return "Bra";
  return "Stark";
}

function randomInt(maxExclusive) {
  const n = maxExclusive;
  if (!Number.isInteger(n) || n <= 0) throw new Error("maxExclusive must be > 0");

  // Bias-free rejection sampling.
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % n);

  // crypto.randomBytes + rejection sampling (Node-lösning).
  while (true) {
    const buf = crypto.randomBytes(4);
    const x = buf.readUInt32BE(0);
    if (x < limit) return x % n;
  }
}

function generatePassword(settings) {
  const pool = buildPool(settings);
  if (pool.length === 0) return { password: "", entropyBits: 0, strength: "—" };

  let out = "";
  for (let i = 0; i < settings.length; i++) out += pool[randomInt(pool.length)];

  const entropyBits = estimateEntropyBits(pool.length, settings.length);
  const strength = strengthFromEntropy(entropyBits);
  return { password: out, entropyBits, strength };
}

app.post("/api/password", rateLimit, (req, res) => {
  const body = req.body || {};

  const settings = {
    length: clampInt(body.length, 1, 10, 10),
    count: clampInt(body.count, 1, 10, 1),
    useLower: body.useLower !== undefined ? Boolean(body.useLower) : true,
    useUpper: Boolean(body.useUpper),
    useDigits: body.useDigits !== undefined ? Boolean(body.useDigits) : true,
    useSymbols: Boolean(body.useSymbols),
    avoidAmbiguous: body.avoidAmbiguous !== undefined ? Boolean(body.avoidAmbiguous) : true,
    symbolCustom: typeof body.symbolCustom === "string" ? body.symbolCustom : "",
  };

  const pool = buildPool(settings);
  if (pool.length === 0) {
    return res.status(400).json({
      error: "No valid character pool. Enable at least one of: useLower, useUpper, useDigits, useSymbols.",
    });
  }

  const createdAt = new Date().toISOString();
  const passwords = [];
  for (let i = 0; i < settings.count; i++) {
    const p = generatePassword(settings);
    if (p.password) passwords.push({ password: p.password, entropyBits: p.entropyBits, strength: p.strength });
  }

  return res.json({
    createdAt,
    settingsUsed: {
      length: settings.length,
      count: settings.count,
      useLower: settings.useLower,
      useUpper: settings.useUpper,
      useDigits: settings.useDigits,
      useSymbols: settings.useSymbols,
      avoidAmbiguous: settings.avoidAmbiguous,
      symbolCustomProvided: settings.symbolCustom.trim().length > 0,
    },
    passwords,
  });
});

const port = Number.parseInt(process.env.PORT, 10) || 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`password-backend listening on http://localhost:${port}`);
});

