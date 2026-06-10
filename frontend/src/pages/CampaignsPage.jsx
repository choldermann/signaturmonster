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

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;
const btnPrimary   = { padding: "8px 16px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger    = { padding: "6px 10px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const iStyle       = { width: "100%", padding: "7px 10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ddd", fontSize: 12, boxSizing: "border-box" };

function campaignStatus(c) {
  const now = new Date();
  if (!c.is_active) return "paused";
  if (c.end_date && new Date(c.end_date) < now) return "expired";
  if (c.start_date && new Date(c.start_date) > now) return "pending";
  return "active";
}

function StatusBadge({ c }) {
  const status = campaignStatus(c);
  const cfg = {
    active:  { bg: "#0a1f14", color: "#6ee7b7", border: "#064e3b", label: "Aktiv" },
    paused:  { bg: "#1a1a1a", color: "#888",    border: "#2a2a2a", label: "Pausiert" },
    expired: { bg: "#1f0a0a", color: "#f87171", border: "#3a1a1a", label: "Abgelaufen" },
    pending: { bg: "#1a1400", color: "#fcd34d", border: "#78600a", label: "Noch nicht gestartet" },
  }[status];
  return (
    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

const EMPTY = {
  name: "", is_active: true, start_date: "", end_date: "",
  image_asset_id: null, link_url: "",
  utm_source: "email", utm_medium: "email", utm_campaign: "", utm_content: "",
};

function ImagePicker({ value, onChange }) {
  const [images, setImages] = useState([]);
  const [open, setOpen]     = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api("GET", "/api/images/").then(d => { if (Array.isArray(d)) setImages(d); });
  }, []);

  useEffect(() => {
    if (value) setSelected(images.find(i => i.id === value) || null);
    else setSelected(null);
  }, [value, images]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {selected ? (
          <img src={`/api/images/${selected.id}/thumb`} alt={selected.name}
            style={{ width: 80, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #2a2a2a" }} />
        ) : (
          <div style={{ width: 80, height: 40, background: "#111", borderRadius: 6, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="photo-off" size={16} style={{ color: "#444" }} />
          </div>
        )}
        <button type="button" style={btnSecondary} onClick={() => setOpen(true)}>
          <Icon name="photo" size={13} />{selected ? "Bild wechseln" : "Bild wählen"}
        </button>
        {selected && (
          <button type="button" style={btnDanger} onClick={() => onChange(null)}>
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14, padding: 24, width: 640, maxWidth: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>Bild aus Bibliothek wählen</span>
              <button style={btnSecondary} onClick={() => setOpen(false)}>Schließen</button>
            </div>
            <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {images.map(img => (
                <div key={img.id} onClick={() => { onChange(img.id); setOpen(false); }}
                  style={{ cursor: "pointer", borderRadius: 8, border: `2px solid ${value === img.id ? "#fce499" : "#2a2a2a"}`, overflow: "hidden", background: "#111" }}>
                  <img src={`/api/images/${img.id}/thumb`} alt={img.name}
                    style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "5px 8px", fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
                </div>
              ))}
              {images.length === 0 && (
                <div style={{ gridColumn: "1/-1", color: "#555", fontSize: 13, padding: 20, textAlign: "center" }}>
                  Noch keine Bilder. Lade Bilder in der Bildbibliothek hoch.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
      {children}
    </div>
  );
}

function CampaignForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);

  function u(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date:   form.end_date   || null,
    };
    const result = form.id
      ? await api("PUT",  `/api/campaigns/${form.id}`, payload)
      : await api("POST", "/api/campaigns/", payload);
    if (result.id) onSave(result);
  }

  return (
    <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{form.id ? "Kampagne bearbeiten" : "Neue Kampagne"}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={btnSecondary} onClick={onCancel}>Abbrechen</button>
          <button style={btnPrimary} onClick={save}><Icon name="check" size={13} />Speichern</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <F label="Name">
          <input style={iStyle} value={form.name} onChange={e => u("name", e.target.value)} placeholder="z.B. Sommer-Aktion 2026" />
        </F>
        <F label="Status">
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingTop: 6 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => u("is_active", e.target.checked)} />
            <span style={{ fontSize: 13, color: "#ccc" }}>Aktiv</span>
          </label>
        </F>
        <F label="Startdatum (optional)">
          <input type="datetime-local" style={iStyle} value={form.start_date || ""} onChange={e => u("start_date", e.target.value)} />
        </F>
        <F label="Enddatum (optional)">
          <input type="datetime-local" style={iStyle} value={form.end_date || ""} onChange={e => u("end_date", e.target.value)} />
        </F>
      </div>

      <F label="Banner-Bild (aus Bildbibliothek)">
        <ImagePicker value={form.image_asset_id} onChange={v => u("image_asset_id", v)} />
      </F>

      <F label="Ziel-URL">
        <input style={iStyle} value={form.link_url} onChange={e => u("link_url", e.target.value)} placeholder="https://beispiel.de/landingpage" />
      </F>

      <div style={{ background: "#111", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>UTM-Parameter</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <F label="utm_source"><input style={iStyle} value={form.utm_source} onChange={e => u("utm_source", e.target.value)} placeholder="email" /></F>
          <F label="utm_medium"><input style={iStyle} value={form.utm_medium} onChange={e => u("utm_medium", e.target.value)} placeholder="email" /></F>
          <F label="utm_campaign"><input style={iStyle} value={form.utm_campaign} onChange={e => u("utm_campaign", e.target.value)} placeholder="sommer2026" /></F>
          <F label="utm_content"><input style={iStyle} value={form.utm_content} onChange={e => u("utm_content", e.target.value)} placeholder="banner-signatur" /></F>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage({ toast }) {
  const [campaigns, setCampaigns]     = useState([]);
  const [editing, setEditing]         = useState(null);   // null | {} | campaign
  const [serverUrl, setServerUrl]     = useState("");
  const [editingUrl, setEditingUrl]   = useState(false);
  const [urlInput, setUrlInput]       = useState("");

  const load = useCallback(async () => {
    const d = await api("GET", "/api/campaigns/");
    if (Array.isArray(d)) setCampaigns(d);
  }, []);

  useEffect(() => {
    load();
    api("GET", "/api/settings/").then(d => {
      if (Array.isArray(d)) {
        const s = d.find(s => s.key === "signaturmonster_url");
        if (s) { setServerUrl(s.value || ""); setUrlInput(s.value || ""); }
      }
    });
  }, [load]);

  async function saveUrl() {
    await api("PUT", "/api/settings/signaturmonster_url", { value: urlInput });
    setServerUrl(urlInput);
    setEditingUrl(false);
    toast?.("ok", "Server-URL gespeichert");
  }

  async function deleteCampaign(id) {
    if (!confirm("Kampagne wirklich löschen?")) return;
    await api("DELETE", `/api/campaigns/${id}`);
    load();
  }

  function onSave() { setEditing(null); load(); }

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Kampagnen</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Zeitgesteuerte Banner in E-Mail-Signaturen. Aktive Kampagnen werden per Zufalls-Rotation ausgewählt.
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setEditing(EMPTY)}>
          <Icon name="plus" size={14} />Neue Kampagne
        </button>
      </div>

      {/* Server-URL Konfiguration */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "14px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: editingUrl ? 10 : 0 }}>
          <Icon name="world" size={14} style={{ color: "#fce499" }} />
          <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>Öffentliche Server-URL</span>
          {!editingUrl && (
            <>
              <span style={{ fontSize: 12, color: serverUrl ? "#6ee7b7" : "#555", fontFamily: "monospace", marginLeft: 6 }}>
                {serverUrl || "nicht konfiguriert"}
              </span>
              <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12, marginLeft: "auto" }} onClick={() => { setEditingUrl(true); setUrlInput(serverUrl); }}>
                <Icon name="edit" size={12} />Bearbeiten
              </button>
            </>
          )}
        </div>
        {editingUrl && (
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...iStyle, flex: 1 }} value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://signaturmonster.dein-server.de" />
            <button style={btnPrimary} onClick={saveUrl}><Icon name="check" size={13} />Speichern</button>
            <button style={btnSecondary} onClick={() => setEditingUrl(false)}>Abbrechen</button>
          </div>
        )}
        {!editingUrl && (
          <p style={{ fontSize: 11, color: "#444", margin: "6px 0 0" }}>
            Benötigt für Klick-Tracking-Links in E-Mails. Muss von E-Mail-Empfängern erreichbar sein.
          </p>
        )}
      </div>

      {/* Template-Hinweis */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name="info-circle" size={15} style={{ color: "#93c5fd", marginTop: 2, flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 13, color: "#93c5fd", fontWeight: 600 }}>Integration in Signaturen: </span>
          <span style={{ fontSize: 13, color: "#888" }}>Füge </span>
          <code style={{ fontSize: 12, background: "#1a1a1a", padding: "1px 6px", borderRadius: 4, color: "#fce499", border: "1px solid #2a2a2a" }}>{"{{"} campaign_banner {"}}"}</code>
          <span style={{ fontSize: 13, color: "#888" }}> in den HTML-Teil deiner Signatur ein. Bei jeder E-Mail wird automatisch eine zufällige aktive Kampagne eingesetzt.</span>
        </div>
      </div>

      {/* Formular */}
      {editing !== null && (
        <div style={{ marginBottom: 20 }}>
          <CampaignForm initial={editing.id ? editing : EMPTY} onSave={onSave} onCancel={() => setEditing(null)} />
        </div>
      )}

      {/* Kampagnen-Liste */}
      {campaigns.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#444", fontSize: 14 }}>
          Noch keine Kampagnen. Erstelle die erste!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "14px 20px" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                {/* Vorschau */}
                {c.image_asset_id ? (
                  <img src={`/api/images/${c.image_asset_id}/thumb`} alt=""
                    style={{ width: 90, height: 50, objectFit: "cover", borderRadius: 8, border: "1px solid #2a2a2a", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 90, height: 50, background: "#111", borderRadius: 8, border: "1px dashed #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="photo-off" size={16} style={{ color: "#333" }} />
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{c.name}</span>
                    <StatusBadge c={c} />
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {(c.start_date || c.end_date) && (
                      <span style={{ fontSize: 12, color: "#555", display: "flex", gap: 5, alignItems: "center" }}>
                        <Icon name="calendar" size={12} />
                        {c.start_date ? new Date(c.start_date).toLocaleDateString("de-DE") : "∞"}
                        {" → "}
                        {c.end_date   ? new Date(c.end_date).toLocaleDateString("de-DE") : "∞"}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "#555", display: "flex", gap: 5, alignItems: "center" }}>
                      <Icon name="eye" size={12} />{c.impression_count || 0} Impressions
                    </span>
                    <span style={{ fontSize: 12, color: "#555", display: "flex", gap: 5, alignItems: "center" }}>
                      <Icon name="cursor-text" size={12} />{c.click_count || 0} Klicks
                    </span>
                    {c.link_url && (
                      <span style={{ fontSize: 12, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                        → {c.link_url}
                      </span>
                    )}
                  </div>
                </div>

                {/* Aktionen */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={btnSecondary} onClick={() => setEditing(c)}>
                    <Icon name="edit" size={13} />Bearbeiten
                  </button>
                  <button style={btnDanger} onClick={() => deleteCampaign(c.id)}>
                    <Icon name="trash" size={13} />
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
