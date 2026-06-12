import React, { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../AppContext.jsx";

const API = "";
async function api(method, path) {
  const token = localStorage.getItem("sm_token");
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return r.json();
}

// ─── Sparkline SVG Chart ──────────────────────────────────────────────────────
function Sparkline({ points, color, height = 56, width = "100%" }) {
  const W = 300, H = height;
  const n = points.length;
  if (n < 2) return <svg width={width} height={H} />;

  const xs = points.map((_, i) => (i / (n - 1)) * W);
  const ys = points.map(v => H - 4 - ((v / 100) * (H - 8)));

  // Catmull-Rom → cubic bezier path
  const d = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x},${ys[i]}`;
    const x0 = xs[i - 1], y0 = ys[i - 1];
    const cp1x = x0 + (x - (i > 1 ? xs[i - 2] : x0)) / 6;
    const cp1y = y0 + (ys[i] - (i > 1 ? ys[i - 2] : y0)) / 6;
    const cp2x = x - (xs[i + 1] !== undefined ? xs[i + 1] - x0 : x - x0) / 6;
    const cp2y = ys[i] - (ys[i + 1] !== undefined ? ys[i + 1] - y0 : ys[i] - y0) / 6;
    return `${acc} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${ys[i]}`;
  }, "");

  const area = `${d} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Single Metric Card ───────────────────────────────────────────────────────
function MetricCard({ title, icon, value, history, color, detail, unit = "%" }) {
  const pct  = value ?? 0;
  const warn = pct > 85;
  const c    = warn ? "var(--red-s)" : color;

  return (
    <div style={{ flex: 1, background: "var(--bg-card)", border: `1px solid ${warn ? "var(--red-bg)" : "var(--border-2)"}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 11, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "0.6px", display: "flex", alignItems: "center", gap: 5 }}>
            <i className={`ti ti-${icon}`} style={{ fontSize: 11, color: c }} />
            {title}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: "monospace" }}>
            {value !== null ? `${pct}${unit}` : "—"}
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 6, height: 3, background: "var(--border-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 5 }}>{detail || " "}</div>
      </div>
      <Sparkline points={history} color={c} height={52} width="100%" />
    </div>
  );
}

// ─── System Stats Block ───────────────────────────────────────────────────────
const MAX_HIST = 60;

function SystemStats() {
  const { t } = useI18n();
  const [stats, setStats]     = useState(null);
  const [cpuH, setCpuH]       = useState([]);
  const [memH, setMemH]       = useState([]);
  const [diskH, setDiskH]     = useState([]);
  const [visible, setVisible] = useState(true);

  const push = (setter, val) =>
    setter(prev => [...prev.slice(-(MAX_HIST - 1)), val]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const s = await api("GET", "/api/logs/system-stats");
        if (!alive) return;
        setStats(s);
        push(setCpuH,  s.cpu_percent);
        push(setMemH,  s.mem_percent);
        push(setDiskH, s.disk_percent);
      } catch { /* ignore */ }
    }
    poll();
    const id = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-7)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{t("logs.systemLoad")}</span>
        <button onClick={() => setVisible(v => !v)}
          style={{ fontSize: 11, color: "var(--text-7)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <i className={`ti ti-chevron-${visible ? "up" : "down"}`} style={{ fontSize: 11 }} />
          {visible ? t("logs.hide") : t("logs.show")}
        </button>
      </div>
      {visible && (
        <div style={{ display: "flex", gap: 10 }}>
          <MetricCard
            title="CPU" icon="cpu"
            value={stats?.cpu_percent ?? null}
            history={cpuH} color="var(--blue)"
            detail={stats ? `${stats.cpu_count} ${t("logs.cores")}${stats.cpu_freq_mhz ? ` · ${stats.cpu_freq_mhz} MHz` : ""}` : ""}
          />
          <MetricCard
            title={t("logs.ram")} icon="device-desktop"
            value={stats?.mem_percent ?? null}
            history={memH} color="var(--purple)"
            detail={stats ? `${stats.mem_used_gb} / ${stats.mem_total_gb} GB` : ""}
          />
          <MetricCard
            title={t("logs.disk")} icon="database"
            value={stats?.disk_percent ?? null}
            history={diskH} color="var(--green)"
            detail={stats ? `${stats.disk_used_gb} / ${stats.disk_total_gb} GB` : ""}
          />
        </div>
      )}
    </div>
  );
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const LEVELS   = ["ALL", "INFO", "WARNING", "ERROR", "DEBUG"];

const LEVEL_META = {
  INFO:     { color: "var(--blue)",   bg: "var(--blue-bg)",   border: "var(--blue-bd)",   icon: "info-circle" },
  WARNING:  { color: "var(--accent)", bg: "var(--accent-bg2)", border: "var(--accent-bd)", icon: "alert-triangle" },
  ERROR:    { color: "var(--red-s)",  bg: "var(--red-bg)",    border: "var(--red-bd)",    icon: "circle-x" },
  CRITICAL: { color: "#f43f5e",       bg: "#2a0a0a",           border: "#9f1239",           icon: "skull" },
  DEBUG:    { color: "var(--text-5)", bg: "var(--bg-card)",   border: "var(--border-3)",  icon: "bug" },
};

const SERVICE_META = {
  "backend":    { color: "var(--purple)", bg: "#150f2a" },
  "smtp-proxy": { color: "var(--green)",  bg: "var(--green-bg)" },
  "updater":    { color: "#fdba74",       bg: "#1f1005" },
};

function levelMeta(lvl) { return LEVEL_META[lvl] || LEVEL_META.DEBUG; }
function serviceMeta(svc) { return SERVICE_META[svc] || { color: "var(--text-4)", bg: "var(--bg-input)" }; }

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
          borderBottom: expanded ? "none" : "1px solid var(--bg-input)",
          cursor: details ? "pointer" : "default",
          background: expanded ? "#141414" : "transparent",
          transition: "background .1s",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = "#131313"; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--text-6)", fontSize: 11 }} title={fmtAbs(entry.timestamp)}>
          {fmtTime(entry.timestamp)}
        </td>
        <td style={{ padding: "8px 8px" }}>
          <LevelBadge level={entry.level} />
        </td>
        <td style={{ padding: "8px 8px" }}>
          <ServiceChip service={entry.service} />
        </td>
        <td style={{ padding: "8px 12px", color: m.level === "ERROR" || m.level === "CRITICAL" ? m.color : "var(--text-2)", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
          <span style={{ color: entry.level === "ERROR" || entry.level === "CRITICAL" ? m.color : entry.level === "WARNING" ? "var(--text-2)" : "var(--text-3)" }}>
            {entry.message}
          </span>
        </td>
        {details && (
          <td style={{ padding: "8px 10px", width: 20 }}>
            <Icon name={expanded ? "chevron-up" : "chevron-down"} size={12} style={{ color: "var(--text-7)" }} />
          </td>
        )}
        {!details && <td style={{ width: 20 }} />}
      </tr>
      {expanded && details && (
        <tr style={{ borderBottom: "1px solid var(--bg-input)" }}>
          <td colSpan={5} style={{ padding: "0 12px 10px 40px" }}>
            <pre style={{
              margin: 0, fontSize: 11, color: "var(--green)", background: "#0a1a0a",
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
  const { t } = useI18n();
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

  const SERVICES = [
    { value: "all",        label: t("logs.allServices") },
    { value: "backend",    label: "Backend" },
    { value: "smtp-proxy", label: "SMTP-Proxy" },
    { value: "updater",    label: "Updater" },
  ];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setOffset(0); }, 350);
    return () => clearTimeout(timer);
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
    if (!confirm(t("logs.confirmClear"))) return;
    setClearing(true);
    await api("DELETE", "/api/logs");
    setLogs([]); setTotal(0); setOffset(0);
    setClearing(false);
    toast("ok", t("logs.cleared"));
  }

  const levelBtn = (lv) => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
    cursor: "pointer", border: "1px solid",
    letterSpacing: "0.5px", textTransform: "uppercase",
    ...(level === lv
      ? lv === "ALL"
        ? { background: "var(--bg-hover)", color: "var(--text-1)", borderColor: "var(--text-6)" }
        : { background: levelMeta(lv).bg, color: levelMeta(lv).color, borderColor: levelMeta(lv).border }
      : { background: "transparent", color: "var(--text-6)", borderColor: "var(--border-2)" }
    ),
  });

  const hasMore = logs.length < total;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("logs.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>
            {t("logs.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${autoRefresh ? "var(--green-bd)" : "var(--border-3)"}`,
              background: autoRefresh ? "var(--green-bg)" : "transparent",
              color: autoRefresh ? "var(--green)" : "var(--text-5)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: autoRefresh ? "var(--green)" : "var(--text-7)",
              ...(autoRefresh ? { animation: "pulse 1.5s ease-in-out infinite" } : {}),
            }} />
            Live
          </button>
          <button
            onClick={() => load(true)}
            disabled={loading}
            style={{ padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "1px solid var(--border-3)", background: "transparent", color: "var(--text-4)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="refresh" size={13} />
          </button>
          <button
            onClick={clearLogs}
            disabled={clearing || logs.length === 0}
            style={{ padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "1px solid var(--red-bg)", background: "transparent", color: "var(--red-s)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="trash" size={13} />{t("logs.clear")}
          </button>
        </div>
      </div>

      <SystemStats />

      {/* Filter bar */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {LEVELS.map(lv => (
            <button key={lv} style={levelBtn(lv)} onClick={() => { setLevel(lv); setOffset(0); }}>
              {lv}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border-3)", flexShrink: 0 }} />
        <select
          value={service}
          onChange={e => { setService(e.target.value); setOffset(0); }}
          style={{ padding: "5px 10px", background: "var(--bg-nav)", border: "1px solid var(--border-2)", borderRadius: 6, color: "var(--text-3)", fontSize: 12, cursor: "pointer" }}>
          {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <Icon name="search" size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-7)", pointerEvents: "none" }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t("logs.searchPlaceholder")}
            style={{ width: "100%", padding: "5px 10px 5px 28px", background: "var(--bg-nav)", border: "1px solid var(--border-2)", borderRadius: 6, color: "var(--text-2)", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-7)", marginLeft: "auto", flexShrink: 0 }}>
          {loading ? "…" : `${total.toLocaleString("de-DE")} ${t("logs.entries")}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, overflow: "hidden" }}>
        {logs.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-7)" }}>
            <Icon name="clipboard-list" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14 }}>{t("logs.noEntries")}</div>
            <div style={{ fontSize: 12, color: "var(--border-3)", marginTop: 5 }}>
              {search || level !== "ALL" || service !== "all" ? t("logs.adjustFilter") : t("logs.noEntriesHint")}
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-1)" }}>
                {[t("logs.colTime"), t("logs.colLevel"), t("logs.colService"), t("logs.colMessage"), ""].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left", fontSize: 10, color: "var(--text-7)",
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
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-7)", fontSize: 13 }}>{t("common.loading")}</div>
        )}

        {hasMore && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--bg-input)", textAlign: "center" }}>
            <button
              onClick={() => load(false)}
              disabled={loading}
              style={{ padding: "7px 20px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: "1px solid var(--border-3)", background: "transparent", color: "var(--text-5)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="chevrons-down" size={13} />
              {t("logs.loadOlder")} ({(total - logs.length).toLocaleString("de-DE")} {t("logs.more")})
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
