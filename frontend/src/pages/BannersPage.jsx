import React, { useState, useEffect, useCallback, useRef } from "react";
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
  animationType: "none", animSpeed: "medium", gif_data: "",
};

const ANIM_TYPES = [
  { value: "none",            label: "Kein GIF",          icon: "ban" },
  { value: "gradient-shift",  label: "Farbverlauf",       icon: "wave-sine" },
  { value: "text-fade",       label: "Text Einblenden",   icon: "eye" },
  { value: "text-slide-left", label: "→ Von links",       icon: "arrow-right" },
  { value: "text-slide-right",label: "← Von rechts",      icon: "arrow-left" },
  { value: "text-slide-top",  label: "↓ Von oben",        icon: "arrow-down" },
  { value: "combined",        label: "Kombi-Effekt",      icon: "sparkles" },
];

const TRANS_TYPES = [
  { v: "none",         label: "Kein",     icon: "minus" },
  { v: "fade",         label: "Fade",     icon: "eye" },
  { v: "slide-left",   label: "→",        icon: "arrow-right" },
  { v: "slide-right",  label: "←",        icon: "arrow-left" },
  { v: "slide-top",    label: "↓",        icon: "arrow-down" },
  { v: "slide-bottom", label: "↑",        icon: "arrow-up" },
];

const DEFAULT_SCENE = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2),
  text: "Ihr Text hier",
  subtext: "",
  textColor: "#333333",
  subtextColor: "#555555",
  fontSize: "18",
  subtextSize: "12",
  fontWeight: "bold",
  textAlign: "center",
  bgType: "solid",
  color1: "#fce499",
  color2: "#f08030",
  gradientDir: "horizontal",
  holdMs: 2500,
  transitionOutType: "fade",
  transitionOutMs: 400,
  textAnimation: "none",
  subtextAnimation: "none",
  ...overrides,
});

const TEXT_ANIMS = [
  { v: "none",         label: "Sofort",    icon: "minus" },
  { v: "fade",         label: "Einblenden",icon: "eye" },
  { v: "slide-left",   label: "← Von rechts", icon: "arrow-left" },
  { v: "slide-right",  label: "→ Von links",  icon: "arrow-right" },
  { v: "slide-top",    label: "↓ Von oben",   icon: "arrow-down" },
  { v: "slide-bottom", label: "↑ Von unten",  icon: "arrow-up" },
];

