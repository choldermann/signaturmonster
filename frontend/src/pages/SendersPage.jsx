import React, { useState, useEffect, useCallback } from "react";

const API = "";
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const iStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "8px 14px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger = { padding: "7px 10px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

const EMPTY = { email: "", first_name: "", last_name: "", job_title: "", photo_url: "", phone: "", mobile: "", street: "", postal_code: "", city: "", country: "", company: "" };

function Avatar({ sender, size = 44 }) {
  const initials = [sender.first_name?.[0], sender.last_name?.[0]].filter(Boolean).join("").toUpperCase() || sender.email?.[0]?.toUpperCase() || "?";
  if (sender.photo_url) {
    return <img src={sender.photo_url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #2a2a2a", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#2a2a2a", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#fce499", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function SenderEditor({ sender, onSave, onCancel, toast }) {
  const [form, setForm] = useState(sender ? { ...sender } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.email.trim()) { toast("err", "E-Mail-Adresse ist Pflichtfeld"); return; }
    setSaving(true);
    try {
      if (sender?.id) { await api("PUT", `/api/senders/${sender.id}`, form); toast("ok", "Benutzer gespeichert"); }
      else { await api("POST", "/api/senders/", form); toast("ok", "Benutzer erstellt"); }
      onSave();
    } catch { toast("err", "Fehler beim Speichern"); }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={btnSecondary}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> Zurück
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, flex: 1 }}>
          {sender?.id ? "Benutzer bearbeiten" : "Neuer Benutzer"}
        </h1>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />{saving ? "Speichern..." : "Speichern"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div>
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-id-badge" style={{ color: "#fce499" }} /> Stammdaten
            </div>
            <Field label="E-Mail-Adresse (Absender)">
              <input style={iStyle} type="email" value={form.email} onChange={e => u("email", e.target.value)} placeholder="max@firma.de" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Vorname">
                <input style={iStyle} value={form.first_name} onChange={e => u("first_name", e.target.value)} placeholder="Max" />
              </Field>
              <Field label="Nachname">
                <input style={iStyle} value={form.last_name} onChange={e => u("last_name", e.target.value)} placeholder="Mustermann" />
              </Field>
            </div>
            <Field label="Berufsbezeichnung">
              <input style={iStyle} value={form.job_title} onChange={e => u("job_title", e.target.value)} placeholder="Geschäftsführer" />
            </Field>
            <Field label="Firma">
              <input style={iStyle} value={form.company} onChange={e => u("company", e.target.value)} placeholder="Musterfirma GmbH" />
            </Field>
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-phone" style={{ color: "#fce499" }} /> Kontakt
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Telefon">
                <input style={iStyle} value={form.phone} onChange={e => u("phone", e.target.value)} placeholder="+49 30 123 456" />
              </Field>
              <Field label="Mobil">
                <input style={iStyle} value={form.mobile} onChange={e => u("mobile", e.target.value)} placeholder="+49 151 123 456" />
              </Field>
            </div>
            <Field label="Straße & Hausnummer">
              <input style={iStyle} value={form.street} onChange={e => u("street", e.target.value)} placeholder="Musterstraße 1" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 12 }}>
              <Field label="PLZ">
                <input style={iStyle} value={form.postal_code} onChange={e => u("postal_code", e.target.value)} placeholder="12345" />
              </Field>
              <Field label="Ort">
                <input style={iStyle} value={form.city} onChange={e => u("city", e.target.value)} placeholder="Musterstadt" />
              </Field>
              <Field label="Land">
                <input style={iStyle} value={form.country} onChange={e => u("country", e.target.value)} placeholder="Deutschland" />
              </Field>
            </div>
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-photo" style={{ color: "#fce499" }} /> Profilfoto
            </div>
            <Field label="Foto-URL" hint="Direktlink zu einem Bild (https://...)">
              <input style={iStyle} value={form.photo_url} onChange={e => u("photo_url", e.target.value)} placeholder="https://firma.de/fotos/max.jpg" />
            </Field>
          </div>
        </div>

        {/* Vorschau + Variablen */}
        <div>
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Vorschau</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <Avatar sender={form} size={56} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {[form.first_name, form.last_name].filter(Boolean).join(" ") || "—"}
                </div>
                <div style={{ fontSize: 12, color: "#fce499", marginTop: 2 }}>{form.job_title || "—"}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{form.email}</div>
              </div>
            </div>
            {(form.phone || form.mobile) && (
              <div style={{ fontSize: 11, color: "#666", lineHeight: "18px" }}>
                {form.phone && <div>📞 {form.phone}</div>}
                {form.mobile && <div>📱 {form.mobile}</div>}
              </div>
            )}
            {(form.street || form.city) && (
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                📍 {[form.street, [form.postal_code, form.city].filter(Boolean).join(" "), form.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Verfügbare Variablen</div>
            <div style={{ fontSize: 11, color: "#444", marginBottom: 10, lineHeight: "16px" }}>
              Diese Variablen können im Signatur-Designer in Textfeldern verwendet werden.
            </div>
            {[
              ["vorname", form.first_name],
              ["nachname", form.last_name],
              ["name", [form.first_name, form.last_name].filter(Boolean).join(" ")],
              ["email", form.email],
              ["berufsbezeichnung", form.job_title],
              ["firma", form.company],
              ["telefon", form.phone],
              ["mobil", form.mobile],
              ["strasse",  form.street],
              ["plz",      form.postal_code],
              ["ort",      form.city],
              ["land",     form.country],
              ["adresse",  [form.street, [form.postal_code, form.city].filter(Boolean).join(" "), form.country].filter(Boolean).join(", ")],
              ["foto",     form.photo_url ? "Bild-URL" : ""],
            ].map(([k, val]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <code style={{ fontSize: 10, background: "#111", border: "1px solid #2a2a2a", borderRadius: 4, padding: "2px 6px", color: "#fce499", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                  {`{{${k}}}`}
                </code>
                <span style={{ fontSize: 11, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SendersPage({ toast }) {
  const [senders, setSenders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try { const d = await api("GET", "/api/senders/"); setSenders(d); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/senders/${id}`);
    toast("ok", "Benutzer gelöscht");
    load();
  }

  if (editing !== null) return (
    <SenderEditor
      sender={editing === "new" ? null : editing}
      onSave={() => { setEditing(null); load(); }}
      onCancel={() => setEditing(null)}
      toast={toast}
    />
  );

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  const filtered = senders.filter(s =>
    !search || [s.first_name, s.last_name, s.email, s.job_title, s.company].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Benutzer</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Absender-Profile mit Stammdaten für Signatur-Variablen.</p>
        </div>
        <button style={btnPrimary} onClick={() => setEditing("new")}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} />Neuer Benutzer
        </button>
      </div>

      <div style={{ padding: "10px 14px", background: "#161616", border: "1px solid #fce49922", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <i className="ti ti-variable" style={{ fontSize: 16, color: "#fce499", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: "#555", lineHeight: "18px" }}>
          Stammdaten werden im Signatur-Designer als Variablen eingefügt:
          {" "}{["{{vorname}}", "{{nachname}}", "{{email}}", "{{berufsbezeichnung}}", "{{telefon}}", "{{mobil}}", "{{strasse}}", "{{plz}}", "{{ort}}", "{{land}}", "{{adresse}}"].map(v => (
            <code key={v} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 3, padding: "0 4px", color: "#fce499", fontSize: 11, marginRight: 4, fontFamily: "monospace" }}>{v}</code>
          ))}
        </div>
      </div>

      {senders.length > 4 && (
        <div style={{ marginBottom: 14 }}>
          <input style={iStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen nach Name, E-Mail, Firma..." />
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
          <i className="ti ti-users" style={{ fontSize: 40, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>{search ? "Keine Treffer" : "Noch keine Benutzer"}</div>
          {!search && <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Lege Absender-Profile an um Variablen in Signaturen zu verwenden.</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Avatar sender={s} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                </div>
                {s.job_title && <div style={{ fontSize: 12, color: "#fce499", marginTop: 2 }}>{s.job_title}</div>}
                <div style={{ fontSize: 11, color: "#555", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                {(s.phone || s.mobile) && (
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
                    {s.phone && <span style={{ marginRight: 10 }}>📞 {s.phone}</span>}
                    {s.mobile && <span>📱 {s.mobile}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button style={btnSecondary} onClick={() => setEditing(s)}>
                  <i className="ti ti-edit" style={{ fontSize: 13 }} />
                </button>
                <button style={btnDanger} onClick={() => del(s.id)}>
                  <i className="ti ti-trash" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
