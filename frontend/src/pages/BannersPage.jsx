import React, { useState, useEffect, useCallback } from "react";
import { ACCENT_COLORS } from "../data/colorPresets.js";

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;

const btnPrimary   = { padding: "8px 16px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger    = { padding: "6px 11px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const iStyle       = { width: "100%", padding: "7px 10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ddd", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" };

const DEFAULT_PROPS = {
  height: "80", bgType: "solid",
  color1: "#fce499", color2: "#f08030",
  gradientDir: "horizontal", outlookColor: "#fce499",
  text: "Jetzt Termin buchen!", textColor: "#333333",
  fontSize: "16", fontWeight: "bold", textAlign: "center",
  subtext: "", subtextColor: "#555555", subtextSize: "12",
  linkUrl: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "",
  borderRadius: "8", padding: "16",
};

function buildUrl(url, utm) {
  if (!url || !url.startsWith("http")) return url;
  const params = [];
  if (utm.utm_source)   params.push(`utm_source=${encodeURIComponent(utm.utm_source)}`);
  if (utm.utm_medium)   params.push(`utm_medium=${encodeURIComponent(utm.utm_medium)}`);
  if (utm.utm_campaign) params.push(`utm_campaign=${encodeURIComponent(utm.utm_campaign)}`);
  if (utm.utm_content)  params.push(`utm_content=${encodeURIComponent(utm.utm_content)}`);
  if (!params.length) return url;
  return url + (url.includes("?") ? "&" : "?") + params.join("&");
}

// ─── Banner Preview ───────────────────────────────────────────────────────────
function BannerPreview({ p }) {
  const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
  const bg = p.bgType === "gradient"
    ? `linear-gradient(${cssDirMap[p.gradientDir] || "to right"}, ${p.color1}, ${p.color2})`
    : p.color1;
  const href  = p.linkUrl ? buildUrl(p.linkUrl, p) : null;
  const pad   = parseInt(p.padding) || 16;
  const h     = parseInt(p.height)  || 80;
  const r     = parseInt(p.borderRadius) || 0;
  const justify = { center: "center", right: "flex-end", left: "flex-start" }[p.textAlign] || "flex-start";

  const content = (
    <div style={{ textAlign: p.textAlign }}>
      <p style={{ margin: 0, color: p.textColor, fontSize: `${p.fontSize}px`, fontWeight: p.fontWeight, fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{p.text}</p>
      {p.subtext && <p style={{ margin: "6px 0 0", color: p.subtextColor, fontSize: `${p.subtextSize}px`, fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{p.subtext}</p>}
    </div>
  );
  const wrapper = (
    <div style={{ background: bg, padding: pad, borderRadius: r, minHeight: h, display: "flex", alignItems: "center", justifyContent: justify }}>
      {content}
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none", display: "block" }}>{wrapper}</a> : wrapper;
}

// ─── Color Input ──────────────────────────────────────────────────────────────
function ColorInput({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 30, height: 28, padding: 2, border: "1px solid #2a2a2a", borderRadius: 4, cursor: "pointer", background: "#111" }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} style={{ ...iStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {ACCENT_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            style={{ width: 16, height: 16, borderRadius: 3, background: c, border: value === c ? "2px solid #fce499" : "1px solid #333", cursor: "pointer", padding: 0, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

const F = ({ label, children, hint }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{hint}</div>}
  </div>
);

// ─── UTM Editor ───────────────────────────────────────────────────────────────
function UTMEditor({ p, onChange }) {
  const hasUTM = p.utm_source || p.utm_campaign;
  const [open, setOpen] = useState(hasUTM);
  const preview = buildUrl(p.linkUrl || "", p);
  const u = (k, v) => onChange({ ...p, [k]: v });

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "5px 10px", background: open ? "#1a2a1a" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: open ? "#6ee7b7" : "#666", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="chart-bar" size={11} /> UTM-Tracking {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 5, padding: 10, background: "#111", border: "1px solid #1e1e1e", borderRadius: 6 }}>
          <F label="utm_source"><input style={iStyle} value={p.utm_source || ""} onChange={e => u("utm_source", e.target.value)} placeholder="z.B. email" /></F>
          <F label="utm_medium"><input style={iStyle} value={p.utm_medium || ""} onChange={e => u("utm_medium", e.target.value)} placeholder="z.B. email" /></F>
          <F label="utm_campaign"><input style={iStyle} value={p.utm_campaign || ""} onChange={e => u("utm_campaign", e.target.value)} placeholder="z.B. sommer2026" /></F>
          <F label="utm_content"><input style={iStyle} value={p.utm_content || ""} onChange={e => u("utm_content", e.target.value)} placeholder="z.B. banner-oben" /></F>
          {(p.utm_source || p.utm_campaign) && (
            <div style={{ marginTop: 5, padding: "5px 8px", background: "#0a1a0a", borderRadius: 4, fontSize: 10, color: "#6ee7b7", wordBreak: "break-all" }}>{preview}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Banner Props Editor ──────────────────────────────────────────────────────
function BannerPropEditor({ p, onChange }) {
  const u = (k, v) => onChange({ ...p, [k]: v });

  return (
    <div>
      <F label="Haupttext">
        <input style={iStyle} value={p.text} onChange={e => u("text", e.target.value)} placeholder="z.B. Jetzt Termin buchen!" />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label="Schriftgröße (px)"><input style={iStyle} type="number" value={p.fontSize} onChange={e => u("fontSize", e.target.value)} /></F>
        <F label="Ausrichtung">
          <select style={iStyle} value={p.textAlign} onChange={e => u("textAlign", e.target.value)}>
            {["left","center","right"].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button onClick={() => u("fontWeight", p.fontWeight === "bold" ? "normal" : "bold")}
          style={{ flex: 1, padding: "5px", background: p.fontWeight === "bold" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.fontWeight === "bold" ? "#1a1a0a" : "#888", fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>B</button>
      </div>
      <F label="Textfarbe"><ColorInput value={p.textColor} onChange={v => u("textColor", v)} /></F>
      <F label="Subtext (optional)">
        <input style={iStyle} value={p.subtext} onChange={e => u("subtext", e.target.value)} placeholder="Zusatzzeile..." />
      </F>
      {p.subtext && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <F label="Subtext-Farbe"><ColorInput value={p.subtextColor} onChange={v => u("subtextColor", v)} /></F>
          <F label="Subtext-Größe (px)"><input style={iStyle} type="number" value={p.subtextSize} onChange={e => u("subtextSize", e.target.value)} /></F>
        </div>
      )}

      <F label="Link-URL (optional)">
        <input style={iStyle} value={p.linkUrl} onChange={e => u("linkUrl", e.target.value)} placeholder="https://..." />
      </F>
      {p.linkUrl && <UTMEditor p={p} onChange={onChange} />}

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e", marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7 }}>Hintergrund</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {[["solid","Vollfarbe"],["gradient","Verlauf"]].map(([val, lbl]) => (
            <button key={val} onClick={() => u("bgType", val)}
              style={{ flex: 1, padding: "5px 8px", background: p.bgType === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.bgType === val ? "#1a1a0a" : "#888", cursor: "pointer", fontSize: 12, fontWeight: p.bgType === val ? 700 : 400 }}>{lbl}</button>
          ))}
        </div>
        <F label={p.bgType === "gradient" ? "Farbe 1" : "Hintergrundfarbe"}>
          <ColorInput value={p.color1} onChange={v => u("color1", v)} />
        </F>
        {p.bgType === "gradient" && (
          <>
            <F label="Farbe 2"><ColorInput value={p.color2} onChange={v => u("color2", v)} /></F>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Richtung</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["horizontal","↔ Horizontal"],["vertical","↕ Vertikal"],["diagonal","↘ Diagonal"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => u("gradientDir", val)}
                    style={{ flex: 1, padding: "5px 4px", background: p.gradientDir === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.gradientDir === val ? "#1a1a0a" : "#888", cursor: "pointer", fontSize: 10, fontWeight: p.gradientDir === val ? 700 : 400 }}>{lbl}</button>
                ))}
              </div>
            </div>
            <F label="Outlook-Fallback Farbe"><ColorInput value={p.outlookColor} onChange={v => u("outlookColor", v)} /></F>
            <div style={{ padding: "5px 8px", background: "#1a1500", border: "1px solid #3a2800", borderRadius: 5, fontSize: 10, color: "#888", marginBottom: 6 }}>
              <Icon name="alert-triangle" size={11} style={{ color: "#fce499", marginRight: 4 }} />
              Outlook unterstützt CSS-Gradienten nicht
            </div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <F label="Höhe (px)"><input style={iStyle} type="number" value={p.height} onChange={e => u("height", e.target.value)} /></F>
        <F label="Innenabstand (px)"><input style={iStyle} type="number" value={p.padding} onChange={e => u("padding", e.target.value)} /></F>
        <F label="Eckenradius (px)"><input style={iStyle} type="number" value={p.borderRadius} onChange={e => u("borderRadius", e.target.value)} /></F>
      </div>
    </div>
  );
}

// ─── Banner Editor ────────────────────────────────────────────────────────────
function BannerEditor({ initial, onSave, onCancel, toast }) {
  const [name, setName]     = useState(initial?.name || "");
  const [props, setProps]   = useState(() => {
    if (initial?.props_json) {
      try { return { ...DEFAULT_PROPS, ...JSON.parse(initial.props_json) }; } catch {}
    }
    return { ...DEFAULT_PROPS };
  });
  const [saving, setSaving] = useState(false);
  const isNew = !initial?.id;

  async function save() {
    if (!name.trim()) { toast("err", "Bitte einen Namen eingeben"); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), props_json: JSON.stringify(props) };
      const r = isNew
        ? await api("POST", "/api/banners/", payload)
        : await api("PUT",  `/api/banners/${initial.id}`, payload);
      if (r.id) { toast("ok", isNew ? "Banner erstellt" : "Banner gespeichert"); onSave(); }
      else      { toast("err", r.detail || "Fehler"); }
    } catch { toast("err", "Verbindung fehlgeschlagen"); }
    setSaving(false);
  }

  return (
    <div style={{ background: "#161616", border: "1px solid #fce49944", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fce499", marginBottom: 18 }}>
        {isNew ? "Neuer Banner" : `Bearbeiten: ${initial.name}`}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Props */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>Name</label>
            <input style={{ width: "100%", padding: "8px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Sommerkampagne" />
          </div>
          <div style={{ background: "#111", borderRadius: 8, border: "1px solid #222", padding: 12, maxHeight: 480, overflowY: "auto" }}>
            <BannerPropEditor p={props} onChange={setProps} />
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Live-Vorschau</div>
          <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 16, minHeight: 120 }}>
            <BannerPreview p={props} />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#444" }}>
            Vorschau entspricht dem Aussehen in der E-Mail.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <Icon name="device-floppy" />{saving ? "Speichern..." : "Speichern"}
        </button>
        <button style={btnSecondary} onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  );
}

// ─── List Page ────────────────────────────────────────────────────────────────
export default function BannersPage({ toast }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragId, setDragId]   = useState(null);

  const load = useCallback(async () => {
    try { const d = await api("GET", "/api/banners/"); setBanners(Array.isArray(d) ? d : []); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/banners/${id}`);
    toast("ok", "Banner gelöscht");
    load();
  }

  function handleDragStart(id) { setDragId(id); }
  function handleDragOver(e, id) { e.preventDefault(); setDragOver(id); }
  function handleDrop(targetId) {
    if (dragId === targetId || !dragId) { setDragOver(null); setDragId(null); return; }
    const arr = [...banners];
    const from = arr.findIndex(b => b.id === dragId);
    const to   = arr.findIndex(b => b.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setBanners(arr);
    setDragOver(null);
    setDragId(null);
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Banner</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Zentral verwaltete Banner — im Signatur-Designer aus der Bibliothek einfügen.
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setEditing("new")}>
          <Icon name="plus" />Neuer Banner
        </button>
      </div>

      <div style={{ padding: "12px 16px", background: "#1a1a1a", border: "1px solid #93c5fd22", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <Icon name="info-circle" size={15} style={{ color: "#93c5fd", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#555", lineHeight: "18px" }}>
          Banner können im <strong style={{ color: "#888" }}>Signatur-Designer</strong> über die Bibliothek eingefügt werden. Reihenfolge in der Liste ist per Drag &amp; Drop änderbar.
        </div>
      </div>

      {editing === "new" && (
        <BannerEditor initial={null} toast={toast} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}
      {editing && editing !== "new" && (
        <BannerEditor initial={editing} toast={toast} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}

      {banners.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="ad" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Banner</div>
        </div>
      ) : banners.map(b => {
        let p = DEFAULT_PROPS;
        try { p = { ...DEFAULT_PROPS, ...JSON.parse(b.props_json) }; } catch {}
        return (
          <div key={b.id}
            draggable
            onDragStart={() => handleDragStart(b.id)}
            onDragOver={e => handleDragOver(e, b.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(b.id)}
            onDragEnd={() => { setDragOver(null); setDragId(null); }}
            style={{ background: "#161616", border: `2px solid ${dragOver === b.id ? "#fce499" : editing?.id === b.id ? "#fce49966" : "#222"}`, borderRadius: 10, marginBottom: 8, overflow: "hidden", cursor: "grab", opacity: dragId === b.id ? 0.4 : 1, transition: "border-color .1s" }}>
            {/* Banner Preview */}
            <div style={{ pointerEvents: "none" }}>
              <BannerPreview p={p} />
            </div>
            {/* Footer */}
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #222" }}>
              <Icon name="ad" size={13} style={{ color: "#555" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ddd", flex: 1 }}>{b.name}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12 }} onClick={() => setEditing(editing?.id === b.id ? null : b)}>
                  <Icon name="edit" size={13} />Bearbeiten
                </button>
                <button style={btnDanger} onClick={() => del(b.id)}><Icon name="trash" size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
