const SETTINGS_KEY = "password-webapp.settings.v1";
const HISTORY_KEY = "password-webapp.history.v1";
const THEME_KEY = "password-webapp.theme";

const DEFAULT_SETTINGS = {
  length: 10,
  count: 5,
  useLower: true,
  useUpper: false,
  useDigits: true,
  useSymbols: false,
  avoidAmbiguous: true,
  symbolCustom: "",
};

const baseSymbols = "!@#$%^&*()-_=+[]{};:,.?/~";
const ambiguousChars = new Set(["0", "1", "O", "I", "l"]);

const el = {
  themeToggle: document.getElementById("themeToggle"),
  length: document.getElementById("length"),
  lengthNum: document.getElementById("lengthNum"),
  count: document.getElementById("count"),
  countNum: document.getElementById("countNum"),
  useLower: document.getElementById("useLower"),
  useUpper: document.getElementById("useUpper"),
  useDigits: document.getElementById("useDigits"),
  useSymbols: document.getElementById("useSymbols"),
  avoidAmbiguous: document.getElementById("avoidAmbiguous"),
  symbolInput: document.getElementById("symbolInput"),

  generateBtn: document.getElementById("generateBtn"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  errorBox: document.getElementById("errorBox"),

  results: document.getElementById("results"),
  resultTemplate: document.getElementById("resultTemplate"),

  entropyLabel: document.getElementById("entropyLabel"),
  strengthLabel: document.getElementById("strengthLabel"),
  meterBar: document.getElementById("meterBar"),

  history: document.getElementById("history"),
  historyTemplate: document.getElementById("historyTemplate"),
};

function nowIso() {
  return new Date().toISOString();
}

function showError(msg) {
  el.errorBox.hidden = !msg;
  el.errorBox.textContent = msg ?? "";
}

function clampInt(n, min, max) {
  const x = Number.parseInt(String(n), 10);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      length: clampInt(parsed.length, 1, 10),
      count: clampInt(parsed.count, 1, 10),
      symbolCustom: typeof parsed.symbolCustom === "string" ? parsed.symbolCustom : "",
      avoidAmbiguous: Boolean(parsed.avoidAmbiguous),
      useLower: Boolean(parsed.useLower),
      useUpper: Boolean(parsed.useUpper),
      useDigits: Boolean(parsed.useDigits),
      useSymbols: Boolean(parsed.useSymbols),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.id === "string" && typeof x.password === "string")
      .slice(0, 20);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function loadTheme() {
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" || t === "dark" ? t : null;
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function getPreferredThemeFallback() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  if (!theme) {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

function renderHistory(items) {
  el.history.innerHTML = "";
  if (items.length === 0) return;

  for (const item of items) {
    const node = el.historyTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.querySelector(".histPw").textContent = item.password;
    const when = new Date(item.createdAt);
    const timeText = Number.isNaN(when.getTime()) ? "" : when.toLocaleString();
    node.querySelector(".histTime").textContent = timeText;
    node.querySelector(".histEntropy").textContent = item.entropyBits ? `Entropi: ${Math.round(item.entropyBits)} bits` : "";
    el.history.appendChild(node);
  }
}

function formatEntropyLabel(entropyBits) {
  const bits = entropyBits;
  if (!Number.isFinite(bits)) return { pct: 0, label: "—", bar: 0 };

  // Heuristik (för UI): max längd=10 och typmängd påverkar mycket.
  if (bits < 30) return { pct: 20, label: "Svag", bar: 20 };
  if (bits < 45) return { pct: 45, label: "Okej", bar: 45 };
  if (bits < 60) return { pct: 70, label: "Bra", bar: 70 };
  return { pct: 100, label: "Stark", bar: 100 };
}

function randomInt(maxExclusive) {
  // Kryptografiskt och utan bias (rejection sampling).
  const n = maxExclusive;
  if (!Number.isInteger(n) || n <= 0) throw new Error("maxExclusive must be > 0");

  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % n);

  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    const x = buf[0];
    if (x < limit) return x % n;
  }
}

function uniqueChars(str) {
  const s = String(str ?? "");
  const arr = Array.from(s);
  return Array.from(new Set(arr));
}

function buildPool(settings) {
  let pool = "";
  if (settings.useLower) pool += "abcdefghijklmnopqrstuvwxyz";
  if (settings.useUpper) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (settings.useDigits) pool += "0123456789";
  if (settings.useSymbols) {
    const custom = String(settings.symbolCustom ?? "").trim();
    if (custom.length > 0) {
      pool += custom.replace(/\s+/g, "");
    } else {
      pool += baseSymbols;
    }
  }

  // Ta bort whitespace alltid, även om användaren skriver in custom.
  pool = pool.replace(/\s/g, "");

  let chars = uniqueChars(pool);
  if (settings.avoidAmbiguous) {
    chars = chars.filter((c) => !ambiguousChars.has(c));
  }

  return chars;
}

function estimateEntropyBits(poolSize, length) {
  if (poolSize <= 1) return 0;
  return length * Math.log2(poolSize);
}

function generatePassword(settings) {
  const pool = buildPool(settings);
  if (pool.length === 0) return { password: "", entropyBits: 0, strength: "—" };

  let out = "";
  for (let i = 0; i < settings.length; i++) {
    out += pool[randomInt(pool.length)];
  }

  const entropyBits = estimateEntropyBits(pool.length, settings.length);
  const strength = formatEntropyLabel(entropyBits).label;
  return { password: out, entropyBits, strength };
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // faller tillbaka
  }

  // Fallback: temporärt textarea.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function renderMeter(entropyBits) {
  const info = formatEntropyLabel(entropyBits);
  el.meterBar.style.width = `${info.bar}%`;
  el.entropyLabel.textContent = `Entropi: ${Math.round(entropyBits)} bits`;
  el.strengthLabel.textContent = info.label;
}

