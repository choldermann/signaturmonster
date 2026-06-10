import React, { useState, useEffect, useCallback } from "react";

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

const btnPrimary  = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };

function Card({ title, icon, children, action }) {
  return (
    <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {icon && <Icon name={icon} size={15} style={{ color: "#fce499" }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function Badge({ ok }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
      background: ok ? "#0a1f14" : "#1a1400",
      color: ok ? "#6ee7b7" : "#fce499",
      border: `1px solid ${ok ? "#064e3b" : "#78600a"}`,
    }}>
      {ok ? "Aktuell" : "Update verfügbar"}
    </span>
  );
}

function VersionBlock({ label, hash, message, date }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "#111", borderRadius: 10, padding: "14px 16px", border: "1px solid #1e1e1e" }}>
      <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fce499", fontWeight: 700, marginBottom: 4 }}>{hash || "—"}</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message || "—"}</div>
      <div style={{ fontSize: 11, color: "#444" }}>{date || ""}</div>
    </div>
  );
}

const STEPS = [
  { key: "pull",  ok: "pull_ok",  label: "Images laden",            hint: "Kann je nach Internetgeschwindigkeit 2–5 Min. dauern" },
  { key: "rm",    ok: "rm_ok",    label: "Alte Container entfernen" },
  { key: "up",    ok: "up_ok",    label: "Neue Container starten"   },
  { key: "self",  ok: "done",     label: "Updater neu starten"      },
];

