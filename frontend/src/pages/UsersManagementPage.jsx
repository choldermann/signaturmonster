import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../AppContext.jsx";

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;

const inputStyle = { width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--text-2)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary   = { padding: "8px 16px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger    = { padding: "6px 11px", background: "transparent", color: "var(--red-s)", border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

function CreateUserForm({ onSave, onCancel, toast }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!username.trim() || !password) { toast("err", t("common.requiredFields")); return; }
    setSaving(true);
    const r = await api("POST", "/api/users/", { username: username.trim(), password, is_admin: isAdmin });
    if (r.id) { toast("ok", t("users.userCreated")); onSave(); }
    else       { toast("err", r.detail || t("common.error")); }
    setSaving(false);
  }

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--accent-bd)", borderRadius: 12, padding: "18px 22px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 16 }}>{t("users.newUser")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("users.username")}>
          <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder={t("users.usernamePlaceholder")} autoFocus />
        </Field>
        <Field label={t("common.password")}>
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingRight: 38 }} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(s => !s)}
              style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-5)", cursor: "pointer", padding: 0 }}>
              <Icon name={showPass ? "eye-off" : "eye"} size={14} />
            </button>
          </div>
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-4)", cursor: "pointer", marginBottom: 16 }}>
        <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
        {t("users.administrator")}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <Icon name="user-plus" size={14} />{saving ? t("users.creating") : t("users.create")}
        </button>
        <button style={btnSecondary} onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

function PasswordModal({ user, onClose, toast }) {
  const { t } = useI18n();
  const [pw, setPw]         = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pw) { toast("err", t("users.passwordRequired")); return; }
    setSaving(true);
    const r = await api("POST", `/api/users/${user.id}/password`, { password: pw });
    if (r.ok) { toast("ok", t("users.passwordChanged")); onClose(); }
    else       { toast("err", r.detail || t("common.error")); }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-3)", borderRadius: 12, padding: "22px 24px", width: 340 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 16 }}>{t("users.changePassword")} — {user.name}</div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input style={{ ...inputStyle, paddingRight: 38 }} type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder={t("users.newPassword")} autoFocus />
          <button type="button" onClick={() => setShowPw(s => !s)}
            style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-5)", cursor: "pointer" }}>
            <Icon name={showPw ? "eye-off" : "eye"} size={14} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>
            <Icon name="device-floppy" size={14} />{saving ? t("common.saving") : t("common.save")}
          </button>
          <button style={btnSecondary} onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersManagementPage({ toast }) {
  const { t } = useI18n();
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
    if (r.id) { toast("ok", `${u.name} ${t(r.is_admin ? "users.isNowAdmin" : "users.isNoLongerAdmin")}`); load(); }
    else       { toast("err", r.detail || t("common.error")); }
  }

  async function del(u) {
    const r = await api("DELETE", `/api/users/${u.id}`);
    if (r.ok) { toast("ok", `${u.name} ${t("users.deleted")}`); load(); }
    else       { toast("err", r.detail || t("common.error")); }
  }

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("users.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("users.subtitle")}</p>
        </div>
        {!creating && (
          <button style={btnPrimary} onClick={() => setCreating(true)}>
            <Icon name="user-plus" />{t("users.newUser")}
          </button>
        )}
      </div>

      <div style={{ padding: "12px 16px", background: "var(--bg-input)", border: "1px solid var(--accent-bg2)", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <Icon name="shield-lock" size={15} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "var(--text-5)", lineHeight: "18px" }}>
          {t("users.adminOnlyHint")}
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
        <div key={u.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "13px 18px", marginBottom: 7, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.is_admin ? "var(--accent-bg)" : "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="user" size={16} style={{ color: u.is_admin ? "var(--accent)" : "var(--text-5)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
              {u.name}
              {u.is_admin && <span style={{ fontSize: 10, background: "var(--accent-bg)", color: "var(--accent)", padding: "2px 7px", borderRadius: 4 }}>ADMIN</span>}
              {currentUser?.id === u.id && <span style={{ fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 7px", borderRadius: 4 }}>{t("users.me")}</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2, fontFamily: "monospace" }}>{u.email}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              title={u.is_admin ? t("users.revokeAdmin") : t("users.makeAdmin")}
              onClick={() => toggleAdmin(u)}
              disabled={u.is_admin && currentUser?.id === u.id}
              style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>
              <Icon name={u.is_admin ? "shield-off" : "shield"} size={13} />
              {u.is_admin ? t("users.revokeAdmin") : t("users.makeAdmin")}
            </button>
            <button onClick={() => setPwModal(u)} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }}>
              <Icon name="key" size={13} />PW
            </button>
            <button
              onClick={() => del(u)}
              disabled={currentUser?.id === u.id}
              title={currentUser?.id === u.id ? t("users.cannotDeleteSelf") : t("users.deleteUser")}
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