function renderResults(items) {
  el.results.innerHTML = "";
  for (const item of items) {
    const node = el.resultTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.querySelector(".pw").textContent = item.password;
    node.querySelector(".pw-entropy").textContent = item.entropyBits ? `Entropi: ${Math.round(item.entropyBits)} bits` : "";
    node.querySelector(".pw-strength").textContent = item.strength;
    el.results.appendChild(node);
  }
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let settings = loadSettings();
let history = loadHistory();

function syncInputsFromSettings() {
  el.length.value = settings.length;
  el.lengthNum.value = settings.length;

  el.count.value = settings.count;
  el.countNum.value = settings.count;

  el.useLower.checked = settings.useLower;
  el.useUpper.checked = settings.useUpper;
  el.useDigits.checked = settings.useDigits;
  el.useSymbols.checked = settings.useSymbols;
  el.avoidAmbiguous.checked = settings.avoidAmbiguous;
  el.symbolInput.value = settings.symbolCustom;
}

function syncSettingsFromInputs() {
  settings = {
    ...settings,
    length: clampInt(el.lengthNum.value, 1, 10),
    count: clampInt(el.countNum.value, 1, 10),
    useLower: el.useLower.checked,
    useUpper: el.useUpper.checked,
    useDigits: el.useDigits.checked,
    useSymbols: el.useSymbols.checked,
    avoidAmbiguous: el.avoidAmbiguous.checked,
    symbolCustom: String(el.symbolInput.value ?? ""),
  };
}

function validateSettings() {
  const pool = buildPool(settings);
  return pool.length > 0;
}

function generateAndRender() {
  syncSettingsFromInputs();
  saveSettings(settings);
  showError(null);

  if (!validateSettings()) {
    showError("Välj minst en teckentyp (gemener, versaler, siffror eller symboler).");
    return;
  }

  const created = nowIso();
  const items = [];
  for (let i = 0; i < settings.count; i++) {
    const generated = generatePassword(settings);
    if (!generated.password) continue;
    items.push({
      id: createId(),
      password: generated.password,
      createdAt: created,
      entropyBits: generated.entropyBits,
      strength: generated.strength,
    });
  }

  if (items.length === 0) {
    showError("Kunde inte generera lösenord med nuvarande inställningar.");
    return;
  }

  // Visa meter baserat på första genererade (samma pool/entropi oftast).
  renderMeter(items[0].entropyBits);
  renderResults(items);

  history = [...items, ...history].slice(0, 20);
  saveHistory(history);
  renderHistory(history);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || getPreferredThemeFallback();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
  el.themeToggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
}

// Wire up UI
el.generateBtn.addEventListener("click", generateAndRender);
el.clearHistoryBtn.addEventListener("click", () => {
  const ok = window.confirm("Rensa hela historiken? Detta går inte att ångra.");
  if (!ok) return;
  history = [];
  saveHistory(history);
  renderHistory(history);
  el.results.innerHTML = "";
  el.meterBar.style.width = "0%";
  el.entropyLabel.textContent = "Entropi: 0 bits";
  el.strengthLabel.textContent = "—";
});

el.history.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const item = e.target.closest("li[data-id]");
  if (!item) return;
  const id = item.dataset.id;
  const action = btn.dataset.action;

  const idx = history.findIndex((h) => h.id === id);
  if (idx === -1) return;

  if (action === "delete") {
    history.splice(idx, 1);
    saveHistory(history);
    renderHistory(history);
    return;
  }

  if (action === "copy") {
    const ok = await copyToClipboard(history[idx].password);
    btn.textContent = ok ? "Kopierat" : "Kunde inte kopiera";
    setTimeout(() => (btn.textContent = "Kopiera"), 1100);
  }
});

