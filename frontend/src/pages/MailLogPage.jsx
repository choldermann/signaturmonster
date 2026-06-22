import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../AppContext.jsx";

const Icon = ({ name, size = 16, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = {
  background: "var(--bg-nav)", border: "1px solid var(--border-3)", borderRadius: 6, color: "var(--text-2)",
  padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};

const btnBase = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
  borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
};
const btnPrimary   = { ...btnBase, background: "var(--accent)", color: "var(--accent-fg)" };
const btnSecondary = { ...btnBase, background: "var(--bg-hover)", color: "#999", border: "1px solid var(--border-3)" };
const btnDanger    = { ...btnBase, background: "var(--red-bg)", color: "var(--red)", border: "1px solid var(--red-bd)" };

const ACTION_LABEL = {
  signed:             { labelKey: "maillog.actionSigned",             bg: "#1a2a1a", color: "var(--green)" },
  no_rule:            { labelKey: "maillog.actionNoRule",             bg: "#2a2a1a", color: "#fcd34d" },
  error:              { labelKey: "maillog.actionError",              bg: "#2a1a1a", color: "var(--red)" },
  passthrough_signed: { labelKey: "maillog.actionPassthroughSigned",  bg: "#1a1a2a", color: "#818cf8" },
};

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={12} style={{ color }} />{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default function MailLogPage({ toast }) {
  const { t } = useI18n();
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
    toast("ok", t("maillog.cleared"));
    load(1, filter);
  }

  async function saveRetention() {
    await fetch("/api/settings/log_retention_days", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: retDays }),
    });
    setRetSaved(retDays);
    toast("ok", t("maillog.retentionSaved"));
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("maillog.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("maillog.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={exportUrl()} download style={{ ...btnSecondary, textDecoration: "none" }}>
            <Icon name="download" size={14} />{t("common.export")} CSV
          </a>
          {confirmClear ? (
            <>
              <button style={btnDanger} onClick={clearLogs}><Icon name="trash" size={14} />{t("maillog.confirmDelete")}</button>
              <button style={btnSecondary} onClick={() => setConfirmClear(false)}>{t("common.cancel")}</button>
            </>
          ) : (
            <button style={btnDanger} onClick={() => setConfirmClear(true)}><Icon name="trash" size={14} />{t("maillog.deleteLogs")}</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard icon="mail" value={stats.total_today ?? 0} label={t("maillog.statTodayTotal")} color="var(--blue)" />
        <StatCard icon="signature" value={stats.signed_today ?? 0} label={t("maillog.statTodaySigned")} color="var(--green)" />
        <StatCard icon="alert-triangle" value={stats.no_rule_today ?? 0} label={t("maillog.statTodayNoRule")} color="#fcd34d" />
        <StatCard icon="circle-x" value={stats.error_today ?? 0} label={t("maillog.statTodayError")} color="var(--red)" />
        <StatCard icon="database" value={stats.total_all ?? 0} label={t("maillog.statTotal")} color="var(--purple)" />
      </div>

      {/* Settings row */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-5)" }}>{t("maillog.retentionLabel")}</span>
          <input style={{ ...inputStyle, width: 70 }} type="number" min="0" value={retDays} onChange={e => setRetDays(e.target.value)} />
          <button style={{ ...btnPrimary, padding: "5px 10px", opacity: retDays === retSaved ? 0.5 : 1 }} disabled={retDays === retSaved} onClick={saveRetention}>
            <Icon name="device-floppy" size={13} />
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <button onClick={toggleSubject} style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
            background: showSubject ? "var(--accent)" : "var(--border-3)", transition: "background .2s", flexShrink: 0,
          }}>
            <span style={{ position: "absolute", top: 2, left: showSubject ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: showSubject ? "var(--accent-fg)" : "var(--text-5)", transition: "left .2s" }} />
          </button>
          <span style={{ fontSize: 12, color: showSubject ? "var(--accent)" : "var(--text-5)" }}>{t("maillog.showSubject")}</span>
        </label>
      </div>

      {/* Filter */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "12px 18px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto", gap: 8, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 4 }}>{t("maillog.filterSender")}</div>
            <input style={inputStyle} placeholder="@domain.de" value={filter.sender} onChange={e => setFilter(f => ({ ...f, sender: e.target.value }))} onKeyDown={e => e.key === "Enter" && applyFilter()} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 4 }}>{t("maillog.filterAction")}</div>
            <select style={inputStyle} value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}>
              <option value="">{t("maillog.filterAll")}</option>
              <option value="signed">{t("maillog.actionSigned")}</option>
              <option value="no_rule">{t("maillog.actionNoRule")}</option>
              <option value="error">{t("maillog.actionError")}</option>
              <option value="passthrough_signed">{t("maillog.actionPassthroughSigned")}</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 4 }}>{t("maillog.filterFrom")}</div>
            <input style={inputStyle} type="date" value={filter.date_from} onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 4 }}>{t("maillog.filterTo")}</div>
            <input style={inputStyle} type="date" value={filter.date_to} onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <button style={{ ...btnPrimary, marginTop: 18 }} onClick={applyFilter}><Icon name="search" size={14} />{t("maillog.search")}</button>
          {hasFilter && <button style={{ ...btnSecondary, marginTop: 18 }} onClick={resetFilter}><Icon name="x" size={14} /></button>}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--text-5)", padding: 40, textAlign: "center" }}>{t("common.loading")}</div>
      ) : data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
          <Icon name="mail-off" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>{t("maillog.empty")}{hasFilter ? t("maillog.emptyFilter") : ""}</div>
        </div>
      ) : (
        <>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg-nav)", color: "var(--text-6)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{t("maillog.colTime")}</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{t("maillog.colSender")}</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{t("maillog.colRecipient")}</th>
                  {showSubject && <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{t("maillog.colSubject")}</th>}
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{t("maillog.colRule")}</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>{t("maillog.colAction")}</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600 }}>Relay</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600 }}>ms</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => {
                  const act = ACTION_LABEL[row.action] || ACTION_LABEL.error;
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--border-1)", background: i % 2 === 0 ? "transparent" : "var(--bg-page)" }}>
                      <td style={{ padding: "7px 14px", color: "var(--text-6)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {row.timestamp ? row.timestamp.replace("T", " ").slice(0, 16) : "—"}
                      </td>
                      <td style={{ padding: "7px 14px", color: "var(--text-3)", fontFamily: "monospace" }}>{row.sender || "—"}</td>
                      <td style={{ padding: "7px 14px", color: "var(--text-4)" }}>{_truncate(row.recipients, 40)}</td>
                      {showSubject && <td style={{ padding: "7px 14px", color: "var(--text-4)" }}>{_truncate(row.subject, 40)}</td>}
                      <td style={{ padding: "7px 14px", color: "var(--text-5)" }}>{row.rule_name || <span style={{ color: "var(--text-7)" }}>—</span>}</td>
                      <td style={{ padding: "7px 14px" }}>
                        <span style={{ background: act.bg, color: act.color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{t(act.labelKey)}</span>
                      </td>
                      <td style={{ padding: "7px 14px" }}>
                        {row.relay_ok
                          ? <Icon name="circle-check" size={14} style={{ color: "var(--green)" }} />
                          : <span title={row.relay_error} style={{ cursor: "help" }}><Icon name="circle-x" size={14} style={{ color: "var(--red)" }} /></span>}
                      </td>
                      <td style={{ padding: "7px 14px", color: "var(--text-6)", textAlign: "right", fontFamily: "monospace" }}>{row.duration_ms}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-5)", fontSize: 12 }}>
            <span>{data.total} {t("maillog.entries")} · {t("maillog.page")} {data.page} {t("maillog.of")} {data.pages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btnSecondary, padding: "5px 10px" }} disabled={data.page <= 1} onClick={() => goPage(data.page - 1)}>
                <Icon name="chevron-left" size={13} />
              </button>
              {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
                const p = data.pages <= 7 ? i + 1 : Math.max(1, data.page - 3) + i;
                if (p > data.pages) return null;
                return (
                  <button key={p} style={{ ...btnSecondary, padding: "5px 10px", background: p === data.page ? "var(--accent-bg)" : "var(--bg-hover)", color: p === data.page ? "var(--accent)" : "#999" }} onClick={() => goPage(p)}>{p}</button>
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
