import React, { useState, useEffect, useCallback } from "react";
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

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const btnPrimary  = { padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };

function Card({ title, icon, children, action }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {icon && <Icon name={icon} size={15} style={{ color: "var(--accent)" }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function Badge({ ok }) {
  const { t } = useI18n();
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
      background: ok ? "var(--green-bg)" : "var(--accent-bg2)",
      color: ok ? "var(--green)" : "var(--accent)",
      border: `1px solid ${ok ? "var(--green-bd)" : "var(--accent-bd)"}`,
    }}>
      {ok ? t("update.badgeCurrent") : t("update.badgeAvailable")}
    </span>
  );
}

function VersionBlock({ label, hash, message, date }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--bg-nav)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border-1)" }}>
      <div style={{ fontSize: 10, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>{hash || "—"}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message || "—"}</div>
      <div style={{ fontSize: 11, color: "var(--text-6)" }}>{date || ""}</div>
    </div>
  );
}

const STEPS_DEF = [
  { key: "pull",  ok: "pull_ok",  labelKey: "update.stepPull",    hintKey: "update.stepPullHint" },
  { key: "rm",    ok: "rm_ok",    labelKey: "update.stepRemove" },
  { key: "up",    ok: "up_ok",    labelKey: "update.stepStart" },
  { key: "self",  ok: "done",     labelKey: "update.stepRestart" },
];

