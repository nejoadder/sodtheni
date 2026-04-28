const API_BASE = "https://ergast.com/api/f1";
const THEME_KEY = "f1-webapp.theme";

const el = {
  refresh: document.getElementById("refresh"),
  themeToggle: document.getElementById("themeToggle"),
  updatedAt: document.getElementById("updatedAt"),
  error: document.getElementById("error"),

  nextStatus: document.getElementById("nextStatus"),
  nextRace: document.getElementById("nextRace"),

  lastStatus: document.getElementById("lastStatus"),
  lastRace: document.getElementById("lastRace"),
  lastResults: document.getElementById("lastResults"),

  standingsStatus: document.getElementById("standingsStatus"),
  standings: document.getElementById("standings"),
  season: document.getElementById("season"),

  kvTemplate: document.getElementById("kvTemplate"),
  resultItemTemplate: document.getElementById("resultItemTemplate"),
};

function setError(msg) {
  if (!msg) {
    el.error.hidden = true;
    el.error.textContent = "";
    return;
  }
  el.error.hidden = false;
  el.error.textContent = msg;
}

function setBadge(node, text, muted = false) {
  node.textContent = text;
  node.classList.toggle("badge-muted", muted);
}

function fmtDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTime(date, time) {
  if (!date) return "—";
  // Ergast time is usually like "13:00:00Z"
  const dt = time ? new Date(`${date}T${time}`) : new Date(date);
  if (Number.isNaN(dt.getTime())) return time ? `${date} ${time}` : date;
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function clearNode(node) {
  node.innerHTML = "";
}

function renderKeyValues(container, rows) {
  clearNode(container);
  for (const [k, v] of rows) {
    const row = el.kvTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".k").textContent = k;
    row.querySelector(".v").textContent = v ?? "—";
    container.appendChild(row);
  }
}

function driverName(d) {
  if (!d) return "—";
  const given = d.givenName ?? "";
  const family = d.familyName ?? "";
  return `${given} ${family}`.trim() || "—";
}

function constructorName(c) {
  return c?.name ?? "—";
}

function populateSeasonSelect(currentSeason) {
  const current = Number(currentSeason) || new Date().getFullYear();
  const start = Math.max(1950, current - 10);
  el.season.innerHTML = "";
  for (let y = current; y >= start; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    if (y === current) opt.selected = true;
    el.season.appendChild(opt);
  }
}

function themeLoad() {
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" || t === "dark" ? t : null;
}

