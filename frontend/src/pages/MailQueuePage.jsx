import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../AppContext.jsx";

const Icon = ({ name, size = 16, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = {
  background: "var(--bg-nav)", border: "1px solid var(--border-3)", borderRadius: 6, color: "var(--text-2)",
  padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};
const btnBase      = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 };
const btnPrimary   = { ...btnBase, background: "var(--accent)", color: "var(--accent-fg)" };
const btnSecondary = { ...btnBase, background: "var(--bg-hover)", color: "#999", border: "1px solid var(--border-3)" };
const btnDanger    = { ...btnBase, background: "var(--red-bg)", color: "var(--red)", border: "1px solid var(--red-bd)" };

const STATUS_META = {
  pending: { labelKey: "queue.statusPending", bg: "#1a1500", color: "#fcd34d", border: "var(--accent-bd)" },
  sent:    { labelKey: "queue.statusSent",    bg: "#0a1a0a", color: "var(--green)", border: "var(--green-bd)" },
  failed:  { labelKey: "queue.statusFailed",  bg: "var(--red-bg)", color: "var(--red-s)", border: "var(--red-bd)" },
};

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
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

function nextAttemptLabel(entry, t) {
  if (entry.status !== "pending" || !entry.next_attempt_at) return "—";
  const d = new Date(entry.next_attempt_at.endsWith("Z") ? entry.next_attempt_at : entry.next_attempt_at + "Z");
  const diff = Math.floor((d - Date.now()) / 1000);
  if (diff <= 0)   return t("queue.timeImmediate");
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return t("queue.timeMinutes", { n: Math.floor(diff / 60) });
  return t("queue.timeHours", { n: Math.floor(diff / 3600) });
}

export default function MailQueuePage({ toast }) {
  const { t } = useI18n();
  const [data, setData]       = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]       = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  const BACKOFF_LABELS = [
    t("queue.timeImmediate"),
    t("queue.timeMinutes", { n: 1 }),
    t("queue.timeMinutes", { n: 5 }),
    t("queue.timeMinutes", { n: 30 }),
    t("queue.timeHours",   { n: 2 }),
  ];

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
    toast("ok", t("queue.toastRetry"));
    load(page, statusFilter);
  }

  async function remove(id) {
    await fetch(`/api/mailqueue/${id}`, { method: "DELETE" });
    toast("ok", t("queue.toastDeleted"));
    load(page, statusFilter);
  }

  async function clearSent() {
    await fetch("/api/mailqueue/", { method: "DELETE" });
    setConfirmClear(false);
    toast("ok", t("queue.toastCleared"));
    load(1, statusFilter);
  }

  function changeFilter(sf) { setStatusFilter(sf); setPage(1); load(1, sf); }
  function goPage(p) { setPage(p); load(p, statusFilter); }

  const statusMeta = {
    pending: { ...STATUS_META.pending, label: t("queue.statusPending") },
    sent:    { ...STATUS_META.sent,    label: t("queue.statusSent") },
    failed:  { ...STATUS_META.failed,  label: t("queue.statusFailed") },
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("queue.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("queue.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSecondary} onClick={() => load(page, statusFilter)}><Icon name="refresh" size={14} />{t("queue.refresh")}</button>
          {confirmClear ? (
            <>
              <button style={btnDanger} onClick={clearSent}><Icon name="trash" size={14} />{t("queue.confirmDeleteSent")}</button>
              <button style={btnSecondary} onClick={() => setConfirmClear(false)}>{t("common.cancel")}</button>
            </>
          ) : (
            <button style={btnSecondary} onClick={() => setConfirmClear(true)}><Icon name="trash" size={14} />{t("queue.clearSent")}</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard icon="clock" value={stats.pending} label={t("queue.statusPending")} color="#fcd34d" />
        <StatCard icon="circle-check" value={stats.sent} label={t("queue.statusSent")} color="var(--green)" />
        <StatCard icon="circle-x" value={stats.failed} label={t("queue.statFailed")} color="var(--red-s)" />
        <StatCard icon="database" value={stats.total} label={t("queue.statTotal")} color="var(--blue)" />
      </div>

      {/* Info box */}
      {stats.pending > 0 && (
        <div style={{ background: "#1a1500", border: "1px solid var(--accent-bd)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="clock" size={14} style={{ color: "#fcd34d", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#fcd34d" }}>
            {t("queue.pendingInfo", { count: stats.pending })}
          </span>
        </div>
      )}
      {stats.failed > 0 && (
        <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-bd)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert-triangle" size={14} style={{ color: "var(--red-s)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--red-s)" }}>
            {t("queue.failedInfo", { count: stats.failed })}
          </span>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["", t("queue.filterAll")], ["pending", t("queue.statusPending")], ["sent", t("queue.statusSent")], ["failed", t("queue.statusFailed")]].map(([val, lbl]) => (
          <button key={val} onClick={() => changeFilter(val)} style={{
            padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
            background: statusFilter === val ? "var(--bg-hover)" : "transparent",
            color: statusFilter === val ? "var(--accent)" : "var(--text-6)",
            borderColor: statusFilter === val ? "var(--blue-bd)" : "var(--border-2)",
          }}>{lbl}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--text-5)", padding: 40, textAlign: "center" }}>{t("common.loading")}</div>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
          <Icon name="mail-check" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>{t("queue.empty")}</div>
        </div>
      ) : (
        <>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg-nav)", color: "var(--text-6)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {[t("queue.colIncoming"), t("queue.colSender"), t("queue.colRecipient"), t("queue.colStatus"), t("queue.colAttempts"), t("queue.colNextAttempt"), t("queue.colError"), ""].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => {
                  const sm = statusMeta[row.status] || statusMeta.pending;
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--border-1)", background: i % 2 === 0 ? "transparent" : "var(--bg-page)" }}>
                      <td style={{ padding: "8px 14px", color: "var(--text-6)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtTime(row.created_at)}</td>
                      <td style={{ padding: "8px 14px", color: "var(--text-3)", fontFamily: "monospace" }}>{row.sender || "—"}</td>
                      <td style={{ padding: "8px 14px", color: "var(--text-4)" }}>{_trunc(row.recipients, 35)}</td>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{sm.label}</span>
                      </td>
                      <td style={{ padding: "8px 14px", color: "var(--text-5)", textAlign: "center" }}>
                        {row.attempts}/{row.max_attempts}
                      </td>
                      <td style={{ padding: "8px 14px", color: "var(--text-5)", fontFamily: "monospace" }}>{nextAttemptLabel(row, t)}</td>
                      <td style={{ padding: "8px 14px", color: "var(--text-5)", maxWidth: 200 }} title={row.last_error}>
                        {row.last_error ? <span style={{ color: "var(--red-s)" }}>{_trunc(row.last_error, 40)}</span> : <span style={{ color: "var(--text-7)" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {row.status === "failed" && (
                            <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11 }} onClick={() => retry(row.id)}>
                              <Icon name="refresh" size={11} />{t("queue.retry")}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-5)", fontSize: 12 }}>
              <span>{t("queue.pagination", { total: data.total, page: data.page, pages: data.pages })}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page <= 1} onClick={() => goPage(data.page - 1)}><Icon name="chevron-left" size={13} /></button>
                <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page >= data.pages} onClick={() => goPage(data.page + 1)}><Icon name="chevron-right" size={13} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Backoff info */}
      <div style={{ marginTop: 20, padding: "10px 16px", background: "var(--bg-nav)", borderRadius: 8, border: "1px solid var(--border-1)" }}>
        <div style={{ fontSize: 11, color: "var(--text-7)", marginBottom: 6 }}>{t("queue.backoffTitle")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {BACKOFF_LABELS.map((l, i) => (
            <span key={i} style={{ fontSize: 11, color: "var(--text-5)" }}>
              {t("queue.attempt", { n: i + 1 })}: <span style={{ color: "var(--text-4)" }}>{l}</span>
              {i < BACKOFF_LABELS.length - 1 && <span style={{ color: "var(--border-3)" }}> →</span>}
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
