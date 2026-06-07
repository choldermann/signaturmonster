import React, { useState, useEffect, useCallback } from "react";
import { ACCENT_COLORS, CI_PALETTES } from "../data/colorPresets.js";

const API = "";
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnDanger = { padding: "7px 12px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 34, padding: 3, border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", background: "#1a1a1a" }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
        {ACCENT_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            style={{ width: 18, height: 18, borderRadius: 3, background: c, border: value === c ? "2px solid #fce499" : "1px solid #2a2a2a", cursor: "pointer", padding: 0, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

const EMPTY = {
  name: "", primary_color: "#fce499", text_color: "#333333",
  bg_color: "#ffffff", header_bg: "#242424",
  font_family: "Arial, Helvetica, sans-serif", font_size: "14px",
  line_height: "1.6", container_width: "620",
  logo_url: "", company_name: "",
  show_header: true, show_footer: true, footer_text: "",
  content_bg: "#ffffff", shadow: "0 2px 12px rgba(0,0,0,0.08)",
};

function CIPreview({ cfg }) {
  const c = { ...EMPTY, ...cfg };
  return (
    <div style={{ background: "#f0f0f0", borderRadius: 10, overflow: "hidden", border: "1px solid #ddd" }}>
      <div style={{ background: "#1a1a1a", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
        <span style={{ fontSize: 10, color: "#555", marginLeft: 6 }}>Vorschau</span>
      </div>
      <div style={{ padding: "16px", background: c.bg_color }}>
        <div style={{ maxWidth: "100%", background: c.content_bg || "#fff", borderRadius: 10, border: c.border || "1px solid #dddddd", overflow: "hidden" }}>
          {c.show_header && (c.logo_url || c.company_name) && (
            <div style={{ background: c.header_bg, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              {c.logo_url && <img src={c.logo_url} alt="" style={{ maxHeight: 32, display: "block", border: 0 }} />}
              {c.company_name && <span style={{ fontSize: 15, fontWeight: "bold", color: c.primary_color }}>{c.company_name}</span>}
            </div>
          )}
          <div style={{ padding: "16px", fontFamily: c.font_family, fontSize: c.font_size, color: c.text_color, lineHeight: c.line_height }}>
            <p>Hallo Frau Mustermann,</p>
            <p style={{ marginTop: 8 }}>anbei sende ich Ihnen die gewünschten Unterlagen. Bei Rückfragen stehe ich gerne zur Verfügung.</p>
            <p style={{ marginTop: 8 }}>Mit freundlichen Grüßen</p>
          </div>
          <div style={{ borderTop: "1px solid #eee", padding: "10px 16px" }}>
            <div style={{ fontSize: 11, color: "#888" }}>
              <strong style={{ color: c.primary_color }}>Max Mustermann</strong><br />
              Musterfirma GmbH · info@musterfirma.de
            </div>
          </div>
          {c.show_footer && c.footer_text && (
            <div style={{ background: c.header_bg, padding: "8px 16px", fontSize: 10, color: "#888" }}>
              {c.footer_text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CIEditor({ ci, onSave, onCancel, toast }) {
  const [form, setForm] = useState(ci ? { ...ci } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const u = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function save() {
    if (!form.name.trim()) { toast("err", "Bitte einen Namen eingeben"); return; }
    setSaving(true);
    try {
      if (ci?.id) { await api("PUT", `/api/ci/${ci.id}`, form); toast("ok", "CI-Profil gespeichert"); }
      else { await api("POST", "/api/ci/", form); toast("ok", "CI-Profil erstellt"); }
      onSave();
    } catch { toast("err", "Fehler beim Speichern"); }
    setSaving(false);
  }

  const FONTS = [
    "Arial, Helvetica, sans-serif",
    "Georgia, 'Times New Roman', serif",
    "'Trebuchet MS', sans-serif",
    "Verdana, Geneva, sans-serif",
    "'Courier New', monospace",
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ ...btnSecondary, padding: "7px 12px" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> Zurück
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, flex: 1 }}>
          {ci?.id ? "CI-Profil bearbeiten" : "Neues CI-Profil"}
        </h1>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />{saving ? "Speichern..." : "Speichern"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-id-badge" style={{ color: "#fce499" }} /> Allgemein
            </div>
            <Field label="Name des CI-Profils">
              <input style={inputStyle} value={form.name} onChange={e => u("name", e.target.value)} placeholder="z.B. Holdermann IT Standard" />
            </Field>
            <Field label="Firmenname">
              <input style={inputStyle} value={form.company_name} onChange={e => u("company_name", e.target.value)} placeholder="z.B. Holdermann IT" />
            </Field>
            <Field label="Logo-URL">
              <input style={inputStyle} value={form.logo_url} onChange={e => u("logo_url", e.target.value)} placeholder="https://..." />
            </Field>
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-palette" style={{ color: "#fce499" }} /> Farben
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Palette-Preset</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {CI_PALETTES.map(p => (
                  <button key={p.name} title={p.name}
                    onClick={() => setForm(f => ({ ...f, primary_color: p.primary_color, text_color: p.text_color, bg_color: p.bg_color, header_bg: p.header_bg, content_bg: p.content_bg }))}
                    style={{ padding: "7px 6px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 7, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                      {p.preview.map((c, i) => (
                        <div key={i} style={{ flex: 1, height: 10, borderRadius: 2, background: c, border: "1px solid #333" }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
            <ColorField label="Akzentfarbe" value={form.primary_color} onChange={v => u("primary_color", v)} />
            <ColorField label="Textfarbe" value={form.text_color} onChange={v => u("text_color", v)} />
            <ColorField label="Hintergrund" value={form.bg_color} onChange={v => u("bg_color", v)} />
            <ColorField label="Header-Hintergrund" value={form.header_bg} onChange={v => u("header_bg", v)} />
            <ColorField label="Text-Hintergrund" value={form.content_bg} onChange={v => u("content_bg", v)} />
          </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-typography" style={{ color: "#fce499" }} /> Typografie
            </div>
            <Field label="Schriftart">
              <select style={inputStyle} value={form.font_family} onChange={e => u("font_family", e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f.split(",")[0]}</option>)}
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Schriftgröße">
                <input style={inputStyle} value={form.font_size} onChange={e => u("font_size", e.target.value)} placeholder="14px" />
              </Field>
              <Field label="Zeilenabstand">
                <input style={inputStyle} value={form.line_height} onChange={e => u("line_height", e.target.value)} placeholder="1.6" />
              </Field>
              <Field label="Breite (px)">
                <input style={inputStyle} value={form.container_width} onChange={e => u("container_width", e.target.value)} placeholder="620" />
              </Field>
            </div>
              <Field label="Rahmen" hint="z.B. '1px solid #cccccc' oder 'none'">
                <input style={inputStyle} value={form.border} onChange={e => u("border", e.target.value)} placeholder="1px solid #dddddd" />
              </Field>
        </div>

          <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-layout" style={{ color: "#fce499" }} /> Header & Footer
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer", marginBottom: 10 }}>
              <input type="checkbox" checked={form.show_header} onChange={e => u("show_header", e.target.checked)} />
              Header anzeigen (Logo + Firmenname)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer", marginBottom: 14 }}>
              <input type="checkbox" checked={form.show_footer} onChange={e => u("show_footer", e.target.checked)} />
              Footer anzeigen
            </label>
            <Field label="Footer-Text" hint="z.B. Disclaimer, Impressum-Link">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.footer_text} onChange={e => u("footer_text", e.target.value)} placeholder="Holdermann IT · Musterstr. 1 · 12345 Musterstadt" />
            </Field>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-eye" style={{ color: "#fce499" }} /> Live-Vorschau
          </div>
          <div style={{ position: "sticky", top: 20 }}>
            <CIPreview cfg={form} />
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#161616", border: "1px solid #222", borderRadius: 8, fontSize: 12, color: "#555", lineHeight: "18px" }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: "#fce499" }} />
              Dieses CI-Profil wird auf Mails angewendet wenn eine Regel es zuweist. Der Original-Mailtext wird bereinigt und in diesen Wrapper eingebettet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CIPage({ toast }) {
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const d = await api("GET", "/api/ci/"); setConfigs(d); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/ci/${id}`);
    toast("ok", "CI-Profil gelöscht");
    load();
  }

  if (editing !== null) return (
    <CIEditor ci={editing === "new" ? null : editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} toast={toast} />
  );

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>CI-Profile</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Corporate Identity für den Mail Beautifier — pro Regel konfigurierbar.</p>
        </div>
        <button style={btnPrimary} onClick={() => setEditing("new")}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} />Neues CI-Profil
        </button>
      </div>

      <div style={{ padding: "12px 16px", background: "#1a1a1a", border: "1px solid #fce49922", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <i className="ti ti-wand" style={{ fontSize: 16, color: "#fce499", flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fce499" }}>Mail Beautifier — Phase 4</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 3, lineHeight: "18px" }}>
            Ein CI-Profil einer Signatur-Regel zuweisen → ausgehende Mails werden automatisch bereinigt (Schriften, Farben, Abstände normalisiert) und in den CI-Wrapper eingebettet. Der Empfänger sieht eine professionell gestaltete Mail statt Thunderbird-Chaos.
          </div>
        </div>
      </div>

      {configs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
          <i className="ti ti-palette" style={{ fontSize: 40, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>Noch keine CI-Profile — erstelle dein erstes!</div>
          <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Ein CI-Profil definiert Farben, Schriften und Layout für den Mail Beautifier.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {configs.map(ci => (
            <div key={ci.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: ci.header_bg || "#242424", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                {ci.logo_url && <img src={ci.logo_url} alt="" style={{ maxHeight: 28, display: "block", border: 0 }} />}
                <span style={{ fontSize: 13, fontWeight: "bold", color: ci.primary_color || "#fce499" }}>{ci.company_name || ci.name}</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", marginBottom: 8 }}>{ci.name}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[ci.primary_color, ci.text_color, ci.bg_color, ci.header_bg].map((c, i) => (
                    <div key={i} title={c} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: "1px solid #333" }} />
                  ))}
                  <span style={{ fontSize: 11, color: "#555", marginLeft: 4, alignSelf: "center" }}>
                    {ci.font_family?.split(",")[0]}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, padding: "7px 0", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 7, color: "#888", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                    onClick={() => setEditing(ci)}>
                    <i className="ti ti-edit" style={{ fontSize: 13 }} />Bearbeiten
                  </button>
                  <button style={btnDanger} onClick={() => del(ci.id)}>
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
