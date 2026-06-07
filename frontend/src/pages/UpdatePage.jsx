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
    <div style={{ flex: 1, background: "#111", borderRadius: 10, padding: "14px 16px", border: "1px solid #1e1e1e" }}>
      <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#fce499", fontWeight: 700, marginBottom: 4 }}>{hash || "—"}</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message || "—"}</div>
      <div style={{ fontSize: 11, color: "#444" }}>{date || ""}</div>
    </div>
  );
}

export default function UpdatePage({ toast }) {
  const [info, setInfo]         = useState(null);
  const [changelog, setChangelog] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [restarting, setRestarting] = useState(false);

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
    setUpdating(true);
    const r = await api("POST", "/api/update/run");
    if (r.ok) {
      setRestarting(true);
      setUpdating(false);
      // Poll until backend is reachable again, then reload
      const poll = setInterval(async () => {
        try {
          const res = await fetch("/health");
          if (res.ok) { clearInterval(poll); window.location.reload(); }
        } catch { /* still restarting */ }
      }, 3000);
    } else {
      setUpdating(false);
      toast("err", r.error || "Update fehlgeschlagen");
    }
  }

  if (restarting) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
      <Icon name="refresh" size={32} style={{ color: "#fce499", animation: "spin 1s linear infinite" }} />
      <div style={{ fontSize: 15, fontWeight: 600, color: "#ccc" }}>Container werden neu gestartet…</div>
      <div style={{ fontSize: 12, color: "#555" }}>Seite lädt automatisch sobald der Server wieder erreichbar ist.</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
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
              <button style={btnPrimary} onClick={runUpdate} disabled={updating || loading}>
                <Icon name={updating ? "loader" : "download"} size={14} />
                {updating ? "Wird aktualisiert…" : `Update (${info.behind} Commit${info.behind !== 1 ? "s" : ""})`}
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
            <VersionBlock
              label="Installiert"
              hash={info.current}
              message={info.current_message}
              date={info.current_date}
            />
            {!info.up_to_date && (
              <>
                <div style={{ display: "flex", alignItems: "center", color: "#333", fontSize: 18 }}>→</div>
                <VersionBlock
                  label="Verfügbar (GitHub)"
                  hash={info.latest}
                  message={info.latest_message}
                  date={info.latest_date}
                />
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
