const STORAGE_KEY = "simple-webapp.notes.v1";
const THEME_KEY = "simple-webapp.theme";

function nowIso() {
  return new Date().toISOString();
}

function formatRelative(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => n && typeof n.id === "string" && typeof n.text === "string")
      .map((n) => ({
        id: n.id,
        text: n.text,
        createdAt: typeof n.createdAt === "string" ? n.createdAt : nowIso(),
        updatedAt: typeof n.updatedAt === "string" ? n.updatedAt : nowIso(),
      }));
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadTheme() {
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" || t === "dark" ? t : null;
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function applyTheme(theme) {
  if (!theme) {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

function getPreferredThemeFallback() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

const el = {
  form: document.getElementById("noteForm"),
  text: document.getElementById("noteText"),
  list: document.getElementById("noteList"),
  template: document.getElementById("noteItemTemplate"),
  empty: document.getElementById("emptyState"),
  stats: document.getElementById("stats"),
  search: document.getElementById("search"),
  clearAll: document.getElementById("clearAll"),
  charCount: document.getElementById("charCount"),
  themeToggle: document.getElementById("themeToggle"),
};

let notes = loadNotes();
let query = "";

function setStats(count) {
  el.stats.textContent = `${count} anteckning${count === 1 ? "" : "ar"}`;
}

function setEmptyState(isEmpty) {
  el.empty.style.display = isEmpty ? "block" : "none";
}

function render() {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? notes.filter((n) => n.text.toLowerCase().includes(q))
    : [...notes];

  el.list.innerHTML = "";
  for (const note of filtered) {
    const node = el.template.content.firstElementChild.cloneNode(true);
    const text = node.querySelector(".item-text");
    const meta = node.querySelector(".item-meta");
    text.textContent = note.text;

    const updated = note.updatedAt && note.updatedAt !== note.createdAt;
    meta.textContent = updated
      ? `Uppdaterad: ${formatRelative(note.updatedAt)}`
      : `Skapad: ${formatRelative(note.createdAt)}`;

    node.dataset.id = note.id;
    el.list.appendChild(node);
  }

  setStats(filtered.length);
  setEmptyState(filtered.length === 0);
}

function syncAndRender() {
  saveNotes(notes);
  render();
}

function updateCharCount() {
  const v = el.text.value ?? "";
  el.charCount.textContent = `${v.length}/200`;
}

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (el.text.value ?? "").trim();
  if (!text) return;

  const t = nowIso();
  notes.unshift({
    id: uid(),
    text,
    createdAt: t,
    updatedAt: t,
  });
  el.text.value = "";
  updateCharCount();
  syncAndRender();
  el.text.focus();
});

el.list.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const item = e.target.closest("li[data-id]");
  if (!item) return;
  const id = item.dataset.id;
  const action = btn.dataset.action;
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return;

  if (action === "delete") {
    notes.splice(idx, 1);
    syncAndRender();
    return;
  }

  if (action === "edit") {
    const current = notes[idx].text;
    const next = window.prompt("Redigera anteckning:", current);
    if (next == null) return; // cancel
    const trimmed = next.trim();
    if (!trimmed) return;
    notes[idx] = { ...notes[idx], text: trimmed, updatedAt: nowIso() };
    syncAndRender();
  }
});

el.search.addEventListener("input", (e) => {
  query = e.target.value ?? "";
  render();
});

el.clearAll.addEventListener("click", () => {
  if (notes.length === 0) return;
  const ok = window.confirm("Rensa alla anteckningar? Detta går inte att ångra.");
  if (!ok) return;
  notes = [];
  query = "";
  el.search.value = "";
  syncAndRender();
});

el.text.addEventListener("input", updateCharCount);
updateCharCount();

function initTheme() {
  const saved = loadTheme();
  const theme = saved ?? getPreferredThemeFallback();
  applyTheme(theme);
  el.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || getPreferredThemeFallback();
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
  el.themeToggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
}

el.themeToggle.addEventListener("click", toggleTheme);
initTheme();

render();
