const baseSymbols = "!@#$%^&*()-_=+[]{};:,.?/~";
const ambiguousChars = new Set(["0", "1", "O", "I", "l"]);

function uniqueChars(str) {
  return Array.from(new Set(Array.from(String(str ?? ""))));
}

export function buildPool(settings) {
  let pool = "";
  if (settings.useLower) pool += "abcdefghijklmnopqrstuvwxyz";
  if (settings.useUpper) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (settings.useDigits) pool += "0123456789";

  if (settings.useSymbols) {
    const custom = String(settings.symbolCustom ?? "").trim();
    if (custom.length > 0) pool += custom.replace(/\s+/g, "");
    else pool += baseSymbols;
  }

  pool = pool.replace(/\s/g, "");
  let chars = uniqueChars(pool);
  if (settings.avoidAmbiguous) chars = chars.filter((c) => !ambiguousChars.has(c));
  return chars;
}

export function estimateEntropyBits(poolSize, length) {
  if (poolSize <= 1) return 0;
  return length * Math.log2(poolSize);
}

export function strengthFromEntropy(entropyBits) {
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

  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    const x = buf[0];
    if (x < limit) return x % n;
  }
}

export function generatePasswordLocal(settings) {
  const pool = buildPool(settings);
  if (pool.length === 0) return { password: "", entropyBits: 0, strength: "—" };

  let out = "";
  for (let i = 0; i < settings.length; i++) out += pool[randomInt(pool.length)];

  const entropyBits = estimateEntropyBits(pool.length, settings.length);
  const strength = strengthFromEntropy(entropyBits);
  return { password: out, entropyBits, strength };
}

export function normalizeSettings(input) {
  const s = input ?? {};
  return {
    length: Math.max(1, Math.min(10, Number.parseInt(String(s.length ?? 10), 10) || 10)),
    count: Math.max(1, Math.min(10, Number.parseInt(String(s.count ?? 5), 10) || 5)),

    useLower: Boolean(s.useLower),
    useUpper: Boolean(s.useUpper),
    useDigits: Boolean(s.useDigits),
    useSymbols: Boolean(s.useSymbols),

    avoidAmbiguous: s.avoidAmbiguous !== undefined ? Boolean(s.avoidAmbiguous) : true,
    symbolCustom: String(s.symbolCustom ?? ""),
  };
}

export function validateSettings(settings) {
  const pool = buildPool(settings);
  return { ok: pool.length > 0, poolSize: pool.length };
}