function themeApply(theme) {
  if (!theme) {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

function preferredThemeFallback() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function themeInit() {
  const t = themeLoad() ?? preferredThemeFallback();
  themeApply(t);
  el.themeToggle.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
}

function themeToggle() {
  const current = document.documentElement.getAttribute("data-theme") || preferredThemeFallback();
  const next = current === "dark" ? "light" : "dark";
  themeApply(next);
  localStorage.setItem(THEME_KEY, next);
  el.themeToggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
}

async function loadNextRace() {
  setBadge(el.nextStatus, "Laddar…", true);
  renderKeyValues(el.nextRace, [["", ""]]);

  const data = await fetchJson("/current/next.json");
  const race =
    data?.MRData?.RaceTable?.Races && data.MRData.RaceTable.Races.length
      ? data.MRData.RaceTable.Races[0]
      : null;

  if (!race) {
    setBadge(el.nextStatus, "Ingen data", true);
    renderKeyValues(el.nextRace, [["Info", "Kunde inte hitta nästa race."]]);
    return;
  }

  const round = race.round ?? "—";
  const name = race.raceName ?? "—";
  const circuit = race?.Circuit?.circuitName ?? "—";
  const locality = race?.Circuit?.Location?.locality ?? "—";
  const country = race?.Circuit?.Location?.country ?? "—";
  const when = fmtDateTime(race.date, race.time);

  setBadge(el.nextStatus, `Runda ${round}`, false);
  renderKeyValues(el.nextRace, [
    ["Race", name],
    ["Bana", circuit],
    ["Plats", `${locality}, ${country}`],
    ["Start", when],
  ]);
}

async function loadLastRace() {
  setBadge(el.lastStatus, "Laddar…", true);
  renderKeyValues(el.lastRace, [["", ""]]);
  el.lastResults.innerHTML = "";

  const [raceData, resultsData] = await Promise.all([
    fetchJson("/current/last.json"),
    fetchJson("/current/last/results.json?limit=10"),
  ]);

  const race =
    raceData?.MRData?.RaceTable?.Races && raceData.MRData.RaceTable.Races.length
      ? raceData.MRData.RaceTable.Races[0]
      : null;

  const resultsRace =
    resultsData?.MRData?.RaceTable?.Races && resultsData.MRData.RaceTable.Races.length
      ? resultsData.MRData.RaceTable.Races[0]
      : null;

  const results = resultsRace?.Results ?? [];

  if (!race) {
    setBadge(el.lastStatus, "Ingen data", true);
    renderKeyValues(el.lastRace, [["Info", "Kunde inte hitta senaste race."]]);
    return;
  }

  const round = race.round ?? "—";
  const name = race.raceName ?? "—";
  const circuit = race?.Circuit?.circuitName ?? "—";
  const locality = race?.Circuit?.Location?.locality ?? "—";
  const country = race?.Circuit?.Location?.country ?? "—";
  const when = fmtDate(race.date);

  setBadge(el.lastStatus, `Runda ${round}`, false);
  renderKeyValues(el.lastRace, [
    ["Race", name],
    ["Bana", circuit],
    ["Plats", `${locality}, ${country}`],
    ["Datum", when],
  ]);

  if (!Array.isArray(results) || results.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Inga resultat tillgängliga ännu.";
    el.lastResults.appendChild(li);
    return;
  }

  for (const r of results) {
    const node = el.resultItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".pos").textContent = r.position ?? "—";
    node.querySelector(".name").textContent = driverName(r.Driver);
    node.querySelector(".team").textContent = constructorName(r.Constructor);
    const time = r?.Time?.time || r.status || "—";
    node.querySelector(".time").textContent = time;
    el.lastResults.appendChild(node);
  }
}

async function loadDriverStandings(season) {
  setBadge(el.standingsStatus, "Laddar…", true);
  el.standings.innerHTML = "";

  const data = await fetchJson(`/${encodeURIComponent(season)}/driverStandings.json?limit=10`);
  const lists = data?.MRData?.StandingsTable?.StandingsLists ?? [];
  const list = lists.length ? lists[0] : null;
  const standings = list?.DriverStandings ?? [];

  if (!Array.isArray(standings) || standings.length === 0) {
    setBadge(el.standingsStatus, "Ingen data", true);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="muted">Ingen standings-data för ${season}.</td>`;
    el.standings.appendChild(tr);
    return;
  }

  setBadge(el.standingsStatus, `${season}`, false);
  for (const s of standings) {
    const tr = document.createElement("tr");
    const constructors = Array.isArray(s.Constructors) ? s.Constructors : [];
    const team = constructors.length ? constructors.map((c) => constructorName(c)).join(", ") : "—";
    tr.innerHTML = `
      <td>${s.position ?? "—"}</td>
      <td>${driverName(s.Driver)}</td>
      <td>${team}</td>
      <td class="num">${s.points ?? "—"}</td>
      <td class="num">${s.wins ?? "—"}</td>
    `.trim();
    el.standings.appendChild(tr);
  }
}

function setUpdatedNow() {
  const ts = new Date();
  el.updatedAt.textContent = `Senast uppdaterad: ${ts.toLocaleString()}`;
}

async function refreshAll() {
  setError("");
  el.refresh.disabled = true;
  try {
    await loadNextRace();
    await loadLastRace();
    const season = el.season.value || String(new Date().getFullYear());
    await loadDriverStandings(season);
    setUpdatedNow();
  } catch (err) {
    setError(`Kunde inte hämta data. (${err?.message ?? "okänt fel"})`);
    setBadge(el.nextStatus, "Fel", true);
    setBadge(el.lastStatus, "Fel", true);
    setBadge(el.standingsStatus, "Fel", true);
  } finally {
    el.refresh.disabled = false;
  }
}

el.refresh.addEventListener("click", refreshAll);
el.season.addEventListener("change", () => loadDriverStandings(el.season.value).catch(() => {}));
el.themeToggle.addEventListener("click", themeToggle);

themeInit();
populateSeasonSelect(new Date().getFullYear());
refreshAll();

