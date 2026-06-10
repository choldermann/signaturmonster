import React, { useState, useEffect, useCallback, useRef } from "react";

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

const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnDanger = { padding: "7px 14px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const EMPTY_FORM = {
  first_name: "", last_name: "", job_title: "", company: "",
  phone: "", mobile: "", street: "", postal_code: "", city: "", country: "",
  photo_url: "",
};

export default function SelfServicePage({ toast }) {
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
      toast("ok", "Profil verknüpft");
      loadProfile();
    } catch (e) {
      toast("err", e.message);
    }
  }

  async function releaseClaim() {
    if (!confirm("Verknüpfung wirklich aufheben? Du kannst danach ein anderes Profil wählen.")) return;
    try {
      await api("DELETE", "/api/senders/me/claim");
      toast("ok", "Verknüpfung aufgehoben");
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
      toast("ok", "Profil gespeichert");
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
      if (!r.ok) throw new Error("Upload fehlgeschlagen");
      const img = await r.json();
      const url = `/api/images/${img.id}/serve`;
      setForm(f => ({ ...f, photo_url: url }));
      setDirty(true);
      toast("ok", "Foto hochgeladen");
    } catch (e) {
      toast("err", e.message);
    }
    setUploading(false);
  }

  if (profile === undefined) {
    return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Mein Profil</h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
          Deine Kontaktdaten werden automatisch in Signaturen eingesetzt.
        </p>
      </div>

      {/* ── Kein Profil verknüpft ──────────────────────────────────── */}
      {profile === null && (
        <>
          <div style={{ padding: "16px 20px", background: "#1a1a1a", border: "1px solid #fce49933", borderRadius: 10, marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icon name="info-circle" size={16} style={{ color: "#fce499", marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fce499" }}>Noch kein Profil verknüpft</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 3, lineHeight: "18px" }}>
                Wähle unten deine E-Mail-Adresse aus, um dein Sender-Profil zu verwalten. Deine Angaben werden dann automatisch in ausgehende Mails eingesetzt.
              </div>
            </div>
          </div>

          {unclaimed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
              <Icon name="at" size={36} style={{ display: "block", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, color: "#555" }}>Keine offenen Profile verfügbar</div>
              <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>
                Ein Administrator muss zuerst ein Sender-Profil für deine E-Mail-Adresse anlegen.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
                Verfügbare Profile — wähle deines:
              </div>
              {unclaimed.map(s => (
                <div key={s.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    {s.photo_url
                      ? <img src={s.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                      : <Icon name="user" size={16} style={{ color: "#444" }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>
                      {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}`.trim() : "—"}
                      {s.job_title && <span style={{ fontSize: 11, color: "#555", fontWeight: 400, marginLeft: 8 }}>{s.job_title}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2, fontFamily: "monospace" }}>{s.email}</div>
                  </div>
                  <button style={{ ...btnPrimary, padding: "7px 14px", fontSize: 12 }} onClick={() => claim(s.id)}>
                    <Icon name="link" size={13} /> Verknüpfen
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
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {form.photo_url
                ? <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                : <Icon name="user" size={16} style={{ color: "#444" }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>
                {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : "—"}
              </div>
              <div style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>{profile.email}</div>
            </div>
            <button style={btnDanger} onClick={releaseClaim}>
              <Icon name="unlink" size={13} /> Verknüpfung aufheben
            </button>
          </div>

          {/* Foto-Upload */}
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="photo" size={13} style={{ color: "#fce499" }} /> Profilfoto
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#111", border: "2px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {form.photo_url
                  ? <img src={form.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                  : <Icon name="user" size={28} style={{ color: "#333" }} />
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
                    {uploading ? "Lade hoch..." : "Foto hochladen"}
                  </button>
                  {form.photo_url && (
                    <button style={{ ...btnDanger, padding: "7px 14px" }} onClick={() => { setForm(f => ({ ...f, photo_url: "" })); setDirty(true); }}>
                      <Icon name="x" size={13} /> Entfernen
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
                  JPG, PNG oder GIF · max. 5 MB
                </div>
                {form.photo_url && (
                  <div style={{ marginTop: 8 }}>
                    <Field label="Foto-URL">
                      <input style={{ ...inputStyle, fontSize: 11, fontFamily: "monospace" }} value={form.photo_url} onChange={e => handleChange("photo_url", e.target.value)} placeholder="https://..." />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stammdaten */}
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="id-badge-2" size={13} style={{ color: "#fce499" }} /> Stammdaten
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Vorname">
                <input style={inputStyle} value={form.first_name} onChange={e => handleChange("first_name", e.target.value)} placeholder="Max" />
              </Field>
              <Field label="Nachname">
                <input style={inputStyle} value={form.last_name} onChange={e => handleChange("last_name", e.target.value)} placeholder="Mustermann" />
              </Field>
              <Field label="Berufsbezeichnung">
                <input style={inputStyle} value={form.job_title} onChange={e => handleChange("job_title", e.target.value)} placeholder="Geschäftsführer" />
              </Field>
              <Field label="Firma">
                <input style={inputStyle} value={form.company} onChange={e => handleChange("company", e.target.value)} placeholder="Mustermann GmbH" />
              </Field>
            </div>
          </div>

          {/* Kontaktdaten */}
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="phone" size={13} style={{ color: "#fce499" }} /> Kontakt & Adresse
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Telefon">
                <input style={inputStyle} value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="+49 89 123456" />
              </Field>
              <Field label="Mobil">
                <input style={inputStyle} value={form.mobile} onChange={e => handleChange("mobile", e.target.value)} placeholder="+49 170 123456" />
              </Field>
              <Field label="Straße & Hausnummer">
                <input style={inputStyle} value={form.street} onChange={e => handleChange("street", e.target.value)} placeholder="Musterstraße 1" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <Field label="PLZ">
                  <input style={inputStyle} value={form.postal_code} onChange={e => handleChange("postal_code", e.target.value)} placeholder="12345" />
                </Field>
                <Field label="Ort">
                  <input style={inputStyle} value={form.city} onChange={e => handleChange("city", e.target.value)} placeholder="München" />
                </Field>
              </div>
              <Field label="Land">
                <input style={inputStyle} value={form.country} onChange={e => handleChange("country", e.target.value)} placeholder="Deutschland" />
              </Field>
            </div>
          </div>

          {/* Variablen-Referenz */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>Verfügbare Variablen in Signaturen:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["{{vorname}}", "{{nachname}}", "{{name}}", "{{email}}", "{{berufsbezeichnung}}", "{{firma}}", "{{telefon}}", "{{mobil}}", "{{strasse}}", "{{plz}}", "{{ort}}", "{{land}}", "{{adresse}}", "{{foto}}"].map(v => (
                <code key={v} style={{ fontSize: 11, background: "#1a1a1a", color: "#fce499", padding: "2px 7px", borderRadius: 4, border: "1px solid #2a2a00" }}>{v}</code>
              ))}
            </div>
          </div>

          {/* Speichern */}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btnPrimary, opacity: dirty ? 1 : 0.5 }} onClick={save} disabled={saving || !dirty}>
              <Icon name={saving ? "loader-2" : "device-floppy"} size={15} />
              {saving ? "Speichere..." : "Änderungen speichern"}
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
                Zurücksetzen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