function UpdateDialog({ entries, restarting, waiting }) {
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
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14, padding: "28px 32px", width: 480, maxWidth: "95vw", animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Icon name="refresh" size={18} style={{ color: "#fce499", animation: isDone || isError ? "none" : "spin 1.2s linear infinite" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Software-Update</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {STEPS.map(({ key, ok, label, hint }) => {
            const status   = stepStatus(key, ok);
            const entryMsg = (entries.find(e => e.step === key) || {}).msg || "";
            return (
              <div key={key} style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 22, paddingTop: 2, display: "flex", alignItems: "flex-start", justifyContent: "center", flexShrink: 0 }}>
                  {status === "ok"      && <Icon name="circle-check" size={16} style={{ color: "#4ade80" }} />}
                  {status === "running" && <Icon name="loader-2"     size={16} style={{ color: "#fce499", animation: "spin 1s linear infinite" }} />}
                  {status === "error"   && <Icon name="circle-x"     size={16} style={{ color: "#f87171" }} />}
                  {status === "pending" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2a2a", marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: status === "ok" ? "#aaa" : status === "running" ? "#fff" : status === "error" ? "#f87171" : "#444", fontWeight: status === "running" ? 600 : 400 }}>
                    {label}
                    {status === "running" && <span style={{ color: "#555" }}> …</span>}
                    {status === "ok"      && <span style={{ color: "#4ade80", fontSize: 11, marginLeft: 6 }}>✓</span>}
                  </span>
                  {status === "running" && hint && (
                    <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{hint}</div>
                  )}
                  {status === "running" && entryMsg && (
                    <div style={{ fontSize: 11, color: "#666", fontFamily: "monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entryMsg}>
                      {entryMsg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(restarting || waiting) && (
          <div style={{ borderTop: "1px solid #222", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="loader-2" size={14} style={{ color: "#93c5fd", animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#555" }}>
              {restarting
                ? "Warte auf Server … Seite lädt automatisch neu."
                : "Container werden neu gestartet — Statusabfrage pausiert kurz."}
            </span>
          </div>
        )}

        {isError && (
          <div style={{ borderTop: "1px solid #3a1a1a", paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6, fontWeight: 600 }}>Fehlerdetails</div>
            <pre style={{ fontSize: 11, color: "#888", background: "#111", borderRadius: 6, padding: "10px 12px", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap", maxHeight: 140 }}>{errorMsg}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpdatePage({ toast }) {
  const [info, setInfo]             = useState(null);
  const [changelog, setChangelog]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [logEntries, setLogEntries] = useState([]);
  const [restarting, setRestarting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

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
    if (!confirm("Jetzt updaten? Die Anwendung wird neu gestartet.")) return;
    setLogEntries([]);
    setRestarting(false);
    setWaiting(false);
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
    const poll = setInterval(async () => {
      try {
        const r = await fetch("/api/update/status");
        if (!r.ok) {
          errStreak++;
          if (lastStep && lastStep !== "pull") setWaiting(true);
          return;
        }
        errStreak = 0;
        setWaiting(false);
        const s = await r.json();
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
          const healthPoll = setInterval(async () => {
            try {
              const h = await fetch("/health");
              if (h.ok) { clearInterval(healthPoll); window.location.reload(); }
            } catch {}
          }, 3000);
        }
        if (s.error) {
          clearInterval(poll);
          setWaiting(false);
          toast("err", s.msg);
          setLogEntries(prev => [...prev.filter(e => e.step !== "error"), { step: "error", msg: s.msg, detail: s.detail || "" }]);
        }
      } catch {
        errStreak++;
        if (lastStep && lastStep !== "pull") setWaiting(true);
        // 5 Min. Toleranz (Pull + Container-Neustart können lange dauern)
        if (errStreak > 150) {
          clearInterval(poll);
          setWaiting(false);
          setLogEntries(prev => [...prev.filter(e => e.step !== "error"), {
            step: "error",
            msg: "Verbindung zum Updater verloren",
            detail: "Der Updater antwortet seit über 5 Minuten nicht. Prüfe mit 'docker ps', ob das Update im Hintergrund abgeschlossen wurde.",
          }]);
        }
      }
    }, 2000);
  }

  return (
    <div>
      {showDialog && <UpdateDialog entries={logEntries} restarting={restarting} waiting={waiting} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Software-Update</h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
          Updates werden als fertige Container aus der GitHub Container Registry geladen.
        </p>
      </div>

      <Card title="Versionsstatus" icon="git-commit"
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {info && <Badge ok={info.up_to_date} />}
            <button style={btnSecondary} onClick={load} disabled={loading}>
              <Icon name="refresh" size={13} />Prüfen
            </button>
            {info && !info.up_to_date && (
              <button style={btnPrimary} onClick={runUpdate} disabled={loading}>
                <Icon name="download" size={14} />
                {`Update (${info.behind} Commit${info.behind !== 1 ? "s" : ""})`}
              </button>
            )}
          </div>
        }>
        {loading ? (
          <div style={{ color: "#444", fontSize: 13 }}>Verbinde mit GitHub…</div>
        ) : !info || info.error ? (
          <div style={{ color: "#f87171", fontSize: 13 }}>Updater nicht erreichbar — läuft der sm-updater Container?</div>
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <VersionBlock label="Installiert" hash={info.current} message={info.current_message} date={info.current_date} />
            {!info.up_to_date && (
              <>
                <div style={{ display: "flex", alignItems: "center", color: "#333", fontSize: 18 }}>→</div>
                <VersionBlock label="Verfügbar (GitHub)" hash={info.latest} message={info.latest_message} date={info.latest_date} />
              </>
            )}
          </div>
        )}
      </Card>

      {changelog.length > 0 && (
        <Card title={`Änderungen (${changelog.length})`} icon="list">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Hash", "Beschreibung", "Datum"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "5px 10px", fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changelog.map(c => (
                <tr key={c.hash} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "9px 10px", fontFamily: "monospace", color: "#fce499", fontSize: 12 }}>{c.hash}</td>
                  <td style={{ padding: "9px 10px", color: "#ccc" }}>{c.message}</td>
                  <td style={{ padding: "9px 10px", color: "#444", fontSize: 12 }}>{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {info && info.up_to_date && !loading && (
        <div style={{ padding: "14px 18px", background: "#0a1f14", border: "1px solid #064e3b", borderRadius: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="circle-check" size={16} style={{ color: "#6ee7b7" }} />
          <span style={{ fontSize: 13, color: "#6ee7b7" }}>Signaturmonster ist auf dem neuesten Stand.</span>
        </div>
      )}
    </div>
  );
}