// ─── Scene Thumbnail (vertical list) ─────────────────────────────────────────
function SceneThumbnail({ scene, index, selected, onClick, onDelete, canDelete }) {
  const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
  const bg = scene.bgType === "gradient"
    ? `linear-gradient(${cssDirMap[scene.gradientDir]||"to right"},${scene.color1},${scene.color2})`
    : scene.color1;
  return (
    <div onClick={onClick} style={{ cursor: "pointer", borderRadius: 7, overflow: "hidden", border: `2px solid ${selected ? "#c4b5fd" : "#222"}`, transition: "border-color .15s" }}>
      <div style={{ background: bg, minHeight: 44, display: "flex", alignItems: "center", padding: "6px 10px", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: scene.textColor, fontSize: 10, fontWeight: scene.fontWeight, lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{scene.text || "…"}</div>
          {scene.subtext && <div style={{ color: scene.subtextColor, fontSize: 8, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{scene.subtext}</div>}
        </div>
        <span style={{ fontSize: 9, color: scene.textColor, opacity: 0.6, flexShrink: 0 }}>{(scene.holdMs/1000).toFixed(1)}s</span>
      </div>
      <div style={{ background: "#111", padding: "3px 8px", display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: selected ? "#c4b5fd" : "#444", fontWeight: 600, flex: 1 }}>Szene {index + 1}</span>
        {canDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "1px 4px", fontSize: 11, lineHeight: 1 }}>×</button>
        )}
      </div>
    </div>
  );
}

// ─── Transition Connector (vertical, between scene thumbnails) ────────────────
function TransitionConnector({ scene, onChange, isLast }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = TRANS_TYPES.find(t => t.v === scene.transitionOutType) || TRANS_TYPES[0];
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", padding: "2px 0" }}>
      <div style={{ width: 2, height: 5, background: "#2a2a2a" }} />
      <button onClick={() => setOpen(o => !o)}
        style={{ padding: "3px 10px", fontSize: 10, background: open ? "#150f2a" : "#111", border: `1px solid ${open ? "#c4b5fd" : "#2a2a2a"}`, borderRadius: 5, color: open ? "#c4b5fd" : "#444", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icon name={cur.icon} size={9} style={{ flexShrink: 0 }} />
        {cur.label} · {(scene.transitionOutMs/1000).toFixed(1)}s
        {isLast && <span style={{ color: "#333", marginLeft: 2 }}>↩</span>}
      </button>
      <div style={{ width: 2, height: 5, background: "#2a2a2a" }} />
      {open && (
        <div style={{ position: "absolute", top: "50%", right: "calc(100% + 8px)", transform: "translateY(-50%)", zIndex: 200, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, width: 170 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Übergang</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, marginBottom: 8 }}>
            {TRANS_TYPES.map(t => (
              <button key={t.v} onClick={() => { onChange({ transitionOutType: t.v }); setOpen(false); }}
                style={{ padding: "4px 2px", background: scene.transitionOutType === t.v ? "#150f2a" : "#111", border: `1px solid ${scene.transitionOutType === t.v ? "#c4b5fd" : "#2a2a2a"}`, borderRadius: 5, color: scene.transitionOutType === t.v ? "#c4b5fd" : "#555", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <Icon name={t.icon} size={9} />{t.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#444", marginBottom: 3 }}>Dauer: {(scene.transitionOutMs/1000).toFixed(1)}s</div>
          <input type="range" min={100} max={1500} step={50} value={scene.transitionOutMs}
            onChange={e => onChange({ transitionOutMs: parseInt(e.target.value) })}
            style={{ width: "100%", accentColor: "#c4b5fd" }} />
        </div>
      )}
    </div>
  );
}

// ─── Scene Item Editor (single column: text → background → timing) ────────────
function SceneItemEditor({ scene, onChange }) {
  const u = (k, v) => onChange({ ...scene, [k]: v });
  const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
  const bg = scene.bgType === "gradient"
    ? `linear-gradient(${cssDirMap[scene.gradientDir]||"to right"},${scene.color1},${scene.color2})`
    : scene.color1;

  return (
    <div>
      {/* ── Text ── */}
      <F label="Haupttext">
        <input style={iStyle} value={scene.text} onChange={e => u("text", e.target.value)} placeholder="Ihr Text hier…" />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label="Schriftgröße (px)"><input style={iStyle} type="number" value={scene.fontSize} onChange={e => u("fontSize", e.target.value)} /></F>
        <F label="Ausrichtung">
          <select style={iStyle} value={scene.textAlign} onChange={e => u("textAlign", e.target.value)}>
            {["left","center","right"].map(a => <option key={a}>{a}</option>)}
          </select>
        </F>
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        <button onClick={() => u("fontWeight", scene.fontWeight === "bold" ? "normal" : "bold")}
          style={{ padding: "4px 12px", background: scene.fontWeight === "bold" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.fontWeight === "bold" ? "#1a1a0a" : "#888", fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>B</button>
      </div>
      <F label="Textfarbe"><ColorInput value={scene.textColor} onChange={v => u("textColor", v)} /></F>
      <F label="Subtext (optional)">
        <input style={iStyle} value={scene.subtext||""} onChange={e => u("subtext", e.target.value)} placeholder="Zweite Zeile…" />
      </F>
      {scene.subtext && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <F label="Subtext-Farbe"><ColorInput value={scene.subtextColor||"#555555"} onChange={v => u("subtextColor", v)} /></F>
          <F label="Subtext-Größe"><input style={iStyle} type="number" value={scene.subtextSize||"12"} onChange={e => u("subtextSize", e.target.value)} /></F>
        </div>
      )}

      {/* ── Hintergrund ── */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Hintergrund</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {[["solid","Vollfarbe"],["gradient","Verlauf"]].map(([val, lbl]) => (
            <button key={val} onClick={() => u("bgType", val)}
              style={{ flex: 1, padding: "5px", background: scene.bgType === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.bgType === val ? "#1a1a0a" : "#888", cursor: "pointer", fontSize: 11, fontWeight: scene.bgType === val ? 700 : 400 }}>{lbl}</button>
          ))}
        </div>
        <F label={scene.bgType === "gradient" ? "Farbe 1" : "Hintergrundfarbe"}>
          <ColorInput value={scene.color1} onChange={v => u("color1", v)} />
        </F>
        {scene.bgType === "gradient" && (
          <>
            <F label="Farbe 2"><ColorInput value={scene.color2||"#f08030"} onChange={v => u("color2", v)} /></F>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {[["horizontal","↔ Hor."],["vertical","↕ Ver."],["diagonal","↘ Diag."]].map(([val,lbl]) => (
                <button key={val} onClick={() => u("gradientDir", val)}
                  style={{ flex: 1, padding: "4px", background: scene.gradientDir === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.gradientDir === val ? "#1a1a0a" : "#888", cursor: "pointer", fontSize: 10 }}>{lbl}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Texteinblendung ── */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>
          Haupttext Einblendung
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          {TEXT_ANIMS.map(a => (
            <button key={a.v} onClick={() => u("textAnimation", a.v)}
              style={{ padding: "5px 4px", background: scene.textAnimation === a.v ? "#150f2a" : "#111", border: `1px solid ${scene.textAnimation === a.v ? "#c4b5fd" : "#222"}`, borderRadius: 5, color: scene.textAnimation === a.v ? "#c4b5fd" : "#555", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <Icon name={a.icon} size={10} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
            </button>
          ))}
        </div>
        {scene.subtext && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>
              Zusatztext Einblendung
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
              {TEXT_ANIMS.map(a => (
                <button key={a.v} onClick={() => u("subtextAnimation", a.v)}
                  style={{ padding: "5px 4px", background: (scene.subtextAnimation||"none") === a.v ? "#150f2a" : "#111", border: `1px solid ${(scene.subtextAnimation||"none") === a.v ? "#c4b5fd" : "#222"}`, borderRadius: 5, color: (scene.subtextAnimation||"none") === a.v ? "#c4b5fd" : "#555", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  <Icon name={a.icon} size={10} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Anzeigedauer ── */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e" }}>
        <F label={`Anzeigedauer: ${(scene.holdMs / 1000).toFixed(1)}s`}>
          <input type="range" min={300} max={8000} step={100} value={scene.holdMs}
            onChange={e => u("holdMs", parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "#c4b5fd" }} />
        </F>
      </div>

      {/* ── Mini-Vorschau ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ background: bg, borderRadius: 6, padding: "10px 14px", minHeight: 50, display: "flex", alignItems: "center", justifyContent: scene.textAlign === "center" ? "center" : scene.textAlign === "right" ? "flex-end" : "flex-start" }}>
          <div style={{ textAlign: scene.textAlign }}>
            <p style={{ margin: 0, color: scene.textColor, fontSize: parseInt(scene.fontSize||16) * 0.65, fontWeight: scene.fontWeight, fontFamily: "Arial, sans-serif", lineHeight: 1.3 }}>{scene.text || "…"}</p>
            {scene.subtext && <p style={{ margin: "3px 0 0", color: scene.subtextColor, fontSize: parseInt(scene.subtextSize||12) * 0.65, fontFamily: "Arial, sans-serif" }}>{scene.subtext}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene Editor (left: detail editor, right: vertical scene list) ───────────
function SceneEditor({ scenes, onChange, globalProps, onGlobalChange }) {
  const [selectedId, setSelectedId] = useState(scenes[0]?.id || null);
  const selectedScene = scenes.find(s => s.id === selectedId);
  const totalMs = scenes.reduce((sum, s) => sum + s.holdMs + s.transitionOutMs, 0);

  function addScene() {
    const last = scenes[scenes.length - 1] || {};
    // Strip timing fields so they reset to defaults; copy everything else
    const { id: _id, holdMs: _h, transitionOutType: _t, transitionOutMs: _ms, ...inherited } = last;
    const n = DEFAULT_SCENE(inherited);
    onChange([...scenes, n]);
    setSelectedId(n.id);
  }

  function deleteScene(id) {
    const next = scenes.filter(s => s.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  }

  function updateScene(id, updated) {
    onChange(scenes.map(s => s.id === id ? updated : s));
  }

  function updateTransition(id, patch) {
    onChange(scenes.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 16, alignItems: "start" }}>

      {/* ── Left: selected scene editor + global settings ── */}
      <div>
        {selectedScene ? (
          <div style={{ padding: 14, background: "#111", borderRadius: 8, border: "1px solid #c4b5fd33", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="adjustments" size={13} />
              Szene {scenes.findIndex(s => s.id === selectedId) + 1} bearbeiten
            </div>
            <SceneItemEditor scene={selectedScene} onChange={updated => updateScene(selectedId, updated)} />
          </div>
        ) : (
          <div style={{ padding: 20, color: "#444", fontSize: 13, textAlign: "center" }}>Szene auswählen →</div>
        )}

        {/* Global settings */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 10, background: "#111", borderRadius: 7, border: "1px solid #1e1e1e" }}>
          <F label="Höhe (px)"><input style={iStyle} type="number" value={globalProps.height} onChange={e => onGlobalChange("height", e.target.value)} /></F>
          <F label="Eckenradius (px)"><input style={iStyle} type="number" value={globalProps.borderRadius} onChange={e => onGlobalChange("borderRadius", e.target.value)} /></F>
          <F label="Innenabstand (px)"><input style={iStyle} type="number" value={globalProps.padding} onChange={e => onGlobalChange("padding", e.target.value)} /></F>
          <F label="Link-URL"><input style={iStyle} value={globalProps.linkUrl||""} onChange={e => onGlobalChange("linkUrl", e.target.value)} placeholder="https://…" /></F>
        </div>
      </div>

      {/* ── Right: vertical scene list ── */}
      <div style={{ position: "sticky", top: 0 }}>
        <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Szenen</span>
          <span style={{ color: "#333" }}>{(totalMs/1000).toFixed(1)}s gesamt</span>
        </div>

        <div style={{ overflowY: "auto", maxHeight: 520 }}>
          {scenes.map((scene, i) => (
            <React.Fragment key={scene.id}>
              <SceneThumbnail
                scene={scene} index={i}
                selected={selectedId === scene.id}
                onClick={() => setSelectedId(scene.id)}
                onDelete={() => deleteScene(scene.id)}
                canDelete={scenes.length > 1}
              />
              <TransitionConnector
                scene={scene}
                onChange={patch => updateTransition(scene.id, patch)}
                isLast={i === scenes.length - 1}
              />
            </React.Fragment>
          ))}

          <button onClick={addScene}
            style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px dashed #2a2a2a", background: "transparent", color: "#555", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 2 }}>
            <Icon name="plus" size={13} />Szene hinzufügen
          </button>
        </div>
      </div>

    </div>
  );
}

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
  if (p.gif_data) {
    const href = p.linkUrl ? buildUrl(p.linkUrl, p) : null;
    const img = <img src={`data:image/gif;base64,${p.gif_data}`} alt={p.text} style={{ display: "block", width: "100%", borderRadius: `${parseInt(p.borderRadius)||0}px` }} />;
    return href ? <a href={href} style={{ display: "block", textDecoration: "none" }}>{img}</a> : img;
  }
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

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="sparkles" size={11} style={{ color: "#c4b5fd" }} /> Animiertes GIF
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
          {ANIM_TYPES.map(a => (
            <button key={a.value} onClick={() => u("animationType", a.value)}
              style={{ padding: "5px 8px", background: p.animationType === a.value ? "#150f2a" : "#111", border: `1px solid ${p.animationType === a.value ? "#c4b5fd" : "#222"}`, borderRadius: 5, color: p.animationType === a.value ? "#c4b5fd" : "#555", cursor: "pointer", fontSize: 11, textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name={a.icon} size={11} />{a.label}
            </button>
          ))}
        </div>
        {p.animationType !== "none" && (
          <F label="Geschwindigkeit">
            <div style={{ display: "flex", gap: 4 }}>
              {[["slow","Langsam"],["medium","Mittel"],["fast","Schnell"]].map(([v, l]) => (
                <button key={v} onClick={() => u("animSpeed", v)}
                  style={{ flex: 1, padding: "4px", background: p.animSpeed === v ? "#150f2a" : "#111", border: `1px solid ${p.animSpeed === v ? "#c4b5fd" : "#222"}`, borderRadius: 5, color: p.animSpeed === v ? "#c4b5fd" : "#555", cursor: "pointer", fontSize: 10 }}>{l}</button>
              ))}
            </div>
          </F>
        )}
        {p.animationType !== "none" && p.gif_data && (
          <div style={{ fontSize: 10, color: "#6ee7b7", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Icon name="circle-check" size={11} />GIF bereit ({Math.round(p.gif_data.length * 0.75 / 1024)} KB)
            <button onClick={() => u("gif_data", "")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 10 }}>× entfernen</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Banner Editor ────────────────────────────────────────────────────────────
function BannerEditor({ initial, onSave, onCancel, toast }) {
  const [name, setName]       = useState(initial?.name || "");
  const [props, setProps]     = useState(() => {
    if (initial?.props_json) {
      try { return { ...DEFAULT_PROPS, ...JSON.parse(initial.props_json) }; } catch {}
    }
    return { ...DEFAULT_PROPS };
  });
  const [saving, setSaving]   = useState(false);
  const [genning, setGenning] = useState(false);
  const isNew = !initial?.id;

  // Scene mode: props.scenes array present and length >= 2
  const isSceneMode = Array.isArray(props.scenes) && props.scenes.length >= 1;

  function enableSceneMode() {
    // Convert current single-scene props to first scene
    const firstScene = DEFAULT_SCENE({
      text: props.text, subtext: props.subtext,
      textColor: props.textColor, subtextColor: props.subtextColor,
      fontSize: props.fontSize, subtextSize: props.subtextSize,
      fontWeight: props.fontWeight, textAlign: props.textAlign,
      bgType: props.bgType, color1: props.color1, color2: props.color2, gradientDir: props.gradientDir,
    });
    const secondScene = DEFAULT_SCENE({ color1: props.color2||"#f08030", color2: props.color1 });
    setProps(p => ({ ...p, scenes: [firstScene, secondScene], gif_data: "" }));
  }

  function disableSceneMode() {
    setProps(p => { const n = { ...p }; delete n.scenes; n.gif_data = ""; return n; });
  }

  async function generateGif() {
    setGenning(true);
    try {
      const token = localStorage.getItem("sm_token");
      const r = await fetch("/api/banners/preview-gif", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(props),
      });
      const d = await r.json();
      if (d.gif_b64) {
        setProps(p => ({ ...p, gif_data: d.gif_b64 }));
        toast("ok", "GIF generiert");
      } else {
        toast("err", d.detail || "GIF-Generierung fehlgeschlagen");
      }
    } catch (e) {
      toast("err", "Verbindungsfehler: " + e.message);
    }
    setGenning(false);
  }

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

  const gifReady = !!props.gif_data;

  return (
    <div style={{ background: "#161616", border: "1px solid #fce49944", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fce499" }}>
          {isNew ? "Neuer Banner" : `Bearbeiten: ${initial.name}`}
        </div>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 0, border: "1px solid #2a2a2a", borderRadius: 7, overflow: "hidden" }}>
          <button onClick={disableSceneMode}
            style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: !isSceneMode ? "#fce499" : "#111", color: !isSceneMode ? "#1a1a0a" : "#555", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="layout-list" size={12} />Einfach
          </button>
          <button onClick={isSceneMode ? undefined : enableSceneMode}
            style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: isSceneMode ? "#c4b5fd" : "#111", color: isSceneMode ? "#1a1a0a" : "#555", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="timeline" size={12} />Szenen
          </button>
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>Name</label>
        <input style={{ width: "100%", padding: "8px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Sommerkampagne" />
      </div>

      {/* Mode content */}
      {isSceneMode ? (
        <SceneEditor
          scenes={props.scenes}
          onChange={scenes => setProps(p => ({ ...p, scenes, gif_data: "" }))}
          globalProps={props}
          onGlobalChange={(k, v) => setProps(p => ({ ...p, [k]: v }))}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#111", borderRadius: 8, border: "1px solid #222", padding: 12, maxHeight: 520, overflowY: "auto" }}>
            <BannerPropEditor p={props} onChange={setProps} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Live-Vorschau</div>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 16, minHeight: 120 }}>
              <BannerPreview p={props} />
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#444" }}>Vorschau entspricht dem Aussehen in der E-Mail.</div>
          </div>
        </div>
      )}

      {/* GIF status */}
      {gifReady && (
        <div style={{ marginTop: 12, padding: "8px 12px", background: "#0a1f14", border: "1px solid #064e3b", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="circle-check" size={14} style={{ color: "#6ee7b7" }} />
          <span style={{ fontSize: 12, color: "#6ee7b7" }}>GIF bereit — {Math.round(props.gif_data.length * 0.75 / 1024)} KB</span>
          <button onClick={() => setProps(p => ({ ...p, gif_data: "" }))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 11 }}>× entfernen</button>
          {isSceneMode && (
            <div style={{ background: "#111", borderRadius: 6, overflow: "hidden" }}>
              <img src={`data:image/gif;base64,${props.gif_data}`} alt="Vorschau" style={{ display: "block", maxHeight: 80, width: "auto" }} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <Icon name="device-floppy" />{saving ? "Speichern..." : "Speichern"}
        </button>
        {(isSceneMode || props.animationType !== "none") && (
          <button onClick={generateGif} disabled={genning}
            style={{ padding: "8px 16px", background: genning ? "#111" : "#150f2a", color: genning ? "#555" : "#c4b5fd", border: "1px solid #c4b5fd44", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name={genning ? "loader" : "sparkles"} size={14} />
            {genning ? "Generiere GIF…" : gifReady ? "GIF neu generieren" : "GIF generieren"}
          </button>
        )}
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

      {!editing && banners.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="ad" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Banner</div>
        </div>
      )}

      {!editing && banners.map(b => {
        let p = DEFAULT_PROPS;
        try { p = { ...DEFAULT_PROPS, ...JSON.parse(b.props_json) }; } catch {}

        // Scene mode without GIF: show first scene's content as preview
        let previewProps = p;
        if (!p.gif_data && Array.isArray(p.scenes) && p.scenes.length > 0) {
          previewProps = { ...p, ...p.scenes[0] };
        }

        return (
          <div key={b.id}
            draggable
            onDragStart={() => handleDragStart(b.id)}
            onDragOver={e => handleDragOver(e, b.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(b.id)}
            onDragEnd={() => { setDragOver(null); setDragId(null); }}
            style={{ background: "#161616", border: `2px solid ${dragOver === b.id ? "#fce499" : "#222"}`, borderRadius: 10, marginBottom: 8, overflow: "hidden", cursor: "grab", opacity: dragId === b.id ? 0.4 : 1, transition: "border-color .1s" }}>
            <div style={{ pointerEvents: "none" }}>
              <BannerPreview p={previewProps} />
            </div>
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #222" }}>
              <Icon name="ad" size={13} style={{ color: "#555" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ddd", flex: 1 }}>{b.name}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12 }} onClick={() => setEditing(b)}>
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
