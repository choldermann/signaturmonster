import React, { useState, useEffect, useCallback } from "react";

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;

const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary   = { padding: "8px 16px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger    = { padding: "6px 11px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

function CreateUserForm({ onSave, onCancel, toast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!username.trim() || !password) { toast("err", "Bitte alle Felder ausfüllen"); return; }
    setSaving(true);
    const r = await api("POST", "/api/users/", { username: username.trim(), password, is_admin: isAdmin });
    if (r.id) { toast("ok", "Benutzer angelegt"); onSave(); }
    else       { toast("err", r.detail || "Fehler"); }
    setSaving(false);
  }

  return (
    <div style={{ background: "#161616", border: "1px solid #fce49944", borderRadius: 12, padding: "18px 22px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fce499", marginBottom: 16 }}>Neuer Benutzer</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Benutzername">
          <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="z.B. max" autoFocus />
        </Field>
        <Field label="Passwort">
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingRight: 38 }} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(s => !s)}
              style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", padding: 0 }}>
              <Icon name={showPass ? "eye-off" : "eye"} size={14} />
            </button>
          </div>
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#777", cursor: "pointer", marginBottom: 16 }}>
        <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
        Administrator
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <Icon name="user-plus" size={14} />{saving ? "Erstelle…" : "Anlegen"}
        </button>
        <button style={btnSecondary} onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  );
}

function PasswordModal({ user, onClose, toast }) {
  const [pw, setPw]         = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pw) { toast("err", "Passwort darf nicht leer sein"); return; }
    setSaving(true);
    const r = await api("POST", `/api/users/${user.id}/password`, { password: pw });
    if (r.ok) { toast("ok", "Passwort geändert"); onClose(); }
    else       { toast("err", r.detail || "Fehler"); }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12, padding: "22px 24px", width: 340 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Passwort ändern — {user.name}</div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input style={{ ...inputStyle, paddingRight: 38 }} type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Neues Passwort" autoFocus />
          <button type="button" onClick={() => setShowPw(s => !s)}
            style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer" }}>
            <Icon name={showPw ? "eye-off" : "eye"} size={14} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>
            <Icon name="device-floppy" size={14} />{saving ? "Speichern…" : "Speichern"}
          </button>
          <button style={btnSecondary} onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersManagementPage({ toast }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pwModal, setPwModal] = useState(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("sm_user")); } catch { return null; } })();

  const load = useCallback(async () => {
    const d = await api("GET", "/api/users/");
    setUsers(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAdmin(u) {
    const r = await api("PUT", `/api/users/${u.id}`, { is_admin: !u.is_admin });
    if (r.id) { toast("ok", `${u.name} ist jetzt ${r.is_admin ? "Administrator" : "kein Administrator"}`); load(); }
    else       { toast("err", r.detail || "Fehler"); }
  }

  async function del(u) {
    const r = await api("DELETE", `/api/users/${u.id}`);
    if (r.ok) { toast("ok", `${u.name} gelöscht`); load(); }
    else       { toast("err", r.detail || "Fehler"); }
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Benutzer</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Zugang zur Signaturmonster-Plattform — nur Administratoren.</p>
        </div>
        {!creating && (
          <button style={btnPrimary} onClick={() => setCreating(true)}>
            <Icon name="user-plus" />Neuer Benutzer
          </button>
        )}
      </div>

      <div style={{ padding: "12px 16px", background: "#1a1a1a", border: "1px solid #fce49922", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <Icon name="shield-lock" size={15} style={{ color: "#fce499", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#555", lineHeight: "18px" }}>
          Neue Benutzer können nur von Administratoren angelegt werden. Jeder Benutzer hat vollen Zugriff auf die Plattform. Der letzte Administrator kann nicht degradiert werden.
        </div>
      </div>

      {creating && (
        <CreateUserForm
          toast={toast}
          onSave={() => { setCreating(false); load(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {users.map(u => (
        <div key={u.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "13px 18px", marginBottom: 7, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.is_admin ? "#2a2a00" : "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="user" size={16} style={{ color: u.is_admin ? "#fce499" : "#555" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 8 }}>
              {u.name}
              {u.is_admin && <span style={{ fontSize: 10, background: "#2a2a00", color: "#fce499", padding: "2px 7px", borderRadius: 4 }}>ADMIN</span>}
              {currentUser?.id === u.id && <span style={{ fontSize: 10, background: "#1a2a1a", color: "#6ee7b7", padding: "2px 7px", borderRadius: 4 }}>ICH</span>}
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 2, fontFamily: "monospace" }}>{u.email}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              title={u.is_admin ? "Admin-Rechte entziehen" : "Zum Admin machen"}
              onClick={() => toggleAdmin(u)}
              disabled={u.is_admin && currentUser?.id === u.id}
              style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>
              <Icon name={u.is_admin ? "shield-off" : "shield"} size={13} />
              {u.is_admin ? "Admin entziehen" : "Zum Admin"}
            </button>
            <button onClick={() => setPwModal(u)} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>
              <Icon name="key" size={13} />PW
            </button>
            <button
              onClick={() => del(u)}
              disabled={currentUser?.id === u.id}
              title={currentUser?.id === u.id ? "Eigenen Account nicht löschbar" : "Benutzer löschen"}
              style={{ ...btnDanger, opacity: currentUser?.id === u.id ? 0.3 : 1 }}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
      ))}

      {pwModal && <PasswordModal user={pwModal} toast={toast} onClose={() => setPwModal(null)} />}
    </div>
  );
}
