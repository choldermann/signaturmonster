import React, { useState, useEffect, useCallback } from "react";

const Icon = ({ name, size = 16, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = {
  background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ccc",
  padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};
const btnBase      = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 };
const btnPrimary   = { ...btnBase, background: "#fce499", color: "#1a1a00" };
const btnSecondary = { ...btnBase, background: "#1e1e1e", color: "#999", border: "1px solid #2a2a2a" };
const btnDanger    = { ...btnBase, background: "#3a1a1a", color: "#fca5a5", border: "1px solid #7f1d1d" };

const STATUS_META = {
  pending: { label: "Ausstehend", bg: "#1a1500", color: "#fcd34d", border: "#78600a" },
  sent:    { label: "Gesendet",   bg: "#0a1a0a", color: "#6ee7b7", border: "#064e3b" },
  failed:  { label: "Fehlgeschlagen", bg: "#1f0a0a", color: "#f87171", border: "#7f1d1d" },
};

const BACKOFF_LABELS = ["sofort", "1 Min.", "5 Min.", "30 Min.", "2 Std."];

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ flex: 1, background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={12} style={{ color }} />{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value ?? 0}</div>
    </div>
  );
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts.endsWith("Z") ? ts : ts + "Z");
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function nextAttemptLabel(entry) {
  if (entry.status !== "pending" || !entry.next_attempt_at) return "—";
  const t = new Date(entry.next_attempt_at.endsWith("Z") ? entry.next_attempt_at : entry.next_attempt_at + "Z");
  const diff = Math.floor((t - Date.now()) / 1000);
  if (diff <= 0)   return "sofort";
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)} Min.`;
  return `${Math.floor(diff / 3600)} Std.`;
}

export default function MailQueuePage({ toast }) {
  const [data, setData]       = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]       = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async (p = 1, sf = statusFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit: 50 });
    if (sf) params.set("status", sf);
    const [d, s] = await Promise.all([
      fetch(`/api/mailqueue/?${params}`).then(r => r.json()),
      fetch("/api/mailqueue/stats").then(r => r.json()),
    ]);
    setData(d); setStats(s); setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(1, statusFilter); }, []);

  // Auto-refresh every 15s when there are pending entries
  useEffect(() => {
    const id = setInterval(() => {
      if (stats.pending > 0) load(page, statusFilter);
    }, 15000);
    return () => clearInterval(id);
  }, [stats.pending, page, statusFilter, load]);

  async function retry(id) {
    await fetch(`/api/mailqueue/${id}/retry`, { method: "PUT" });
    toast("ok", "Wird erneut versucht");
    load(page, statusFilter);
  }

  async function remove(id) {
    await fetch(`/api/mailqueue/${id}`, { method: "DELETE" });
    toast("ok", "Eintrag gelöscht");
    load(page, statusFilter);
  }

  async function clearSent() {
    await fetch("/api/mailqueue/", { method: "DELETE" });
    setConfirmClear(false);
    toast("ok", "Gesendete Einträge geleert");
    load(1, statusFilter);
  }

  function changeFilter(sf) { setStatusFilter(sf); setPage(1); load(1, sf); }
  function goPage(p) { setPage(p); load(p, statusFilter); }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Mail-Queue</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Ausstehende und fehlgeschlagene Relay-Versuche.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSecondary} onClick={() => load(page, statusFilter)}><Icon name="refresh" size={14} />Aktualisieren</button>
          {confirmClear ? (
            <>
              <button style={btnDanger} onClick={clearSent}><Icon name="trash" size={14} />Gesendete löschen</button>
              <button style={btnSecondary} onClick={() => setConfirmClear(false)}>Abbrechen</button>
            </>
          ) : (
            <button style={btnSecondary} onClick={() => setConfirmClear(true)}><Icon name="trash" size={14} />Gesendete leeren</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard icon="clock" value={stats.pending} label="Ausstehend" color="#fcd34d" />
        <StatCard icon="circle-check" value={stats.sent} label="Gesendet" color="#6ee7b7" />
        <StatCard icon="circle-x" value={stats.failed} label="Fehlgeschlagen (Dead Letter)" color="#f87171" />
        <StatCard icon="database" value={stats.total} label="Gesamt" color="#93c5fd" />
      </div>

      {/* Info box */}
      {stats.pending > 0 && (
        <div style={{ background: "#1a1500", border: "1px solid #78600a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="clock" size={14} style={{ color: "#fcd34d", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#fcd34d" }}>
            {stats.pending} Mail{stats.pending !== 1 ? "s" : ""} warten auf Zustellung — der Retry-Worker versucht es alle 30 Sekunden automatisch.
          </span>
        </div>
      )}
      {stats.failed > 0 && (
        <div style={{ background: "#1f0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert-triangle" size={14} style={{ color: "#f87171", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#f87171" }}>
            {stats.failed} Mail{stats.failed !== 1 ? "s" : ""} nach 5 Versuchen nicht zustellbar (Dead Letter). Manuell wiederholen oder löschen.
          </span>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["", "Alle"], ["pending", "Ausstehend"], ["sent", "Gesendet"], ["failed", "Fehlgeschlagen"]].map(([val, lbl]) => (
          <button key={val} onClick={() => changeFilter(val)} style={{
            padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
            background: statusFilter === val ? "#1e1e1e" : "transparent",
            color: statusFilter === val ? "#fce499" : "#444",
            borderColor: statusFilter === val ? "#fce49944" : "#222",
          }}>{lbl}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "#555", padding: 40, textAlign: "center" }}>Lade...</div>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="mail-check" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Queue ist leer</div>
        </div>
      ) : (
        <>
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#111", color: "#444", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {["Eingang", "Absender", "Empfänger", "Status", "Versuche", "Nächster Versuch", "Fehler", ""].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => {
                  const sm = STATUS_META[row.status] || STATUS_META.pending;
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #1e1e1e", background: i % 2 === 0 ? "transparent" : "#0d0d0d" }}>
                      <td style={{ padding: "8px 14px", color: "#444", fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtTime(row.created_at)}</td>
                      <td style={{ padding: "8px 14px", color: "#aaa", fontFamily: "monospace" }}>{row.sender || "—"}</td>
                      <td style={{ padding: "8px 14px", color: "#666" }}>{_trunc(row.recipients, 35)}</td>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{sm.label}</span>
                      </td>
                      <td style={{ padding: "8px 14px", color: "#555", textAlign: "center" }}>
                        {row.attempts}/{row.max_attempts}
                      </td>
                      <td style={{ padding: "8px 14px", color: "#555", fontFamily: "monospace" }}>{nextAttemptLabel(row)}</td>
                      <td style={{ padding: "8px 14px", color: "#555", maxWidth: 200 }} title={row.last_error}>
                        {row.last_error ? <span style={{ color: "#f87171" }}>{_trunc(row.last_error, 40)}</span> : <span style={{ color: "#333" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {row.status === "failed" && (
                            <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11 }} onClick={() => retry(row.id)}>
                              <Icon name="refresh" size={11} />Wiederholen
                            </button>
                          )}
                          <button style={{ ...btnDanger, padding: "4px 8px" }} onClick={() => remove(row.id)}>
                            <Icon name="trash" size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#555", fontSize: 12 }}>
              <span>{data.total} Einträge · Seite {data.page} von {data.pages}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page <= 1} onClick={() => goPage(data.page - 1)}><Icon name="chevron-left" size={13} /></button>
                <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page >= data.pages} onClick={() => goPage(data.page + 1)}><Icon name="chevron-right" size={13} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Backoff info */}
      <div style={{ marginTop: 20, padding: "10px 16px", background: "#111", borderRadius: 8, border: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 11, color: "#333", marginBottom: 6 }}>Retry-Strategie (exponentieller Backoff)</div>
        <div style={{ display: "flex", gap: 8 }}>
          {BACKOFF_LABELS.map((l, i) => (
            <span key={i} style={{ fontSize: 11, color: "#555" }}>
              {i + 1}. Versuch: <span style={{ color: "#666" }}>{l}</span>
              {i < BACKOFF_LABELS.length - 1 && <span style={{ color: "#2a2a2a" }}> →</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function _trunc(s, n) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
