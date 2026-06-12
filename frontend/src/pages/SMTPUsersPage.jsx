import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../AppContext.jsx";

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

const inp = { width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--text-2)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "7px 12px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnDanger = { padding: "7px 12px", background: "transparent", color: "var(--red-s)", border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

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

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function CertCard({ toast }) {
  const { t } = useI18n();
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
      .catch(() => toast("err", t("smtpUsers.certDownloadError")));
  }

  const daysColor = !info ? "var(--text-4)"
    : info.expired    ? "var(--red-s)"
    : info.days_left < 30 ? "var(--yellow)"
    : "var(--green)";

  return (
    <Card title={t("smtpUsers.tlsCert")} icon="certificate"
      action={
        <button style={btnSecondary} onClick={download} disabled={loading || !info}>
          <Icon name="download" size={13} />{t("smtpUsers.download")}
        </button>
      }>
      {loading ? (
        <div style={{ color: "var(--text-6)", fontSize: 13 }}>{t("common.loading")}</div>
      ) : !info ? (
        <div style={{ color: "var(--red)", fontSize: 13 }}>{t("smtpUsers.noCert")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "CN", value: info.subject },
            { label: t("smtpUsers.validFrom"), value: info.not_before },
            { label: t("smtpUsers.validUntil"), value: info.not_after },
            { label: t("smtpUsers.remaining"), value: info.expired ? t("smtpUsers.expired") : `${info.days_left} ${t("smtpUsers.days")}`, color: daysColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--bg-nav)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border-1)" }}>
              <div style={{ fontSize: 10, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 13, color: color || "var(--text-2)", fontFamily: "monospace", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 14, lineHeight: "17px" }}>
        {t("smtpUsers.thunderbirdImportHint")} <strong style={{ color: "var(--text-4)" }}>{t("smtpUsers.thunderbirdImportPath")}</strong>
      </div>
    </Card>
  );
}

function PasswordModal({ user, onClose, onSave, toast }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pw) return;
    setSaving(true);
    const r = await api("PUT", `/api/smtp-users/${user.id}/password`, { password: pw });
    setSaving(false);
    if (r.ok) { toast("ok", t("users.passwordChanged")); onClose(); }
    else toast("err", r.detail || t("common.error"));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-3)", borderRadius: 14, padding: 28, width: 360 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", marginBottom: 20 }}>
          {t("users.changePassword")} — <span style={{ color: "var(--accent)" }}>{user.username}</span>
        </div>
        <Field label={t("users.newPassword")}>
          <input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()} autoFocus />
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving || !pw}>
            <Icon name="check" size={14} />{saving ? t("common.saving") : t("common.save")}
          </button>
          <button style={btnSecondary} onClick={onClose}><Icon name="x" size={14} />{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export default function SMTPUsersPage({ toast }) {
  const { t } = useI18n();
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
    if (r.id) { toast("ok", `${t("smtpUsers.userCreated")} "${r.username}"`); setForm({ username: "", password: "" }); load(); }
    else toast("err", r.detail || t("common.error"));
  }

  async function toggle(u) {
    const r = await api("PUT", `/api/smtp-users/${u.id}/toggle`);
    if (r.id) { toast("ok", r.is_active ? t("smtpUsers.activated") : t("smtpUsers.deactivated")); load(); }
    else toast("err", r.detail || t("common.error"));
  }

  async function del(u) {
    if (!confirm(`${t("smtpUsers.confirmDelete")} "${u.username}"?`)) return;
    const r = await api("DELETE", `/api/smtp-users/${u.id}`);
    if (r.ok) { toast("ok", t("smtpUsers.deleted")); load(); }
    else toast("err", r.detail || t("common.error"));
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("smtpUsers.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>
          {t("smtpUsers.subtitle")}
        </p>
      </div>

      <CertCard toast={toast} />

      <div style={{ padding: "11px 16px", background: "var(--accent-bg2)", border: "1px solid var(--accent-bg)", borderRadius: 10, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="shield-lock" size={15} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: "18px" }}>
          {t("smtpUsers.proxyRequires")} <strong style={{ color: "var(--accent)" }}>STARTTLS</strong> {t("smtpUsers.and")} <strong style={{ color: "var(--accent)" }}>AUTH</strong>.
          {" "}{t("smtpUsers.thunderbirdConfig")}
          {" "}{t("smtpUsers.selfSignedHint")}
        </div>
      </div>

      <Card title={t("smtpUsers.newAccessTitle")} icon="user-plus">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={t("users.username")}>
            <input style={inp} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="max.mustermann" />
          </Field>
          <Field label={t("common.password")}>
            <input style={inp} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && create()} placeholder={t("smtpUsers.securePassword")} />
          </Field>
        </div>
        <button style={btnPrimary} onClick={create} disabled={creating || !form.username.trim() || !form.password}>
          <Icon name={creating ? "loader" : "plus"} size={14} />{creating ? t("smtpUsers.creating") : t("smtpUsers.createAccess")}
        </button>
      </Card>

      <Card title={`${t("smtpUsers.title")} (${users.length})`} icon="users">
        {loading ? (
          <div style={{ color: "var(--text-6)", fontSize: 13 }}>{t("common.loading")}</div>
        ) : users.length === 0 ? (
          <div style={{ color: "var(--text-6)", fontSize: 13 }}>{t("smtpUsers.noAccess")}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {[t("users.username"), t("common.active"), t("smtpUsers.createdAt"), t("smtpUsers.actions")].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "var(--text-6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "1px solid var(--border-1)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--bg-input)" }}>
                  <td style={{ padding: "10px 10px", color: "var(--text-2)", fontFamily: "monospace" }}>{u.username}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, fontWeight: 600, background: u.is_active ? "var(--green-bg)" : "var(--red-bg)", color: u.is_active ? "var(--green)" : "var(--red)", border: `1px solid ${u.is_active ? "var(--green-bd)" : "var(--red-bd)"}` }}>
                      {u.is_active ? t("smtpUsers.statusActive") : t("smtpUsers.statusInactive")}
                    </span>
                  </td>
                  <td style={{ padding: "10px 10px", color: "var(--text-6)", fontSize: 12 }}>{u.created_at?.slice(0, 10) || "—"}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={btnSecondary} onClick={() => setPwModal(u)} title={t("users.changePassword")}>
                        <Icon name="key" size={13} />PW
                      </button>
                      <button style={btnSecondary} onClick={() => toggle(u)} title={u.is_active ? t("smtpUsers.deactivate") : t("smtpUsers.activate")}>
                        <Icon name={u.is_active ? "player-pause" : "player-play"} size={13} />
                        {u.is_active ? t("smtpUsers.off") : t("smtpUsers.on")}
                      </button>
                      <button style={btnDanger} onClick={() => del(u)} title={t("common.delete")}>
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
