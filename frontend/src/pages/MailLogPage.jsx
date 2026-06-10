import React, { useState, useEffect, useCallback } from "react";

const Icon = ({ name, size = 16, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = {
  background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ccc",
  padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};

const btnBase = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
  borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
};
const btnPrimary   = { ...btnBase, background: "#fce499", color: "#1a1a00" };
const btnSecondary = { ...btnBase, background: "#1e1e1e", color: "#999", border: "1px solid #2a2a2a" };
const btnDanger    = { ...btnBase, background: "#3a1a1a", color: "#fca5a5", border: "1px solid #7f1d1d" };

const ACTION_LABEL = {
  signed:  { label: "Signiert",   bg: "#1a2a1a", color: "#6ee7b7" },
  no_rule: { label: "Keine Regel", bg: "#2a2a1a", color: "#fcd34d" },
  error:   { label: "Fehler",     bg: "#2a1a1a", color: "#fca5a5" },
};

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ flex: 1, background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={12} style={{ color }} />{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function MailLogPage({ toast }) {
  const [data, setData]       = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [filter, setFilter]   = useState({ sender: "", action: "", date_from: "", date_to: "" });
  const [showSubject, setShowSubject] = useState(false);
  const [retDays, setRetDays] = useState("90");
  const [retSaved, setRetSaved] = useState("90");
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async (p = page, f = filter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit: 50, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) });
    const [d, s, settings] = await Promise.all([
      fetch(`/api/maillog/?${params}`).then(r => r.json()),
      fetch("/api/maillog/stats").then(r => r.json()),
      fetch("/api/settings/").then(r => r.json()),
    ]);
    setData(d);
    setStats(s);
    const saved = settings?.log_retention_days || "90";
    setRetDays(saved); setRetSaved(saved);
    setShowSubject(settings?.log_show_subject === "true");
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(1, filter); }, []);

  function applyFilter() { setPage(1); load(1, filter); }

  function resetFilter() {
    const f = { sender: "", action: "", date_from: "", date_to: "" };
    setFilter(f); setPage(1); load(1, f);
  }

  function goPage(p) { setPage(p); load(p, filter); }

  async function clearLogs() {
    await fetch("/api/maillog/", { method: "DELETE" });
    setConfirmClear(false);
    toast("ok", "Audit-Log geleert");
    load(1, filter);
  }

  async function saveRetention() {
    await fetch("/api/settings/log_retention_days", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: retDays }),
    });
    setRetSaved(retDays);
    toast("ok", "Aufbewahrung gespeichert");
  }

  async function toggleSubject() {
    const next = !showSubject;
    await fetch("/api/settings/log_show_subject", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next ? "true" : "false" }),
    });
    setShowSubject(next);
  }

  function exportUrl() {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([, v]) => v)));
    return `/api/maillog/export.csv?${params}`;
  }

  const hasFilter = Object.values(filter).some(Boolean);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Mail-Audit-Log</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Jede durch den SMTP-Proxy verarbeitete Mail.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={exportUrl()} download style={{ ...btnSecondary, textDecoration: "none" }}>
            <Icon name="download" size={14} />Export CSV
          </a>
          {confirmClear ? (
            <>
              <button style={btnDanger} onClick={clearLogs}><Icon name="trash" size={14} />Wirklich löschen</button>
              <button style={btnSecondary} onClick={() => setConfirmClear(false)}>Abbrechen</button>
            </>
          ) : (
            <button style={btnDanger} onClick={() => setConfirmClear(true)}><Icon name="trash" size={14} />Logs löschen</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard icon="mail" value={stats.total_today ?? 0} label="Heute gesamt" color="#93c5fd" />
        <StatCard icon="signature" value={stats.signed_today ?? 0} label="Heute signiert" color="#6ee7b7" />
        <StatCard icon="alert-triangle" value={stats.no_rule_today ?? 0} label="Heute ohne Regel" color="#fcd34d" />
        <StatCard icon="circle-x" value={stats.error_today ?? 0} label="Heute Fehler" color="#fca5a5" />
        <StatCard icon="database" value={stats.total_all ?? 0} label="Gesamt im Log" color="#a78bfa" />
      </div>

      {/* Settings row */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#555" }}>Aufbewahrung (Tage, 0=∞)</span>
          <input style={{ ...inputStyle, width: 70 }} type="number" min="0" value={retDays} onChange={e => setRetDays(e.target.value)} />
          <button style={{ ...btnPrimary, padding: "5px 10px", opacity: retDays === retSaved ? 0.5 : 1 }} disabled={retDays === retSaved} onClick={saveRetention}>
            <Icon name="device-floppy" size={13} />
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <button onClick={toggleSubject} style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
            background: showSubject ? "#fce499" : "#2a2a2a", transition: "background .2s", flexShrink: 0,
          }}>
            <span style={{ position: "absolute", top: 2, left: showSubject ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: showSubject ? "#1a1a0a" : "#555", transition: "left .2s" }} />
          </button>
          <span style={{ fontSize: 12, color: showSubject ? "#fce499" : "#555" }}>Betreff anzeigen (DSGVO beachten)</span>
        </label>
      </div>

      {/* Filter */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "12px 18px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto", gap: 8, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>Absender</div>
            <input style={inputStyle} placeholder="@domain.de" value={filter.sender} onChange={e => setFilter(f => ({ ...f, sender: e.target.value }))} onKeyDown={e => e.key === "Enter" && applyFilter()} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>Aktion</div>
            <select style={inputStyle} value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}>
              <option value="">Alle</option>
              <option value="signed">Signiert</option>
              <option value="no_rule">Keine Regel</option>
              <option value="error">Fehler</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>Von Datum</div>
            <input style={inputStyle} type="date" value={filter.date_from} onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>Bis Datum</div>
            <input style={inputStyle} type="date" value={filter.date_to} onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <button style={{ ...btnPrimary, marginTop: 18 }} onClick={applyFilter}><Icon name="search" size={14} />Suchen</button>
          {hasFilter && <button style={{ ...btnSecondary, marginTop: 18 }} onClick={resetFilter}><Icon name="x" size={14} /></button>}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "#555", padding: 40, textAlign: "center" }}>Lade...</div>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="mail-off" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Keine Einträge{hasFilter ? " für diesen Filter" : ""}</div>
        </div>
      ) : (
        <>
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#111", color: "#444", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Zeit</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Absender</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Empfänger</th>
                  {showSubject && <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Betreff</th>}
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Regel / Signatur</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Aktion</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Relay</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600 }}>ms</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => {
                  const act = ACTION_LABEL[row.action] || ACTION_LABEL.error;
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #1e1e1e", background: i % 2 === 0 ? "transparent" : "#0d0d0d" }}>
                      <td style={{ padding: "7px 14px", color: "#444", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {row.timestamp ? row.timestamp.replace("T", " ").slice(0, 16) : "—"}
                      </td>
                      <td style={{ padding: "7px 14px", color: "#aaa", fontFamily: "monospace" }}>{row.sender || "—"}</td>
                      <td style={{ padding: "7px 14px", color: "#666" }}>{_truncate(row.recipients, 40)}</td>
                      {showSubject && <td style={{ padding: "7px 14px", color: "#666" }}>{_truncate(row.subject, 40)}</td>}
                      <td style={{ padding: "7px 14px", color: "#555" }}>{row.rule_name || <span style={{ color: "#333" }}>—</span>}</td>
                      <td style={{ padding: "7px 14px" }}>
                        <span style={{ background: act.bg, color: act.color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{act.label}</span>
                      </td>
                      <td style={{ padding: "7px 14px" }}>
                        {row.relay_ok
                          ? <Icon name="circle-check" size={14} style={{ color: "#6ee7b7" }} />
                          : <span title={row.relay_error} style={{ cursor: "help" }}><Icon name="circle-x" size={14} style={{ color: "#fca5a5" }} /></span>}
                      </td>
                      <td style={{ padding: "7px 14px", color: "#444", textAlign: "right", fontFamily: "monospace" }}>{row.duration_ms}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#555", fontSize: 12 }}>
            <span>{data.total} Einträge · Seite {data.page} von {data.pages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page <= 1} onClick={() => goPage(data.page - 1)}>
                <Icon name="chevron-left" size={13} />
              </button>
              {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
                const p = data.pages <= 7 ? i + 1 : Math.max(1, data.page - 3) + i;
                if (p > data.pages) return null;
                return (
                  <button key={p} style={{ ...btnSecondary, padding: "5px 10px", background: p === data.page ? "#fce49922" : "#1e1e1e", color: p === data.page ? "#fce499" : "#999" }} onClick={() => goPage(p)}>{p}</button>
                );
              })}
              <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page >= data.pages} onClick={() => goPage(data.page + 1)}>
                <Icon name="chevron-right" size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function _truncate(s, n) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
