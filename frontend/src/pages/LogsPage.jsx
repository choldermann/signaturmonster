import React, { useState, useEffect, useCallback, useRef } from "react";

const API = "";
async function api(method, path) {
  const token = localStorage.getItem("sm_token");
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return r.json();
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const LEVELS   = ["ALL", "INFO", "WARNING", "ERROR", "DEBUG"];
const SERVICES = [
  { value: "all",        label: "Alle Services" },
  { value: "backend",    label: "Backend" },
  { value: "smtp-proxy", label: "SMTP-Proxy" },
  { value: "updater",    label: "Updater" },
];

const LEVEL_META = {
  INFO:     { color: "#93c5fd", bg: "#0a1a2a", border: "#1e3a5f", icon: "info-circle" },
  WARNING:  { color: "#fce499", bg: "#1a1500", border: "#78600a", icon: "alert-triangle" },
  ERROR:    { color: "#f87171", bg: "#1f0a0a", border: "#7f1d1d", icon: "circle-x" },
  CRITICAL: { color: "#f43f5e", bg: "#2a0a0a", border: "#9f1239", icon: "skull" },
  DEBUG:    { color: "#555",    bg: "#161616", border: "#2a2a2a", icon: "bug" },
};

const SERVICE_META = {
  "backend":    { color: "#c4b5fd", bg: "#150f2a" },
  "smtp-proxy": { color: "#6ee7b7", bg: "#0a1f14" },
  "updater":    { color: "#fdba74", bg: "#1f1005" },
};

function levelMeta(lvl) { return LEVEL_META[lvl] || LEVEL_META.DEBUG; }
function serviceMeta(svc) { return SERVICE_META[svc] || { color: "#666", bg: "#1a1a1a" }; }

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts.endsWith("Z") ? ts : ts + "Z");
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 5)    return "gerade eben";
  if (diff < 60)   return `${diff} Sek.`;
  if (diff < 3600) return `${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} Std.`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function fmtAbs(ts) {
  if (!ts) return "";
  const d = new Date(ts.endsWith("Z") ? ts : ts + "Z");
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" });
}

function LevelBadge({ level }) {
  const m = levelMeta(level);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, padding: "2px 7px",
      borderRadius: 4, border: `1px solid ${m.border}`,
      background: m.bg, color: m.color,
      letterSpacing: "0.5px", textTransform: "uppercase", flexShrink: 0,
    }}>
      <Icon name={m.icon} size={10} />
      {level}
    </span>
  );
}

function ServiceChip({ service }) {
  const m = serviceMeta(service);
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px",
      borderRadius: 4, background: m.bg, color: m.color,
      fontFamily: "monospace", letterSpacing: "0.3px", flexShrink: 0,
    }}>
      {service}
    </span>
  );
}

