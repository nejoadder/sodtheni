import { useEffect, useMemo, useState } from "react";
import {
  generatePasswordLocal,
  normalizeSettings,
  strengthFromEntropy,
  validateSettings,
  estimateEntropyBits,
} from "./lib/password";

const LS_SETTINGS_KEY = "react-password-webapp.settings.v1";
const LS_HISTORY_KEY = "react-password-webapp.history.v1";

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

const apiBaseDefault = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

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

function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function entropyToMeterPercent(entropyBits) {
  if (!Number.isFinite(entropyBits)) return 0;
  // Heuristik för UI: ungefärliga trösklar för max 10 tecken.
  if (entropyBits < 30) return 20;
  if (entropyBits < 45) return 45;
  if (entropyBits < 60) return 70;
  return 100;
}

export default function App() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_SETTINGS_KEY);
      return normalizeSettings({ ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) });
    } catch {
      return normalizeSettings(DEFAULT_SETTINGS);
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
    } catch {
      return [];
    }
  });

  const [useBackend, setUseBackend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [lastCopiedId, setLastCopiedId] = useState(null);

  const [theme, setTheme] = useState(() => {
    try {
      const raw = localStorage.getItem("react-password-webapp.theme");
      return raw === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
    } catch {
      // ignore
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem("react-password-webapp.theme", theme);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const poolPreview = useMemo(() => {
    const v = validateSettings(settings);
    if (!v.ok) return { poolSize: 0, entropyBits: 0, strength: "—" };
    const entropyBits = estimateEntropyBits(v.poolSize, settings.length);
    return { poolSize: v.poolSize, entropyBits, strength: strengthFromEntropy(entropyBits) };
  }, [settings]);

  function onChangeNumber(key, value) {
    setSettings((s) => {
      const next = { ...s };
      next[key] = clamp(Number.parseInt(String(value), 10) || s[key], 1, 10);
      return next;
    });
  }

  async function generate() {
    setError("");
    setLoading(true);
    setResults([]);

    const nextSettings = normalizeSettings(settings);

    const v = validateSettings(nextSettings);
    if (!v.ok) {
      setError("Välj minst en teckentyp (gemener/versaler/siffror/symboler).");
      setLoading(false);
      return;
    }

    const createdAt = new Date().toISOString();
    const createdId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    try {
      if (useBackend) {
        try {
          const res = await fetch(`${apiBaseDefault}/api/password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...nextSettings,
              // Backend förväntar symbolCustom
              symbolCustom: nextSettings.useSymbols ? nextSettings.symbolCustom : "",
            }),
          });

          if (!res.ok) throw new Error(`Backend fel: ${res.status}`);
          const data = await res.json();
          const items = (data.passwords || []).map((p, idx) => ({
            id: `${createdId}-${idx}`,
            password: p.password,
            entropyBits: p.entropyBits,
            strength: p.strength,
            createdAt,
          }));
          setResults(items);

          setHistory((h) =>
            [...items.map((it) => ({ ...it, createdAt, id: it.id })), ...h].slice(0, 20),
          );
          return;
        } catch (e) {
          // Fallback: lokal generation.
          setError(`Kunde inte nå backend – kör lokalt istället.`);
        }
      }

      const items = [];
      for (let i = 0; i < nextSettings.count; i++) {
        const p = generatePasswordLocal(nextSettings);
        if (!p.password) continue;
        items.push({
          id: `${createdId}-${i}`,
          password: p.password,
          entropyBits: p.entropyBits,
          strength: p.strength,
          createdAt,
        });
      }

      setResults(items);
      setHistory((h) => [...items, ...h].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  async function onCopy(item) {
    const ok = await copyToClipboard(item.password);
    setLastCopiedId(item.id);
    setTimeout(() => setLastCopiedId((cur) => (cur === item.id ? null : cur)), 1100);
    return ok;
  }

  function removeFromHistory(id) {
    setHistory((h) => h.filter((x) => x.id !== id));
  }

  function clearHistory() {
    const ok = window.confirm("Rensa hela historiken? Detta går inte att ångra.");
    if (!ok) return;
    setHistory([]);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="title">
          <h1>Lösenordsgenerator</h1>
          <p className="subtitle">
            Ljust, avancerat och säkert. Max <strong>10</strong> tecken.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-pressed={theme === "dark"}
          >
            Växla tema
          </button>
        </div>
      </header>

      <main className="main">
        <section className="card">
          <h2 className="card-title">Inställningar</h2>

          <div className="grid">
            <div className="field">
              <label className="label" htmlFor="length">
                Längd (1–10)
              </label>
              <div className="row">
                <input
                  id="length"
                  className="slider"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={settings.length}
                  onChange={(e) => onChangeNumber("length", e.target.value)}
                />
                <input
                  className="input input-num"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.length}
                  onChange={(e) => onChangeNumber("length", e.target.value)}
                />
              </div>
              <p className="help">Korta lösenord kräver rätt kombination av teckentyper.</p>
            </div>

            <div className="field">
              <span className="label">Teckentyper</span>
              <div className="checks">
                <label className="check">
                  <input type="checkbox" checked={settings.useLower} onChange={(e) => setSettings((s) => ({ ...s, useLower: e.target.checked }))} />
                  <span>Gemener (a-z)</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.useUpper} onChange={(e) => setSettings((s) => ({ ...s, useUpper: e.target.checked }))} />
                  <span>Versaler (A-Z)</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.useDigits} onChange={(e) => setSettings((s) => ({ ...s, useDigits: e.target.checked }))} />
                  <span>Siffror (0-9)</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={settings.useSymbols} onChange={(e) => setSettings((s) => ({ ...s, useSymbols: e.target.checked }))} />
                  <span>Symboler</span>
                </label>
              </div>
            </div>

            <div className="field">
              <label className="check">
                <input type="checkbox" checked={settings.avoidAmbiguous} onChange={(e) => setSettings((s) => ({ ...s, avoidAmbiguous: e.target.checked }))} />
                <span>Undvik otydliga tecken (O/0, I/l/1)</span>
              </label>
            </div>

            <div className="field">
              <label className="label" htmlFor="symbolCustom">
                Egna symboler (valfritt)
              </label>
              <input
                id="symbolCustom"
                className="input"
                type="text"
                inputMode="text"
                value={settings.symbolCustom}
                onChange={(e) => setSettings((s) => ({ ...s, symbolCustom: e.target.value }))}
                placeholder="Ex: !@#$%*()-_"
                maxLength={80}
              />
              <p className="help">Används bara om “Symboler” är aktiverat.</p>
            </div>

            <div className="field">
              <label className="label" htmlFor="count">
                Antal att generera
              </label>
              <div className="row">
                <input
                  id="count"
                  className="slider"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={settings.count}
                  onChange={(e) => onChangeNumber("count", e.target.value)}
                />
                <input
                  className="input input-num"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.count}
                  onChange={(e) => onChangeNumber("count", e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="check">
                <input type="checkbox" checked={useBackend} onChange={(e) => setUseBackend(e.target.checked)} />
                <span>Använd backend (API) för generation</span>
              </label>
              <p className="help">Om backend inte nås kör appen lokalt automatiskt.</p>
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={generate} disabled={loading}>
              {loading ? "Genererar…" : "Generera lösenord"}
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={clearHistory}
              disabled={loading || history.length === 0}
            >
              Rensa historik
            </button>
          </div>

          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}
        </section>

        <section className="card">
          <h2 className="card-title">Resultat</h2>

          <div className="meterWrap">
            <div className="meter" aria-hidden="true">
              <div
                className="meter-bar"
                style={{ width: `${entropyToMeterPercent(poolPreview.entropyBits)}%` }}
              />
            </div>
            <div className="meter-meta">
              <span className="muted">
                Entropi: {Math.round(poolPreview.entropyBits)} bits
              </span>
              <span className="badge">{poolPreview.strength}</span>
            </div>
          </div>

          <div className="results" aria-live="polite">
            {loading && results.length === 0 ? (
              <div className="skeletonList" />
            ) : null}

            {results.length === 0 && !loading ? (
              <div className="empty">Inga lösenord än. Klicka “Generera” ovan.</div>
            ) : null}

            {results.map((item) => (
              <div key={item.id} className="result">
                <div className="result-main">
                  <div className="pw">{item.password}</div>
                  <div className="metaRow">
                    <span className="muted">{`Entropi: ${Math.round(item.entropyBits)} bits`}</span>
                    <span className="badge">{item.strength}</span>
                  </div>
                </div>
                <div className="result-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => onCopy(item)}
                  >
                    {lastCopiedId === item.id ? "Kopierat" : "Kopiera"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Historik</h2>
          <p className="help">Sparas lokalt i din webbläsare (max 20).</p>

          <ul className="history" aria-label="Historik">
            {history.length === 0 ? <li className="emptySmall">Ingen historik ännu.</li> : null}

            {history.map((item) => (
              <li key={item.id} className="histItem">
                <div className="histMain">
                  <code className="histPw">{item.password}</code>
                  <div className="histMeta">
                    <span className="muted histTime">{formatWhen(item.createdAt)}</span>
                    <span className="muted histEntropy">{`Entropi: ${Math.round(item.entropyBits)} bits`}</span>
                  </div>
                </div>
                <div className="histActions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => onCopy(item)}
                  >
                    {lastCopiedId === item.id ? "Kopierat" : "Kopiera"}
                  </button>
                  <button
                    className="btn btn-ghost btn-small danger"
                    type="button"
                    onClick={() => removeFromHistory(item.id)}
                  >
                    Ta bort
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span className="muted">Backend: {apiBaseDefault}</span>
        <span className="muted">Max längd: 10 tecken</span>
      </footer>
    </div>
  );
}