el.results.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action !== "copy") return;
  const itemNode = btn.closest("[data-id]");
  if (!itemNode) return;
  const id = itemNode.dataset.id;
  const item = history.find((h) => h.id === id);
  if (!item) return;

  const ok = await copyToClipboard(item.password);
  btn.textContent = ok ? "Kopierat" : "Kunde inte kopiera";
  setTimeout(() => (btn.textContent = "Kopiera"), 1100);
});

// Keep range + number inputs in sync.
function syncLengthFromRange() {
  el.lengthNum.value = el.length.value;
  settings.length = clampInt(el.length.value, 1, 10);
}
function syncLengthFromNumber() {
  settings.length = clampInt(el.lengthNum.value, 1, 10);
  el.length.value = String(settings.length);
}
function syncCountFromRange() {
  el.countNum.value = el.count.value;
  settings.count = clampInt(el.count.value, 1, 10);
}
function syncCountFromNumber() {
  settings.count = clampInt(el.countNum.value, 1, 10);
  el.count.value = String(settings.count);
}

el.length.addEventListener("input", syncLengthFromRange);
el.lengthNum.addEventListener("input", syncLengthFromNumber);
el.count.addEventListener("input", syncCountFromRange);
el.countNum.addEventListener("input", syncCountFromNumber);

el.useSymbols.addEventListener("change", () => {
  // Snabb hjälp: om man avmarkerar symboler rensas inte custom,
  // men det påverkar bara poolen när symboler väljs igen.
  syncSettingsFromInputs();
  saveSettings(settings);
});
el.symbolInput.addEventListener("input", () => {
  settings.symbolCustom = String(el.symbolInput.value ?? "");
  saveSettings(settings);
});
el.useLower.addEventListener("change", () => {
  syncSettingsFromInputs();
  saveSettings(settings);
});
el.useUpper.addEventListener("change", () => {
  syncSettingsFromInputs();
  saveSettings(settings);
});
el.useDigits.addEventListener("change", () => {
  syncSettingsFromInputs();
  saveSettings(settings);
});
el.avoidAmbiguous.addEventListener("change", () => {
  syncSettingsFromInputs();
  saveSettings(settings);
});

// Init
function initTheme() {
  const saved = loadTheme();
  const theme = saved ?? getPreferredThemeFallback();
  applyTheme(theme);
  el.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}

function init() {
  syncInputsFromSettings();
  renderHistory(history);
  el.meterBar.style.width = "0%";
  el.entropyLabel.textContent = "Entropi: 0 bits";
  el.strengthLabel.textContent = "—";

  initTheme();
}

el.themeToggle.addEventListener("click", toggleTheme);
init();

