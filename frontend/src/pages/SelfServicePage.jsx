import React, { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../AppContext.jsx";

const API = "";

function authHeaders() {
  const token = localStorage.getItem("sm_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function api(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || r.statusText);
  }
  return r.json();
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = { width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--text-2)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnDanger = { padding: "7px 14px", background: "transparent", color: "var(--red-s)", border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const EMPTY_FORM = {
  first_name: "", last_name: "", job_title: "", company: "",
  phone: "", mobile: "", street: "", postal_code: "", city: "", country: "",
  photo_url: "",
};

export default function SelfServicePage({ toast }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(undefined); // undefined = loading
  const [unclaimed, setUnclaimed] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const photoInputRef = useRef(null);

  const loadProfile = useCallback(async () => {
    try {
      const p = await api("GET", "/api/senders/me");
      setProfile(p);
      if (p) {
        setForm({
          first_name: p.first_name || "", last_name: p.last_name || "",
          job_title: p.job_title || "", company: p.company || "",
          phone: p.phone || "", mobile: p.mobile || "",
          street: p.street || "", postal_code: p.postal_code || "",
          city: p.city || "", country: p.country || "",
          photo_url: p.photo_url || "",
        });
      }
    } catch {
      setProfile(null);
    }
  }, []);

  const loadUnclaimed = useCallback(async () => {
    try {
      const list = await api("GET", "/api/senders/unclaimed");
      setUnclaimed(list);
    } catch {
      setUnclaimed([]);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile === null) loadUnclaimed();
  }, [profile, loadUnclaimed]);

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setDirty(true);
  }

  async function claim(senderId) {
    try {
      await api("POST", `/api/senders/me/claim/${senderId}`);
      toast("ok", t("selfservice.toastClaimed"));
      loadProfile();
    } catch (e) {
      toast("err", e.message);
    }
  }

  async function releaseClaim() {
    if (!confirm(t("selfservice.confirmRelease"))) return;
    try {
      await api("DELETE", "/api/senders/me/claim");
      toast("ok", t("selfservice.toastReleased"));
      setProfile(null);
      setForm(EMPTY_FORM);
      setDirty(false);
      loadUnclaimed();
    } catch (e) {
      toast("err", e.message);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api("PUT", "/api/senders/me", form);
      setProfile(updated);
      setDirty(false);
      toast("ok", t("selfservice.toastSaved"));
    } catch (e) {
      toast("err", e.message);
    }
    setSaving(false);
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      const token = localStorage.getItem("sm_token");
      const r = await fetch("/api/images/", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!r.ok) throw new Error(t("selfservice.uploadFailed"));
      const img = await r.json();
      const url = `/api/images/${img.id}/serve`;
      setForm(f => ({ ...f, photo_url: url }));
      setDirty(true);
      toast("ok", t("selfservice.toastPhotoUploaded"));
    } catch (e) {
      toast("err", e.message);
    }
    setUploading(false);
  }

  if (profile === undefined) {
    return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("selfservice.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>
          {t("selfservice.subtitle")}
        </p>
      </div>

      {/* ── Kein Profil verknüpft ──────────────────────────────────── */}
      {profile === null && (
        <>
          <div style={{ padding: "16px 20px", background: "var(--bg-input)", border: "1px solid var(--blue-bd)", borderRadius: 10, marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icon name="info-circle" size={16} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{t("selfservice.noProfileTitle")}</div>
              <div style={{ fontSize: 12, color: "var(--text-5)", marginTop: 3, lineHeight: "18px" }}>
                {t("selfservice.noProfileHint")}
              </div>
            </div>
          </div>

          {unclaimed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
              <Icon name="at" size={36} style={{ display: "block", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, color: "var(--text-5)" }}>{t("selfservice.noUnclaimedTitle")}</div>
              <div style={{ fontSize: 12, color: "var(--text-7)", marginTop: 6 }}>
                {t("selfservice.noUnclaimedHint")}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
                {t("selfservice.availableProfiles")}
              </div>
              {unclaimed.map(s => (
                <div key={s.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    {s.photo_url
                      ? <img src={s.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                      : <Icon name="user" size={16} style={{ color: "var(--text-6)" }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                      {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}`.trim() : "—"}
                      {s.job_title && <span style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 400, marginLeft: 8 }}>{s.job_title}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-5)", marginTop: 2, fontFamily: "monospace" }}>{s.email}</div>
                  </div>
                  <button style={{ ...btnPrimary, padding: "7px 14px", fontSize: 12 }} onClick={() => claim(s.id)}>
                    <Icon name="link" size={13} /> {t("selfservice.btnClaim")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Profil vorhanden → Bearbeitungsformular ────────────────── */}
      {profile && (
        <>
          {/* Header: E-Mail + Verknüpfung aufheben */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {form.photo_url
                ? <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                : <Icon name="user" size={16} style={{ color: "var(--text-6)" }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-5)", fontFamily: "monospace" }}>{profile.email}</div>
            </div>
            <button style={btnDanger} onClick={releaseClaim}>
              <Icon name="unlink" size={13} /> {t("selfservice.btnRelease")}
            </button>
          </div>

          {/* Foto-Upload */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="photo" size={13} style={{ color: "var(--accent)" }} /> {t("selfservice.sectionPhoto")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bg-nav)", border: "2px solid var(--border-3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {form.photo_url
                  ? <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                  : <Icon name="user" size={28} style={{ color: "var(--text-7)" }} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file" accept="image/*" ref={photoInputRef} style={{ display: "none" }}
                  onChange={e => uploadPhoto(e.target.files?.[0])}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={{ ...btnSecondary, padding: "7px 14px", fontSize: 12 }} onClick={() => photoInputRef.current?.click()} disabled={uploading}>
                    <Icon name={uploading ? "loader-2" : "upload"} size={13} />
                    {uploading ? t("selfservice.uploading") : t("selfservice.btnUploadPhoto")}
                  </button>
                  {form.photo_url && (
                    <button style={{ ...btnDanger, padding: "7px 14px" }} onClick={() => { setForm(f => ({ ...f, photo_url: "" })); setDirty(true); }}>
                      <Icon name="x" size={13} /> {t("selfservice.btnRemovePhoto")}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 6 }}>
                  {t("selfservice.photoHint")}
                </div>
                {form.photo_url && (
                  <div style={{ marginTop: 8 }}>
                    <Field label={t("selfservice.fieldPhotoUrl")}>
                      <input style={{ ...inputStyle, fontSize: 11, fontFamily: "monospace" }} value={form.photo_url} onChange={e => handleChange("photo_url", e.target.value)} placeholder="https://..." />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stammdaten */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="id-badge-2" size={13} style={{ color: "var(--accent)" }} /> {t("selfservice.sectionBaseData")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("selfservice.fieldFirstName")}>
                <input style={inputStyle} value={form.first_name} onChange={e => handleChange("first_name", e.target.value)} placeholder="Max" />
              </Field>
              <Field label={t("selfservice.fieldLastName")}>
                <input style={inputStyle} value={form.last_name} onChange={e => handleChange("last_name", e.target.value)} placeholder="Mustermann" />
              </Field>
              <Field label={t("selfservice.fieldJobTitle")}>
                <input style={inputStyle} value={form.job_title} onChange={e => handleChange("job_title", e.target.value)} placeholder="Geschäftsführer" />
              </Field>
              <Field label={t("selfservice.fieldCompany")}>
                <input style={inputStyle} value={form.company} onChange={e => handleChange("company", e.target.value)} placeholder="Mustermann GmbH" />
              </Field>
            </div>
          </div>

          {/* Kontaktdaten */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="phone" size={13} style={{ color: "var(--accent)" }} /> {t("selfservice.sectionContact")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("selfservice.fieldPhone")}>
                <input style={inputStyle} value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="+49 89 123456" />
              </Field>
              <Field label={t("selfservice.fieldMobile")}>
                <input style={inputStyle} value={form.mobile} onChange={e => handleChange("mobile", e.target.value)} placeholder="+49 170 123456" />
              </Field>
              <Field label={t("selfservice.fieldStreet")}>
                <input style={inputStyle} value={form.street} onChange={e => handleChange("street", e.target.value)} placeholder="Musterstraße 1" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <Field label={t("selfservice.fieldPostalCode")}>
                  <input style={inputStyle} value={form.postal_code} onChange={e => handleChange("postal_code", e.target.value)} placeholder="12345" />
                </Field>
                <Field label={t("selfservice.fieldCity")}>
                  <input style={inputStyle} value={form.city} onChange={e => handleChange("city", e.target.value)} placeholder="München" />
                </Field>
              </div>
              <Field label={t("selfservice.fieldCountry")}>
                <input style={inputStyle} value={form.country} onChange={e => handleChange("country", e.target.value)} placeholder="Deutschland" />
              </Field>
            </div>
          </div>

          {/* Variablen-Referenz */}
          <div style={{ background: "var(--bg-nav)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 8 }}>{t("selfservice.variablesHint")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["{{vorname}}", "{{nachname}}", "{{name}}", "{{email}}", "{{berufsbezeichnung}}", "{{firma}}", "{{telefon}}", "{{mobil}}", "{{strasse}}", "{{plz}}", "{{ort}}", "{{land}}", "{{adresse}}", "{{foto}}"].map(v => (
                <code key={v} style={{ fontSize: 11, background: "var(--bg-input)", color: "var(--accent)", padding: "2px 7px", borderRadius: 4, border: "1px solid var(--accent-bg)" }}>{v}</code>
              ))}
            </div>
          </div>

          {/* Speichern */}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnPrimary, opacity: dirty ? 1 : 0.5 }} onClick={save} disabled={saving || !dirty}>
              <Icon name={saving ? "loader-2" : "device-floppy"} size={15} />
              {saving ? t("common.saving") : t("selfservice.btnSaveChanges")}
            </button>
            {dirty && (
              <button style={btnSecondary} onClick={() => {
                setForm({
                  first_name: profile.first_name || "", last_name: profile.last_name || "",
                  job_title: profile.job_title || "", company: profile.company || "",
                  phone: profile.phone || "", mobile: profile.mobile || "",
                  street: profile.street || "", postal_code: profile.postal_code || "",
                  city: profile.city || "", country: profile.country || "",
                  photo_url: profile.photo_url || "",
                });
                setDirty(false);
              }}>
                {t("selfservice.btnReset")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
