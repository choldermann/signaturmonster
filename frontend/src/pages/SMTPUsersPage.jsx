import React, { useState, useEffect, useCallback } from "react";

const API = "";
async function api(method, path, body) {
  const token = localStorage.getItem("sm_token");
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inp = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "7px 12px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnDanger = { padding: "7px 12px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

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

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function CertCard({ toast }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/smtp-users/cert-info").then(d => {
      if (d.subject) setInfo(d);
      setLoading(false);
    });
  }, []);

  function download() {
    const token = localStorage.getItem("sm_token");
    fetch("/api/smtp-users/cert", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "signaturmonster-smtp.crt";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast("err", "Zertifikat konnte nicht heruntergeladen werden"));
  }

  const daysColor = !info ? "#666"
    : info.expired    ? "#f87171"
    : info.days_left < 30 ? "#fbbf24"
    : "#6ee7b7";

  return (
    <Card title="TLS-Zertifikat (STARTTLS)" icon="certificate"
      action={
        <button style={btnSecondary} onClick={download} disabled={loading || !info}>
          <Icon name="download" size={13} />Herunterladen
        </button>
      }>
      {loading ? (
        <div style={{ color: "#444", fontSize: 13 }}>Lade…</div>
      ) : !info ? (
        <div style={{ color: "#f87171", fontSize: 13 }}>Kein Zertifikat gefunden</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "CN", value: info.subject },
            { label: "Gültig ab", value: info.not_before },
            { label: "Gültig bis", value: info.not_after },
            { label: "Verbleibend", value: info.expired ? "Abgelaufen" : `${info.days_left} Tage`, color: daysColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#111", borderRadius: 8, padding: "10px 14px", border: "1px solid #1e1e1e" }}>
              <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 13, color: color || "#ccc", fontFamily: "monospace", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#444", marginTop: 14, lineHeight: "17px" }}>
        Dieses Zertifikat in Thunderbird importieren: <strong style={{ color: "#666" }}>Einstellungen → Datenschutz & Sicherheit → Zertifikate → Zertifikate anzeigen → Authorities → Importieren</strong>
      </div>
    </Card>
  );
}

function PasswordModal({ user, onClose, onSave, toast }) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pw) return;
    setSaving(true);
    const r = await api("PUT", `/api/smtp-users/${user.id}/password`, { password: pw });
    setSaving(false);
    if (r.ok) { toast("ok", "Passwort geändert"); onClose(); }
    else toast("err", r.detail || "Fehler");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14, padding: 28, width: 360 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
          Passwort ändern — <span style={{ color: "#fce499" }}>{user.username}</span>
        </div>
        <Field label="Neues Passwort">
          <input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()} autoFocus />
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving || !pw}>
            <Icon name="check" size={14} />{saving ? "Speichere…" : "Speichern"}
          </button>
          <button style={btnSecondary} onClick={onClose}><Icon name="x" size={14} />Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

export default function SMTPUsersPage({ toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [pwModal, setPwModal] = useState(null);

  const load = useCallback(async () => {
    const data = await api("GET", "/api/smtp-users/");
    if (Array.isArray(data)) { setUsers(data); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.username.trim() || !form.password) return;
    setCreating(true);
    const r = await api("POST", "/api/smtp-users/", form);
    setCreating(false);
    if (r.id) { toast("ok", `Benutzer "${r.username}" angelegt`); setForm({ username: "", password: "" }); load(); }
    else toast("err", r.detail || "Fehler");
  }

  async function toggle(u) {
    const r = await api("PUT", `/api/smtp-users/${u.id}/toggle`);
    if (r.id) { toast("ok", r.is_active ? "Aktiviert" : "Deaktiviert"); load(); }
    else toast("err", r.detail || "Fehler");
  }

  async function del(u) {
    if (!confirm(`Benutzer "${u.username}" löschen?`)) return;
    const r = await api("DELETE", `/api/smtp-users/${u.id}`);
    if (r.ok) { toast("ok", "Gelöscht"); load(); }
    else toast("err", r.detail || "Fehler");
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>SMTP-Zugänge</h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
          Zugangsdaten für eingehende SMTP-Verbindungen am Proxy (SASL LOGIN/PLAIN). Unabhängig von Web-UI-Benutzern.
        </p>
      </div>

      <CertCard toast={toast} />

      <div style={{ padding: "11px 16px", background: "#1a1a00", border: "1px solid #3a3a00", borderRadius: 10, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="shield-lock" size={15} style={{ color: "#fce499", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#888", lineHeight: "18px" }}>
          Der Proxy erzwingt <strong style={{ color: "#fce499" }}>STARTTLS</strong> und <strong style={{ color: "#fce499" }}>AUTH</strong>.
          Thunderbird: SMTP-Server → Port 587, Sicherheit: STARTTLS, Auth: Normales Passwort.
          Beim ersten Start wird automatisch ein selbstsigniertes Zertifikat erzeugt — Thunderbird fragt einmalig nach Bestätigung.
        </div>
      </div>

      <Card title="Neuen Zugang anlegen" icon="user-plus">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Benutzername">
            <input style={inp} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="max.mustermann" />
          </Field>
          <Field label="Passwort">
            <input style={inp} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && create()} placeholder="Sicheres Passwort" />
          </Field>
        </div>
        <button style={btnPrimary} onClick={create} disabled={creating || !form.username.trim() || !form.password}>
          <Icon name={creating ? "loader" : "plus"} size={14} />{creating ? "Anlegen…" : "Zugang anlegen"}
        </button>
      </Card>

      <Card title={`SMTP-Zugänge (${users.length})`} icon="users">
        {loading ? (
          <div style={{ color: "#444", fontSize: 13 }}>Lade…</div>
        ) : users.length === 0 ? (
          <div style={{ color: "#444", fontSize: 13 }}>Noch keine Zugänge angelegt.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Benutzername", "Status", "Angelegt", "Aktionen"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "10px 10px", color: "#ccc", fontFamily: "monospace" }}>{u.username}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, fontWeight: 600, background: u.is_active ? "#0a1f14" : "#1f1414", color: u.is_active ? "#6ee7b7" : "#f87171", border: `1px solid ${u.is_active ? "#064e3b" : "#7f1d1d"}` }}>
                      {u.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "#444", fontSize: 12 }}>{u.created_at?.slice(0, 10) || "—"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={btnSecondary} onClick={() => setPwModal(u)} title="Passwort ändern">
                        <Icon name="key" size={13} />PW
                      </button>
                      <button style={btnSecondary} onClick={() => toggle(u)} title={u.is_active ? "Deaktivieren" : "Aktivieren"}>
                        <Icon name={u.is_active ? "player-pause" : "player-play"} size={13} />
                        {u.is_active ? "Aus" : "Ein"}
                      </button>
                      <button style={btnDanger} onClick={() => del(u)} title="Löschen">
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {pwModal && <PasswordModal user={pwModal} onClose={() => setPwModal(null)} onSave={load} toast={toast} />}
    </div>
  );
}