function UpdateDialog({ entries, restarting, waiting, debugLog }) {
  const { t } = useI18n();
  const logRef = React.useRef(null);
  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries, restarting]);

  function stepStatus(key, okKey) {
    const hasOk    = entries.some(e => e.step === okKey);
    const hasStart = entries.some(e => e.step === key);
    const hasErr   = entries.some(e => e.step === "error");
    if (hasOk)    return "ok";
    if (hasErr && hasStart && !hasOk) return "error";
    if (hasStart) return "running";
    return "pending";
  }

  const isDone  = entries.some(e => e.step === "done");
  const isError = entries.some(e => e.step === "error");
  const errorMsg = (entries.find(e => e.step === "error") || {}).detail || (entries.find(e => e.step === "error") || {}).msg || "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(12px) } to { opacity:1;transform:translateY(0) } }
      `}</style>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-3)", borderRadius: 14, padding: "28px 32px", width: 480, maxWidth: "95vw", animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Icon name="refresh" size={18} style={{ color: "var(--accent)", animation: isDone || isError ? "none" : "spin 1.2s linear infinite" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>{t("update.dialogTitle")}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {STEPS_DEF.map(({ key, ok, labelKey, hintKey }) => {
            const status   = stepStatus(key, ok);
            const label    = t(labelKey);
            const hint     = hintKey ? t(hintKey) : undefined;
            const entryMsg = (entries.find(e => e.step === key) || {}).msg || "";
            return (
              <div key={key} style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 22, paddingTop: 2, display: "flex", alignItems: "flex-start", justifyContent: "center", flexShrink: 0 }}>
                  {status === "ok"      && <Icon name="circle-check" size={16} style={{ color: "#4ade80" }} />}
                  {status === "running" && <Icon name="loader-2"     size={16} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />}
                  {status === "error"   && <Icon name="circle-x"     size={16} style={{ color: "var(--red-s)" }} />}
                  {status === "pending" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-3)", marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: status === "ok" ? "var(--text-3)" : status === "running" ? "var(--text-1)" : status === "error" ? "var(--red-s)" : "var(--text-6)", fontWeight: status === "running" ? 600 : 400 }}>
                    {label}
                    {status === "running" && <span style={{ color: "var(--text-5)" }}> …</span>}
                    {status === "ok"      && <span style={{ color: "#4ade80", fontSize: 11, marginLeft: 6 }}>✓</span>}
                  </span>
                  {status === "running" && hint && (
                    <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 3 }}>{hint}</div>
                  )}
                  {status === "running" && entryMsg && (
                    <div style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entryMsg}>
                      {entryMsg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(restarting || waiting) && (
          <div style={{ borderTop: "1px solid var(--border-2)", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="loader-2" size={14} style={{ color: "var(--blue)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-5)" }}>
              {restarting ? t("update.waitingServer") : t("update.waitingContainer")}
            </span>
          </div>
        )}

        {debugLog && debugLog.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, color: "var(--text-6)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.6px" }}>{t("update.diagLog")}</div>
            <pre style={{ fontSize: 10, color: "var(--text-5)", background: "var(--bg-page)", borderRadius: 6, padding: "8px 10px", margin: 0, overflowY: "auto", maxHeight: 120, whiteSpace: "pre-wrap" }}>{debugLog.join("\n")}</pre>
          </div>
        )}

        {isError && (
          <div style={{ borderTop: "1px solid var(--red-bg)", paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "var(--red-s)", marginBottom: 6, fontWeight: 600 }}>{t("update.errorDetails")}</div>
            <pre style={{ fontSize: 11, color: "var(--text-3)", background: "var(--bg-nav)", borderRadius: 6, padding: "10px 12px", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap", maxHeight: 140 }}>{errorMsg}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpdatePage({ toast }) {
  const { t } = useI18n();
  const [info, setInfo]             = useState(null);
  const [changelog, setChangelog]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [logEntries, setLogEntries] = useState([]);
  const [restarting, setRestarting] = useState(false);
  const [waiting, setWaiting]       = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [debugLog, setDebugLog]     = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [v, c] = await Promise.all([
      api("GET", "/api/update/version"),
      api("GET", "/api/update/changelog"),
    ]);
    if (!v.error) setInfo(v);
    if (Array.isArray(c)) setChangelog(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runUpdate() {
    if (!confirm(t("update.confirmPrompt"))) return;
    setLogEntries([]);
    setRestarting(false);
    setWaiting(false);
    setDebugLog([]);
    setShowDialog(true);

    try {
      const r = await fetch("/api/update/run", { method: "POST" });
      if (!r.ok) {
        setLogEntries([{ step: "error", msg: `HTTP ${r.status}`, detail: await r.text() }]);
        return;
      }
    } catch (e) {
      setLogEntries([{ step: "error", msg: String(e) }]);
      return;
    }

    let errStreak = 0;
    let lastStep = "";
    let wasDisconnected = false;

    function startHealthPoll() {
      const healthPoll = setInterval(async () => {
        try {
          const h = await fetch("/health");
          if (h.ok) { clearInterval(healthPoll); window.location.reload(); }
        } catch {}
      }, 3000);
    }

    const poll = setInterval(async () => {
      try {
        const r = await fetch("/api/update/status");
        if (!r.ok) {
          errStreak++;
          if (lastStep && lastStep !== "pull") { setWaiting(true); wasDisconnected = true; }
          return;
        }
        errStreak = 0;
        setWaiting(false);
        const s = await r.json();
        if (Array.isArray(s.log) && s.log.length > 0) setDebugLog(s.log);
        if (s.step) {
          lastStep = s.step;
          setLogEntries(prev => {
            const last = prev.find(e => e.step === s.step);
            if (last && last.msg === s.msg) return prev;
            return [...prev.filter(e => e.step !== s.step && e.step !== "error"), s];
          });
        }
        if (s.done) {
          clearInterval(poll);
          setRestarting(true);
          setWaiting(false);
          startHealthPoll();
          return;
        }
        if (s.error) {
          clearInterval(poll);
          setWaiting(false);
          toast("err", s.msg);
          setLogEntries(prev => [...prev.filter(e => e.step !== "error"), { step: "error", msg: s.msg, detail: s.detail || "" }]);
          return;
        }
        // Updater wurde neu gestartet (Status null) nachdem wir Fortschritt hatten
        // → Update abgeschlossen, auf Server warten
        if (!s.step && !s.done && !s.error && wasDisconnected && lastStep) {
          clearInterval(poll);
          setRestarting(true);
          setWaiting(false);
          startHealthPoll();
        }
      } catch {
        errStreak++;
        if (lastStep && lastStep !== "pull") { setWaiting(true); wasDisconnected = true; }
        // 5 Min. Toleranz (Pull + Container-Neustart können lange dauern)
        if (errStreak > 150) {
          clearInterval(poll);
          setWaiting(false);
          setLogEntries(prev => [...prev.filter(e => e.step !== "error"), {
            step: "error",
            msg: t("update.errorLostConnection"),
            detail: t("update.errorLostConnectionDetail"),
          }]);
        }
      }
    }, 2000);
  }

  return (
    <div>
      {showDialog && <UpdateDialog entries={logEntries} restarting={restarting} waiting={waiting} debugLog={debugLog} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("update.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>
          {t("update.subtitle")}
        </p>
      </div>

      <Card title={t("update.cardVersionStatus")} icon="git-commit"
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {info && <Badge ok={info.up_to_date} />}
            <button style={btnSecondary} onClick={load} disabled={loading}>
              <Icon name="refresh" size={13} />{t("update.check")}
            </button>
            {info && !info.up_to_date && (
              <button style={btnPrimary} onClick={runUpdate} disabled={loading}>
                <Icon name="download" size={14} />
                {t("update.btnUpdate", { behind: info.behind, s: info.behind !== 1 ? "s" : "" })}
              </button>
            )}
          </div>
        }>
        {loading ? (
          <div style={{ color: "var(--text-6)", fontSize: 13 }}>{t("update.connecting")}</div>
        ) : !info || info.error ? (
          <div style={{ color: "var(--red-s)", fontSize: 13 }}>{t("update.updaterUnavailable")}</div>
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <VersionBlock label={t("update.versionInstalled")} hash={info.current} message={info.current_message} date={info.current_date} />
            {!info.up_to_date && (
              <>
                <div style={{ display: "flex", alignItems: "center", color: "var(--text-7)", fontSize: 18 }}>→</div>
                <VersionBlock label={t("update.versionAvailable")} hash={info.latest} message={info.latest_message} date={info.latest_date} />
              </>
            )}
          </div>
        )}
      </Card>

      {changelog.length > 0 && (
        <Card title={t("update.cardChanges", { count: changelog.length })} icon="list">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {[t("update.colHash"), t("update.colDescription"), t("update.colDate")].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "5px 10px", fontSize: 11, color: "var(--text-6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "1px solid var(--border-1)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changelog.map(c => (
                <tr key={c.hash} style={{ borderBottom: "1px solid var(--bg-input)" }}>
                  <td style={{ padding: "9px 10px", fontFamily: "monospace", color: "var(--accent)", fontSize: 12 }}>{c.hash}</td>
                  <td style={{ padding: "9px 10px", color: "var(--text-2)" }}>{c.message}</td>
                  <td style={{ padding: "9px 10px", color: "var(--text-6)", fontSize: 12 }}>{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {info && info.up_to_date && !loading && (
        <div style={{ padding: "14px 18px", background: "var(--green-bg)", border: "1px solid var(--green-bd)", borderRadius: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="circle-check" size={16} style={{ color: "var(--green)" }} />
          <span style={{ fontSize: 13, color: "var(--green)" }}>{t("update.upToDate")}</span>
        </div>
      )}
    </div>
  );
}