function LogRow({ entry, expanded, onToggle }) {
  const m = levelMeta(entry.level);
  let details = null;
  if (entry.details) {
    try { details = JSON.parse(entry.details); } catch { details = entry.details; }
  }

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          borderBottom: expanded ? "none" : "1px solid #1a1a1a",
          cursor: details ? "pointer" : "default",
          background: expanded ? "#141414" : "transparent",
          transition: "background .1s",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "#131313"; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "#444", fontSize: 11 }} title={fmtAbs(entry.timestamp)}>
          {fmtTime(entry.timestamp)}
        </td>
        <td style={{ padding: "8px 8px" }}>
          <LevelBadge level={entry.level} />
        </td>
        <td style={{ padding: "8px 8px" }}>
          <ServiceChip service={entry.service} />
        </td>
        <td style={{ padding: "8px 12px", color: m.level === "ERROR" || m.level === "CRITICAL" ? m.color : "#bbb", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
          <span style={{ color: entry.level === "ERROR" || entry.level === "CRITICAL" ? m.color : entry.level === "WARNING" ? "#ddd" : "#999" }}>
            {entry.message}
          </span>
        </td>
        {details && (
          <td style={{ padding: "8px 10px", width: 20 }}>
            <Icon name={expanded ? "chevron-up" : "chevron-down"} size={12} style={{ color: "#333" }} />
          </td>
        )}
        {!details && <td style={{ width: 20 }} />}
      </tr>
      {expanded && details && (
        <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
          <td colSpan={5} style={{ padding: "0 12px 10px 40px" }}>
            <pre style={{
              margin: 0, fontSize: 11, color: "#6ee7b7", background: "#0a1a0a",
              border: "1px solid #0f2a0f", borderRadius: 6, padding: "10px 12px",
              overflow: "auto", maxHeight: 200,
            }}>
              {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LogsPage({ toast }) {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [level, setLevel]         = useState("ALL");
  const [service, setService]     = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");
  const [offset, setOffset]       = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [clearing, setClearing]       = useState(false);
  const intervalRef = useRef(null);
  const LIMIT = 100;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setOffset(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildUrl = useCallback((off) => {
    const p = new URLSearchParams({ limit: LIMIT, offset: off });
    if (level !== "ALL") p.set("level", level);
    if (service !== "all") p.set("service", service);
    if (search) p.set("search", search);
    return `/api/logs?${p}`;
  }, [level, service, search]);

  const load = useCallback(async (resetOffset = true) => {
    const off = resetOffset ? 0 : offset;
    setLoading(true);
    const data = await api("GET", buildUrl(off));
    if (Array.isArray(data?.items)) {
      setLogs(prev => resetOffset ? data.items : [...prev, ...data.items]);
      setTotal(data.total ?? 0);
      if (!resetOffset) setOffset(off + data.items.length);
    }
    setLoading(false);
  }, [buildUrl, offset]);

  // Reset on filter change
  useEffect(() => {
    setOffset(0);
    setExpandedId(null);
    load(true);
  }, [level, service, search]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, load]);

  async function clearLogs() {
    if (!confirm("Alle Log-Einträge löschen?")) return;
    setClearing(true);
    await api("DELETE", "/api/logs");
    setLogs([]); setTotal(0); setOffset(0);
    setClearing(false);
    toast("ok", "Logs geleert");
  }

  const levelBtn = (lv) => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
    cursor: "pointer", border: "1px solid",
    letterSpacing: "0.5px", textTransform: "uppercase",
    ...(level === lv
      ? lv === "ALL"
        ? { background: "#1e1e1e", color: "#fff", borderColor: "#444" }
        : { background: levelMeta(lv).bg, color: levelMeta(lv).color, borderColor: levelMeta(lv).border }
      : { background: "transparent", color: "#444", borderColor: "#222" }
    ),
  });

  const hasMore = logs.length < total;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>System-Log</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Ereignisse aus Backend, SMTP-Proxy und Updater.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${autoRefresh ? "#064e3b" : "#2a2a2a"}`,
              background: autoRefresh ? "#0a1f14" : "transparent",
              color: autoRefresh ? "#6ee7b7" : "#555",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: autoRefresh ? "#6ee7b7" : "#333",
              ...(autoRefresh ? { animation: "pulse 1.5s ease-in-out infinite" } : {}),
            }} />
            Live
          </button>
          <button
            onClick={() => load(true)}
            disabled={loading}
            style={{ padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "1px solid #2a2a2a", background: "transparent", color: "#666", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="refresh" size={13} />
          </button>
          <button
            onClick={clearLogs}
            disabled={clearing || logs.length === 0}
            style={{ padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "1px solid #3a1a1a", background: "transparent", color: "#f87171", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="trash" size={13} />Leeren
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {LEVELS.map(lv => (
            <button key={lv} style={levelBtn(lv)} onClick={() => { setLevel(lv); setOffset(0); }}>
              {lv}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "#2a2a2a", flexShrink: 0 }} />
        <select
          value={service}
          onChange={e => { setService(e.target.value); setOffset(0); }}
          style={{ padding: "5px 10px", background: "#111", border: "1px solid #222", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>
          {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <Icon name="search" size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#333", pointerEvents: "none" }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Suche in Nachrichten…"
            style={{ width: "100%", padding: "5px 10px 5px 28px", background: "#111", border: "1px solid #222", borderRadius: 6, color: "#ccc", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <span style={{ fontSize: 11, color: "#333", marginLeft: "auto", flexShrink: 0 }}>
          {loading ? "…" : `${total.toLocaleString("de-DE")} Einträge`}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, overflow: "hidden" }}>
        {logs.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#333" }}>
            <Icon name="clipboard-list" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14 }}>Keine Einträge</div>
            <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 5 }}>
              {search || level !== "ALL" || service !== "all" ? "Filter anpassen oder leeren" : "Logs erscheinen hier sobald Ereignisse auftreten"}
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                {["Zeit", "Level", "Service", "Nachricht", ""].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left", fontSize: 10, color: "#333",
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(entry => (
                <LogRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(id => id === entry.id ? null : entry.id)}
                />
              ))}
            </tbody>
          </table>
        )}

        {loading && logs.length === 0 && (
          <div style={{ padding: "30px", textAlign: "center", color: "#333", fontSize: 13 }}>Lade…</div>
        )}

        {hasMore && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a", textAlign: "center" }}>
            <button
              onClick={() => load(false)}
              disabled={loading}
              style={{ padding: "7px 20px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "1px solid #2a2a2a", background: "transparent", color: "#555", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="chevrons-down" size={13} />
              Ältere laden ({(total - logs.length).toLocaleString("de-DE")} weitere)
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
