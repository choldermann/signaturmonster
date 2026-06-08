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
  bgImage: "",
  bgImageFit: "cover", bgImageX: "50", bgImageY: "50", bgImageRepeat: "no-repeat", bgImageWidth: "100", bgImageHeight: "100",
  bgOverlayColor: "#000000", bgOverlayOpacity: "0",
  borderWidth: "0", borderColor: "#ffffff",
  text: "Jetzt Termin buchen!", textColor: "#333333",
  fontSize: "16", fontWeight: "bold", textAlign: "center",
  textStrokeWidth: "0", textStrokeColor: "#000000",
  textShadowOpacity: "0", textShadowColor: "#000000", textShadowX: "2", textShadowY: "2",
  subtext: "", subtextColor: "#555555", subtextSize: "12",
  subtextStrokeWidth: "0", subtextStrokeColor: "#000000",
  subtextShadowOpacity: "0", subtextShadowColor: "#000000", subtextShadowX: "2", subtextShadowY: "2",
  linkUrl: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "",
  borderRadius: "8", padding: "16",
  animationType: "none", animSpeed: "medium", gif_data: "",
  // Pattern
  patternType: "none",
  patternSpacingX: "20",
  patternSpacingY: "20",
  patternSize: "2",
  patternColor: "#ffffff",
  patternOpacity: "30",
  // Font
  fontFamily: "sans",
  fontStyle: "normal",
  subtextFontFamily: "sans",
  subtextFontStyle: "normal",
  // Rich text
  textIsHtml: false,
  subtextIsHtml: false,
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
  bgImage: "",
  bgImageFit: "cover", bgImageX: "50", bgImageY: "50", bgImageRepeat: "no-repeat", bgImageWidth: "100", bgImageHeight: "100",
  bgOverlayColor: "#000000", bgOverlayOpacity: "0",
  borderWidth: "0", borderColor: "#ffffff",
  textStrokeWidth: "0", textStrokeColor: "#000000",
  textShadowOpacity: "0", textShadowColor: "#000000", textShadowX: "2", textShadowY: "2",
  subtextStrokeWidth: "0", subtextStrokeColor: "#000000",
  subtextShadowOpacity: "0", subtextShadowColor: "#000000", subtextShadowX: "2", subtextShadowY: "2",
  holdMs: 2500,
  transitionOutType: "fade",
  transitionOutMs: 400,
  textAnimation: "none",
  subtextAnimation: "none",
  textExitAnimation: "none",
  subtextExitAnimation: "none",
  // Pattern
  patternType: "none",
  patternSpacingX: "20",
  patternSpacingY: "20",
  patternSize: "2",
  patternColor: "#ffffff",
  patternOpacity: "30",
  // Font
  fontFamily: "sans",
  fontStyle: "normal",
  subtextFontFamily: "sans",
  subtextFontStyle: "normal",
  // Rich text
  textIsHtml: false,
  subtextIsHtml: false,
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

// ─── CSS pattern helper ───────────────────────────────────────────────────────
function _bgPosCss(val, fallback = "50%") {
  const named = { left: "0%", center: "50%", right: "100%", top: "0%", bottom: "100%" };
  if (named[val] !== undefined) return named[val];
  const n = parseInt(val);
  return isNaN(n) ? fallback : `${n}%`;
}

function bgImageCss(scene) {
  const fit = scene.bgImageFit || "cover";
  const fitMap = { cover: "cover", contain: "contain", "auto-height": "auto 100%", fill: "100% 100%" };
  const size   = fit === "custom"
    ? `${scene.bgImageWidth || 100}% ${scene.bgImageHeight || 100}%`
    : (fitMap[fit] || "cover");
  const x      = _bgPosCss(scene.bgImageX, "50%");
  const y      = _bgPosCss(scene.bgImageY, "50%");
  const repeat = scene.bgImageRepeat || "no-repeat";
  return {
    backgroundImage:    `url(${scene.bgImage})`,
    backgroundSize:     size,
    backgroundPosition: `${x} ${y}`,
    backgroundRepeat:   repeat,
  };
}

// Layer pattern SVG on top of an existing bgStyle (handles multi-layer backgroundSize/Repeat/Position)
function applyPatternToImageCss(imgCss, scene) {
  const patBg = makePatternBg(scene);
  if (!patBg) return imgCss;
  return {
    ...imgCss,
    backgroundImage:    `${patBg}, ${imgCss.backgroundImage}`,
    backgroundSize:     `auto, ${imgCss.backgroundSize}`,
    backgroundPosition: `0 0, ${imgCss.backgroundPosition}`,
    backgroundRepeat:   `repeat, ${imgCss.backgroundRepeat}`,
  };
}

function makePatternBg(scene) {
  const type = scene.patternType || "none";
  if (type === "none") return null;

  const sx   = parseInt(scene.patternSpacingX || 20);
  const sy   = parseInt(scene.patternSpacingY || 20);
  const size = parseInt(scene.patternSize || 2);
  const color = scene.patternColor || "#ffffff";
  const op  = parseFloat(scene.patternOpacity || 30) / 100;

  let svgContent = "";
  if (type === "dots") {
    svgContent = `<circle cx="${sx/2}" cy="${sy/2}" r="${size}" fill="${color}" opacity="${op}"/>`;
  } else if (type === "lines-h") {
    const half = size / 2;
    svgContent = `<rect x="0" y="${sy/2 - half}" width="${sx}" height="${size}" fill="${color}" opacity="${op}"/>`;
  } else if (type === "lines-v") {
    const half = size / 2;
    svgContent = `<rect x="${sx/2 - half}" y="0" width="${size}" height="${sy}" fill="${color}" opacity="${op}"/>`;
  } else if (type === "grid") {
    const halfH = size / 2;
    const halfV = size / 2;
    svgContent = `<rect x="0" y="${sy/2 - halfH}" width="${sx}" height="${size}" fill="${color}" opacity="${op}"/>` +
                 `<rect x="${sx/2 - halfV}" y="0" width="${size}" height="${sy}" fill="${color}" opacity="${op}"/>`;
  } else if (type === "noise") {
    // Deterministic 4x4 tile with fixed dot positions
    const positions = [[0.1,0.2],[0.7,0.5],[0.4,0.8],[0.9,0.1],[0.3,0.6],[0.6,0.3],[0.15,0.75],[0.85,0.45]];
    const tileW = sx * 2;
    const tileH = sy * 2;
    const dots = positions.map(([fx, fy]) =>
      `<circle cx="${fx * tileW}" cy="${fy * tileH}" r="${Math.max(1, size)}" fill="${color}" opacity="${op}"/>`
    ).join("");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tileW}' height='${tileH}'>${dots}</svg>`;
    const encoded = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encoded}")`;
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sx}' height='${sy}'>${svgContent}</svg>`;
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}")`;
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 600;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        onChange(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      {value ? (
        <div style={{ position: "relative", borderRadius: 6, overflow: "hidden" }}>
          <img src={value} alt="" style={{ width: "100%", display: "block", maxHeight: 120, objectFit: "cover" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,.7)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>
            × entfernen
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
          style={{ border: `2px dashed ${dragging ? "#c4b5fd" : "#2a2a2a"}`, borderRadius: 8, padding: "18px 12px", textAlign: "center", cursor: "pointer", color: dragging ? "#c4b5fd" : "#555", fontSize: 12, transition: "border-color .15s, color .15s" }}>
          <Icon name="upload" size={18} style={{ display: "block", margin: "0 auto 5px" }} />
          Bild hochladen oder hierher ziehen
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { processFile(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

// ─── Scene Thumbnail (vertical list) ─────────────────────────────────────────
function SceneThumbnail({ scene, index, selected, onClick, onDelete, canDelete, onCopy,
                          isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
  const bgStyle = scene.bgType === "image" && scene.bgImage
    ? bgImageCss(scene)
    : { background: scene.bgType === "gradient"
        ? (scene.gradientDir === "radial"
            ? `radial-gradient(circle, ${scene.color1}, ${scene.color2})`
            : `linear-gradient(${cssDirMap[scene.gradientDir]||"to right"},${scene.color1},${scene.color2})`)
        : scene.color1 };
  const justify = { center: "center", right: "flex-end", left: "flex-start" }[scene.textAlign] || "flex-start";
  const isOutlookFallback = index === 0;
  return (
    <div draggable
      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onClick={onClick}
      style={{ cursor: "pointer", borderRadius: 7, overflow: "hidden",
               border: `2px solid ${isDragOver ? "#fce499" : selected ? "#c4b5fd" : isOutlookFallback ? "#2a3a2a" : "#222"}`,
               transition: "border-color .15s", userSelect: "none" }}>
      <div style={{ ...bgStyle, minHeight: 44, display: "flex", alignItems: "center", justifyContent: justify, padding: "6px 8px" }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: scene.textAlign }}>
          <div style={{ color: scene.textColor, fontSize: 10, fontWeight: scene.fontWeight, lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
            dangerouslySetInnerHTML={{ __html: scene.text || "…" }} />
          {scene.subtext && <div style={{ color: scene.subtextColor||"#aaa", fontSize: 8, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
            dangerouslySetInnerHTML={{ __html: scene.subtext || "" }} />}
        </div>
        <span style={{ fontSize: 8, color: scene.textColor, opacity: 0.55, flexShrink: 0, marginLeft: 4 }}>{(scene.holdMs/1000).toFixed(1)}s</span>
      </div>
      <div style={{ background: "#111", padding: "3px 6px", display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="grip-vertical" size={10} style={{ color: "#333", cursor: "grab", flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: selected ? "#c4b5fd" : "#777", fontWeight: 600, flex: 1 }}>
          {isOutlookFallback
            ? <span style={{ color: "#4ade80", fontSize: 8 }}>Outlook-Fallback</span>
            : `Szene ${index + 1}`}
        </span>
        <button onClick={e => { e.stopPropagation(); onCopy(); }}
          title="Szene duplizieren"
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "1px 3px", fontSize: 10, lineHeight: 1 }}>⧉</button>
        {canDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "1px 3px", fontSize: 11, lineHeight: 1 }}>×</button>
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

// ─── Scene Anim Column (Einblenden + Ausblenden, vertical icon grid) ──────────
function SceneAnimCol({ inKey, outKey, scene, onChange }) {
  const u = (k, v) => onChange({ ...scene, [k]: v });
  const ab = (active) => ({
    padding: "4px 0", borderRadius: 4, cursor: "pointer",
    background: active ? "#1a0f3a" : "transparent",
    border: `1px solid ${active ? "#c4b5fd" : "#1a1a1a"}`,
    color: active ? "#c4b5fd" : "#555",
    display: "flex", alignItems: "center", justifyContent: "center",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div>
        <div style={{ fontSize: 8, color: "#888", marginBottom: 4, letterSpacing: ".4px" }}>▶ EINBL.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          {TEXT_ANIMS.map(a => (
            <button key={a.v} onClick={() => u(inKey, a.v)} title={a.label}
              style={ab((scene[inKey]||"none") === a.v)}>
              <Icon name={a.icon} size={10} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 8, color: "#888", marginBottom: 4, letterSpacing: ".4px" }}>◀ AUSBL.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          {TEXT_ANIMS.map(a => (
            <button key={a.v} onClick={() => u(outKey, a.v)} title={a.label}
              style={ab((scene[outKey]||"none") === a.v)}>
              <Icon name={a.icon} size={10} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pattern Editor ───────────────────────────────────────────────────────────
function PatternEditor({ scene, onChange }) {
  const u = (k, v) => onChange({ ...scene, [k]: v });
  const type = scene.patternType || "none";

  const PATTERN_TYPES = [
    { v: "none",    label: "Kein" },
    { v: "dots",    label: "Punkte" },
    { v: "lines-h", label: "Linien H" },
    { v: "lines-v", label: "Linien V" },
    { v: "grid",    label: "Raster" },
    { v: "noise",   label: "Noise" },
  ];

  const btnStyle = (active) => ({
    padding: "3px 6px", fontSize: 9, borderRadius: 4, cursor: "pointer", border: "1px solid",
    background: active ? "#1a1500" : "#111",
    borderColor: active ? "#fce499" : "#2a2a2a",
    color: active ? "#fce499" : "#555",
  });

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Muster</div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
        {PATTERN_TYPES.map(pt => (
          <button key={pt.v} onClick={() => u("patternType", pt.v)} style={btnStyle(type === pt.v)}>{pt.label}</button>
        ))}
      </div>
      {type !== "none" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "#999", minWidth: 36, flexShrink: 0 }}>Abst. X</span>
            <input style={{ ...iStyle, width: 44, padding: "4px 6px" }} type="number" min="4" max="200"
              value={scene.patternSpacingX || "20"} onChange={e => u("patternSpacingX", e.target.value)} />
            <span style={{ fontSize: 9, color: "#999", minWidth: 36, flexShrink: 0 }}>Abst. Y</span>
            <input style={{ ...iStyle, width: 44, padding: "4px 6px" }} type="number" min="4" max="200"
              value={scene.patternSpacingY || "20"} onChange={e => u("patternSpacingY", e.target.value)} />
            <span style={{ fontSize: 9, color: "#999", minWidth: 24, flexShrink: 0 }}>Größe</span>
            <input style={{ ...iStyle, width: 40, padding: "4px 6px" }} type="number" min="1" max="40"
              value={scene.patternSize || "2"} onChange={e => u("patternSize", e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "#999", minWidth: 36, flexShrink: 0 }}>Farbe</span>
            <input type="color" value={scene.patternColor || "#ffffff"} onChange={e => u("patternColor", e.target.value)}
              style={{ width: 24, height: 24, padding: 1, border: "1px solid #2a2a2a", borderRadius: 3, cursor: "pointer", background: "#111", flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "#999", flexShrink: 0 }}>Deckkraft</span>
            <input type="range" min={0} max={100} value={parseInt(scene.patternOpacity || 30)}
              onChange={e => u("patternOpacity", e.target.value)}
              style={{ flex: 1, accentColor: "#c4b5fd", minWidth: 50 }} />
            <span style={{ fontSize: 9, color: "#777", minWidth: 22, flexShrink: 0 }}>{parseInt(scene.patternOpacity || 30)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
function RichTextEditor({ value, onChange, placeholder, textColor, fontSize, fontWeight, fontStyle, fontFamily }) {
  const editRef = useRef(null);
  const initialized = useRef(false);

  // Initialize content only once on mount
  useEffect(() => {
    if (editRef.current && !initialized.current) {
      editRef.current.innerHTML = value || "";
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const execCmd = (cmd, val = null) => {
    editRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const fontSizeMap = { 10: 1, 12: 2, 14: 3, 16: 4, 18: 5, 20: 5, 24: 6, 28: 7, 32: 7 };

  const toolbarBtn = (label, cmd, val = null, title = "") => (
    <button onMouseDown={e => { e.preventDefault(); execCmd(cmd, val); }}
      title={title || label}
      style={{ padding: "2px 6px", fontSize: 11, fontWeight: cmd === "bold" ? "bold" : (cmd === "italic" ? "italic" : "normal"),
        background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 3, color: "#bbb", cursor: "pointer", fontFamily: "inherit" }}>
      {label}
    </button>
  );

  const fontFamilyMap = { sans: "DejaVu Sans, Arial, sans-serif", serif: "DejaVu Serif, Georgia, serif", mono: "DejaVu Sans Mono, monospace" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center", padding: "4px 6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px 4px 0 0" }}>
        {toolbarBtn("B", "bold", null, "Fett")}
        {toolbarBtn("I", "italic", null, "Kursiv")}
        <input type="color" defaultValue={textColor || "#333333"}
          onInput={e => { execCmd("foreColor", e.target.value); }}
          title="Textfarbe"
          style={{ width: 22, height: 22, padding: 1, border: "1px solid #2a2a2a", borderRadius: 3, cursor: "pointer", background: "#111", flexShrink: 0 }} />
        <select defaultValue="16"
          onChange={e => { const s = fontSizeMap[parseInt(e.target.value)] || 4; execCmd("fontSize", s); }}
          style={{ ...iStyle, width: 55, padding: "2px 4px", fontSize: 10 }}>
          {[10,12,14,16,18,20,24,28,32].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <select defaultValue="sans"
          onChange={e => { execCmd("fontName", fontFamilyMap[e.target.value] || fontFamilyMap["sans"]); }}
          style={{ ...iStyle, width: 65, padding: "2px 4px", fontSize: 10 }}>
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
        <button onMouseDown={e => { e.preventDefault(); execCmd("removeFormat"); }}
          title="Formatierung entfernen"
          style={{ padding: "2px 6px", fontSize: 11, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 3, color: "#f87171", cursor: "pointer" }}>
          ✕
        </button>
      </div>
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editRef.current?.innerHTML || "")}
        data-placeholder={placeholder || ""}
        style={{
          minHeight: 50, padding: "7px 10px", background: "#111", border: "1px solid #2a2a2a",
          borderTop: "none", borderRadius: "0 0 6px 6px", color: textColor || "#ddd",
          fontSize: `${fontSize || 14}px`, fontWeight: fontWeight || "normal",
          fontStyle: fontStyle || "normal", fontFamily: "inherit",
          outline: "none", lineHeight: 1.5,
        }}
      />
    </div>
  );
}

// ─── Image Fit & Position Controls ───────────────────────────────────────────
function ImageFitControls({ scene, onChange }) {
  const u = (k, v) => onChange({ ...scene, [k]: v });
  const fit    = scene.bgImageFit    || "cover";
  const repeat = scene.bgImageRepeat || "no-repeat";

  // Normalize stored value (named or numeric string) to 0-100 integer for slider
  const namedToNum = { left: 0, center: 50, right: 100, top: 0, bottom: 100 };
  const toNum = (v, fallback = 50) => {
    if (v === undefined || v === "") return fallback;
    if (namedToNum[v] !== undefined) return namedToNum[v];
    const n = parseInt(v); return isNaN(n) ? fallback : n;
  };
  const ixNum = toNum(scene.bgImageX, 50);
  const iyNum = toNum(scene.bgImageY, 50);

  const chip = (active, onClick, lbl) => (
    <button onClick={onClick}
      style={{ flex: 1, padding: "3px 4px", fontSize: 10, cursor: "pointer", borderRadius: 4,
               background: active ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a",
               color: active ? "#1a1a0a" : "#aaa" }}>{lbl}</button>
  );

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>

      {/* Fit */}
      <div>
        <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Bildgröße</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {chip(fit==="cover",       () => u("bgImageFit","cover"),       "Cover")}
          {chip(fit==="contain",     () => u("bgImageFit","contain"),     "Enthalt.")}
          {chip(fit==="auto-height", () => u("bgImageFit","auto-height"), "∞ Höhe")}
          {chip(fit==="fill",        () => u("bgImageFit","fill"),        "Strecken")}
          {chip(fit==="custom",      () => u("bgImageFit","custom"),      "Eigen")}
        </div>
      </div>

      {/* Custom W/H sliders */}
      {fit === "custom" && (() => {
        const bw = parseInt(scene.bgImageWidth  || 100);
        const bh = parseInt(scene.bgImageHeight || 100);
        const sliderRow = (label, val, key, min = 10, max = 300) => (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: "#999", minWidth: 16, flexShrink: 0 }}>{label}</span>
            <input type="range" min={min} max={max} value={val}
              onChange={e => u(key, e.target.value)}
              style={{ flex: 1, accentColor: "#fce499" }} />
            <span style={{ fontSize: 9, color: "#aaa", minWidth: 30, flexShrink: 0, textAlign: "right" }}>{val}%</span>
            <input style={{ ...iStyle, width: 48, padding: "3px 5px", fontSize: 11 }}
              type="number" min={min} max={max} value={val}
              onChange={e => u(key, e.target.value)} />
          </div>
        );
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "6px 0" }}>
            {sliderRow("B", bw, "bgImageWidth")}
            {sliderRow("H", bh, "bgImageHeight")}
          </div>
        );
      })()}

      {/* Repeat */}
      <div>
        <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Wiederholung</div>
        <div style={{ display: "flex", gap: 3 }}>
          {chip(repeat==="no-repeat", () => u("bgImageRepeat","no-repeat"), "Kein")}
          {chip(repeat==="repeat",    () => u("bgImageRepeat","repeat"),    "Kachel")}
          {chip(repeat==="repeat-x",  () => u("bgImageRepeat","repeat-x"),  "↔ Hor.")}
          {chip(repeat==="repeat-y",  () => u("bgImageRepeat","repeat-y"),  "↕ Vert.")}
        </div>
      </div>

      {/* X Position */}
      <div>
        <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
          ↔ Position X — {ixNum}%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={() => u("bgImageX","0")}
            style={{ fontSize: 9, padding: "2px 6px", background: ixNum===0 ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: ixNum===0 ? "#1a1a0a" : "#aaa", cursor: "pointer", flexShrink: 0 }}>←</button>
          <input type="range" min={0} max={100} value={ixNum}
            onChange={e => u("bgImageX", e.target.value)}
            style={{ flex: 1, accentColor: "#fce499" }} />
          <button onClick={() => u("bgImageX","50")}
            style={{ fontSize: 9, padding: "2px 6px", background: ixNum===50 ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: ixNum===50 ? "#1a1a0a" : "#aaa", cursor: "pointer", flexShrink: 0 }}>⊕</button>
          <button onClick={() => u("bgImageX","100")}
            style={{ fontSize: 9, padding: "2px 6px", background: ixNum===100 ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: ixNum===100 ? "#1a1a0a" : "#aaa", cursor: "pointer", flexShrink: 0 }}>→</button>
        </div>
      </div>

      {/* Y Position */}
      <div>
        <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
          ↕ Position Y — {iyNum}%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button onClick={() => u("bgImageY","0")}
            style={{ fontSize: 9, padding: "2px 6px", background: iyNum===0 ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: iyNum===0 ? "#1a1a0a" : "#aaa", cursor: "pointer", flexShrink: 0 }}>↑</button>
          <input type="range" min={0} max={100} value={iyNum}
            onChange={e => u("bgImageY", e.target.value)}
            style={{ flex: 1, accentColor: "#fce499" }} />
          <button onClick={() => u("bgImageY","50")}
            style={{ fontSize: 9, padding: "2px 6px", background: iyNum===50 ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: iyNum===50 ? "#1a1a0a" : "#aaa", cursor: "pointer", flexShrink: 0 }}>⊕</button>
          <button onClick={() => u("bgImageY","100")}
            style={{ fontSize: 9, padding: "2px 6px", background: iyNum===100 ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: iyNum===100 ? "#1a1a0a" : "#aaa", cursor: "pointer", flexShrink: 0 }}>↓</button>
        </div>
      </div>

    </div>
  );
}

// ─── Scene Item Editor — accordion blocks layout ──────────────────────────────
function SceneItemEditor({ scene, onChange }) {
  const u = (k, v) => onChange({ ...scene, [k]: v });
  const [openText1, setOpenText1] = useState(true);
  const [openText2, setOpenText2] = useState(false);
  const [openBg,    setOpenBg]    = useState(false);

  const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
  const getBgStyle = (s) => {
    if (s.bgType === "image" && s.bgImage) {
      return applyPatternToImageCss(bgImageCss(s), s);
    }
    if (s.bgType === "gradient") {
      const grad = s.gradientDir === "radial"
        ? `radial-gradient(circle, ${s.color1}, ${s.color2})`
        : `linear-gradient(${cssDirMap[s.gradientDir]||"to right"},${s.color1},${s.color2})`;
      const patBg = makePatternBg(s);
      return patBg ? { backgroundImage: `${patBg}, ${grad}` } : { background: grad };
    }
    const patBg = makePatternBg(s);
    return patBg
      ? { backgroundColor: s.color1, backgroundImage: patBg }
      : { background: s.color1 };
  };
  const bgStyle = getBgStyle(scene);
  const justifyMap = { center: "center", right: "flex-end", left: "flex-start" };
  const blockBox = { background: "#111", borderRadius: 8, border: "1px solid #1e1e1e", overflow: "hidden" };
  const animBox  = { ...blockBox, padding: "8px 8px 6px", flexShrink: 0, width: 112 };

  function blockHdr(icon, label, open, onToggle, inputEl, extraEl) {
    return (
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", cursor: "pointer", borderBottom: open ? "1px solid #1a1a1a" : "none" }}>
        <Icon name={icon} size={12} style={{ color: "#888", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#ccc", flexShrink: 0 }}>{label}</span>
        {inputEl && <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>{inputEl}</div>}
        {extraEl && <div onClick={e => e.stopPropagation()}>{extraEl}</div>}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={11} style={{ color: "#666", flexShrink: 0, marginLeft: extraEl ? 4 : "auto" }} />
      </div>
    );
  }

  function textFxUpdate(prefix, d) {
    onChange({ ...scene,
      ...(d.strokeWidth  !== undefined && { [`${prefix}StrokeWidth`]:  d.strokeWidth }),
      ...(d.strokeColor  !== undefined && { [`${prefix}StrokeColor`]:  d.strokeColor }),
      ...(d.shadowOpacity !== undefined && { [`${prefix}ShadowOpacity`]: d.shadowOpacity }),
      ...(d.shadowColor  !== undefined && { [`${prefix}ShadowColor`]:  d.shadowColor }),
      ...(d.shadowX      !== undefined && { [`${prefix}ShadowX`]:      d.shadowX }),
      ...(d.shadowY      !== undefined && { [`${prefix}ShadowY`]:      d.shadowY }),
    });
  }

  function bgFxUpdate(d) {
    onChange({ ...scene,
      ...(d.overlayColor   !== undefined && { bgOverlayColor:   d.overlayColor }),
      ...(d.overlayOpacity !== undefined && { bgOverlayOpacity: d.overlayOpacity }),
      ...(d.borderWidth    !== undefined && { borderWidth:       d.borderWidth }),
      ...(d.borderColor    !== undefined && { borderColor:       d.borderColor }),
    });
  }

  // Toggle for rich text mode
  const modeToggle = (isHtml, onToggle) => (
    <div style={{ display: "flex", gap: 1, border: "1px solid #2a2a2a", borderRadius: 4, overflow: "hidden" }}>
      <button onClick={() => onToggle(false)}
        style={{ padding: "2px 6px", fontSize: 9, background: !isHtml ? "#fce49933" : "transparent", border: "none", color: !isHtml ? "#fce499" : "#555", cursor: "pointer" }}>T</button>
      <button onClick={() => onToggle(true)}
        style={{ padding: "2px 6px", fontSize: 9, background: isHtml ? "#c4b5fd33" : "transparent", border: "none", color: isHtml ? "#c4b5fd" : "#555", cursor: "pointer" }}>✦</button>
    </div>
  );

  const FONT_FAMILIES = [{ v: "sans", label: "Sans" }, { v: "serif", label: "Serif" }, { v: "mono", label: "Mono" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

      {/* ── Haupttext block ── */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ ...blockBox, flex: 1, minWidth: 0 }}>
          {blockHdr("text-size", "Haupttext", openText1, () => setOpenText1(o => !o),
            scene.textIsHtml
              ? <div style={{ fontSize: 11, color: "#888", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontStyle: "italic" }}>
                  {(scene.text || "").replace(/<[^>]+>/g, "").slice(0, 40) || "Formatierter Text…"}
                </div>
              : <input style={{ ...iStyle, fontSize: 12 }} value={scene.text}
                  onChange={e => u("text", e.target.value)} placeholder="Haupttext…" />,
            modeToggle(scene.textIsHtml || false, (v) => u("textIsHtml", v))
          )}
          {openText1 && (
            <div style={{ padding: "10px 10px 8px" }}>
              {scene.textIsHtml ? (
                <RichTextEditor
                  value={scene.text || ""}
                  onChange={v => u("text", v)}
                  placeholder="Haupttext…"
                  textColor={scene.textColor}
                  fontSize={parseInt(scene.fontSize || 16)}
                  fontWeight={scene.fontWeight}
                  fontStyle={scene.fontStyle}
                  fontFamily={scene.fontFamily}
                />
              ) : (
                <>
                  <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                    <button onClick={() => u("fontWeight", scene.fontWeight === "bold" ? "normal" : "bold")}
                      style={{ width: 28, height: 27, background: scene.fontWeight === "bold" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.fontWeight === "bold" ? "#1a1a0a" : "#bbb", fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>B</button>
                    <button onClick={() => u("fontStyle", scene.fontStyle === "italic" ? "normal" : "italic")}
                      style={{ width: 28, height: 27, background: scene.fontStyle === "italic" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.fontStyle === "italic" ? "#1a1a0a" : "#bbb", fontStyle: "italic", cursor: "pointer", fontSize: 13 }}>I</button>
                    <input style={{ ...iStyle, width: 50, padding: "4px 6px" }} type="number" value={scene.fontSize} onChange={e => u("fontSize", e.target.value)} />
                    {["left","center","right"].map(a => (
                      <button key={a} onClick={() => u("textAlign", a)}
                        style={{ width: 27, height: 27, background: scene.textAlign === a ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.textAlign === a ? "#1a1a0a" : "#bbb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name={`align-${a}`} size={12} />
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                    {FONT_FAMILIES.map(ff => (
                      <button key={ff.v} onClick={() => u("fontFamily", ff.v)}
                        style={{ flex: 1, padding: "3px 4px", fontSize: 10, background: (scene.fontFamily||"sans") === ff.v ? "#1a1500" : "#111", border: `1px solid ${(scene.fontFamily||"sans") === ff.v ? "#fce499" : "#2a2a2a"}`, borderRadius: 4, color: (scene.fontFamily||"sans") === ff.v ? "#fce499" : "#555", cursor: "pointer" }}>{ff.label}</button>
                    ))}
                  </div>
                </>
              )}
              <F label="Textfarbe"><ColorInput value={scene.textColor} onChange={v => u("textColor", v)} /></F>
              <TextEffectsEditor
                strokeWidth={scene.textStrokeWidth} strokeColor={scene.textStrokeColor}
                shadowOpacity={scene.textShadowOpacity} shadowColor={scene.textShadowColor}
                shadowX={scene.textShadowX} shadowY={scene.textShadowY}
                onChange={d => textFxUpdate("text", d)}
              />
            </div>
          )}
        </div>
        <div style={animBox}>
          <SceneAnimCol inKey="textAnimation" outKey="textExitAnimation" scene={scene} onChange={onChange} />
        </div>
      </div>

      {/* ── Subtext block ── */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ ...blockBox, flex: 1, minWidth: 0 }}>
          {blockHdr("text", "Subtext", openText2, () => setOpenText2(o => !o),
            scene.subtextIsHtml
              ? <div style={{ fontSize: 11, color: "#888", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontStyle: "italic" }}>
                  {(scene.subtext || "").replace(/<[^>]+>/g, "").slice(0, 40) || "Subtext…"}
                </div>
              : <input style={{ ...iStyle, fontSize: 12 }} value={scene.subtext||""}
                  onChange={e => u("subtext", e.target.value)} placeholder="Subtext (optional)…" />,
            modeToggle(scene.subtextIsHtml || false, (v) => u("subtextIsHtml", v))
          )}
          {openText2 && (
            <div style={{ padding: "10px 10px 8px" }}>
              {scene.subtextIsHtml ? (
                <RichTextEditor
                  value={scene.subtext || ""}
                  onChange={v => u("subtext", v)}
                  placeholder="Subtext…"
                  textColor={scene.subtextColor}
                  fontSize={parseInt(scene.subtextSize || 12)}
                  fontStyle={scene.subtextFontStyle}
                  fontFamily={scene.subtextFontFamily}
                />
              ) : scene.subtext ? (
                <>
                  <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                    <button onClick={() => u("subtextFontStyle", scene.subtextFontStyle === "italic" ? "normal" : "italic")}
                      style={{ width: 28, height: 27, background: scene.subtextFontStyle === "italic" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.subtextFontStyle === "italic" ? "#1a1a0a" : "#bbb", fontStyle: "italic", cursor: "pointer", fontSize: 13 }}>I</button>
                  </div>
                  <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                    {FONT_FAMILIES.map(ff => (
                      <button key={ff.v} onClick={() => u("subtextFontFamily", ff.v)}
                        style={{ flex: 1, padding: "3px 4px", fontSize: 10, background: (scene.subtextFontFamily||"sans") === ff.v ? "#1a1500" : "#111", border: `1px solid ${(scene.subtextFontFamily||"sans") === ff.v ? "#fce499" : "#2a2a2a"}`, borderRadius: 4, color: (scene.subtextFontFamily||"sans") === ff.v ? "#fce499" : "#555", cursor: "pointer" }}>{ff.label}</button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 58px", gap: 8, marginBottom: 2 }}>
                    <F label="Farbe"><ColorInput value={scene.subtextColor||"#555555"} onChange={v => u("subtextColor", v)} /></F>
                    <F label="Größe px"><input style={iStyle} type="number" value={scene.subtextSize||"12"} onChange={e => u("subtextSize", e.target.value)} /></F>
                  </div>
                  <TextEffectsEditor
                    strokeWidth={scene.subtextStrokeWidth} strokeColor={scene.subtextStrokeColor}
                    shadowOpacity={scene.subtextShadowOpacity} shadowColor={scene.subtextShadowColor}
                    shadowX={scene.subtextShadowX} shadowY={scene.subtextShadowY}
                    onChange={d => textFxUpdate("subtext", d)}
                  />
                </>
              ) : (
                <div style={{ fontSize: 11, color: "#555", padding: "2px 0 4px" }}>Erst oben Subtext eingeben.</div>
              )}
            </div>
          )}
        </div>
        <div style={{ ...animBox, opacity: scene.subtext ? 1 : 0.3 }}>
          {scene.subtext
            ? <SceneAnimCol inKey="subtextAnimation" outKey="subtextExitAnimation" scene={scene} onChange={onChange} />
            : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><Icon name="minus" size={14} style={{ color: "#444" }} /></div>
          }
        </div>
      </div>

      {/* ── Hintergrund block ── */}
      <div style={blockBox}>
        {blockHdr("photo", "Hintergrund", openBg, () => setOpenBg(o => !o))}
        <div style={{ padding: "6px 10px", borderBottom: openBg ? "1px solid #1a1a1a" : "none", display: "flex", gap: 4 }}>
          {[["solid","Vollfarbe"],["gradient","Verlauf"],["image","Bild"]].map(([val, lbl]) => (
            <button key={val} onClick={() => u("bgType", val)}
              style={{ flex: 1, padding: "4px 5px", background: scene.bgType === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.bgType === val ? "#1a1a0a" : "#aaa", cursor: "pointer", fontSize: 11, fontWeight: scene.bgType === val ? 700 : 400 }}>{lbl}</button>
          ))}
        </div>
        {openBg && (
          <div style={{ padding: "8px 10px 10px" }}>
            {scene.bgType === "image" ? (
              <>
                <F label="Hintergrundbild"><ImageUpload value={scene.bgImage||""} onChange={v => u("bgImage", v)} /></F>
                <ImageFitControls scene={scene} onChange={onChange} />
                <div style={{ padding: "4px 7px", background: "#1a1500", border: "1px solid #3a2800", borderRadius: 5, fontSize: 10, color: "#888", marginTop: 8 }}>
                  <Icon name="alert-triangle" size={11} style={{ color: "#fce499", marginRight: 4 }} />Outlook: kein Hintergrundbild
                </div>
              </>
            ) : (
              <>
                <F label={scene.bgType === "gradient" ? "Farbe 1" : "Hintergrundfarbe"}>
                  <ColorInput value={scene.color1} onChange={v => u("color1", v)} />
                </F>
                {scene.bgType === "gradient" && (
                  <>
                    <F label="Farbe 2"><ColorInput value={scene.color2||"#f08030"} onChange={v => u("color2", v)} /></F>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      {[["horizontal","↔ Hor."],["vertical","↕ Ver."],["diagonal","↘ Diag."],["radial","◎ Radial"]].map(([val,lbl]) => (
                        <button key={val} onClick={() => u("gradientDir", val)}
                          style={{ flex: 1, padding: "4px", background: scene.gradientDir === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: scene.gradientDir === val ? "#1a1a0a" : "#aaa", cursor: "pointer", fontSize: 10 }}>{lbl}</button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <BgEffectsEditor
              overlayColor={scene.bgOverlayColor} overlayOpacity={scene.bgOverlayOpacity}
              borderWidth={scene.borderWidth} borderColor={scene.borderColor}
              onChange={bgFxUpdate}
            />
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a1a1a" }}>
              <PatternEditor scene={scene} onChange={onChange} />
            </div>
          </div>
        )}
      </div>

      {/* ── Anzeigedauer ── */}
      <div style={{ padding: "7px 10px 8px", background: "#111", borderRadius: 8, border: "1px solid #1e1e1e" }}>
        <label style={{ display: "block", fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
          Anzeigedauer: {(scene.holdMs/1000).toFixed(1)}s
        </label>
        <input type="range" min={300} max={8000} step={100} value={scene.holdMs}
          onChange={e => u("holdMs", parseInt(e.target.value))}
          style={{ width: "100%", accentColor: "#c4b5fd" }} />
      </div>

      {/* ── Mini-Vorschau ── */}
      <div style={{ position: "relative", ...bgStyle, borderRadius: 6, padding: "10px 14px", minHeight: 48, display: "flex", alignItems: "center", justifyContent: justifyMap[scene.textAlign]||"flex-start", overflow: "hidden" }}>
        {parseInt(scene.bgOverlayOpacity||0) > 0 && (
          <div style={{ position: "absolute", inset: 0, background: scene.bgOverlayColor||"#000", opacity: parseInt(scene.bgOverlayOpacity)/100 }} />
        )}
        {parseInt(scene.borderWidth||0) > 0 && (
          <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 0 ${scene.borderWidth}px ${scene.borderColor||"#fff"}`, borderRadius: 6 }} />
        )}
        <div style={{ position: "relative", zIndex: 1, textAlign: scene.textAlign }}>
          <p style={{ margin: 0, color: scene.textColor, fontSize: parseInt(scene.fontSize||16) * 0.65, fontWeight: scene.fontWeight, fontStyle: scene.fontStyle||"normal", fontFamily: "Arial, sans-serif", lineHeight: 1.3 }}
            dangerouslySetInnerHTML={{ __html: scene.textIsHtml ? scene.text : (scene.text || "…") }} />
          {scene.subtext && <p style={{ margin: "3px 0 0", color: scene.subtextColor, fontSize: parseInt(scene.subtextSize||12) * 0.65, fontStyle: scene.subtextFontStyle||"normal", fontFamily: "Arial, sans-serif" }}
            dangerouslySetInnerHTML={{ __html: scene.subtextIsHtml ? scene.subtext : scene.subtext }} />}
        </div>
      </div>
    </div>
  );
}

// ─── Scene Editor ─────────────────────────────────────────────────────────────
function SceneEditor({ scenes, onChange, globalProps, onGlobalChange }) {
  const [selectedId,  setSelectedId]  = useState(scenes[0]?.id || null);
  const [dragSceneId, setDragSceneId] = useState(null);
  const [dragOverId,  setDragOverId]  = useState(null);
  const selectedScene = scenes.find(s => s.id === selectedId);
  const totalMs = scenes.reduce((sum, s) => sum + s.holdMs + s.transitionOutMs, 0);

  function addScene() {
    const last = scenes[scenes.length - 1] || {};
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
  function copyScene(id) {
    const src = scenes.find(s => s.id === id);
    if (!src) return;
    const { id: _id, ...rest } = src;
    const copy = { ...rest, id: `s${Date.now()}` };
    const idx = scenes.findIndex(s => s.id === id);
    const next = [...scenes.slice(0, idx + 1), copy, ...scenes.slice(idx + 1)];
    onChange(next);
    setSelectedId(copy.id);
  }
  function updateScene(id, updated) { onChange(scenes.map(s => s.id === id ? updated : s)); }
  function updateTransition(id, patch) { onChange(scenes.map(s => s.id === id ? { ...s, ...patch } : s)); }

  function handleDragStart(e, id) { setDragSceneId(id); e.dataTransfer.effectAllowed = "move"; }
  function handleDragOver(e, id)  { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (id !== dragOverId) setDragOverId(id); }
  function handleDrop(targetId) {
    if (!dragSceneId || dragSceneId === targetId) { setDragOverId(null); setDragSceneId(null); return; }
    const arr = [...scenes];
    const from = arr.findIndex(s => s.id === dragSceneId);
    const to   = arr.findIndex(s => s.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
    setDragOverId(null); setDragSceneId(null);
  }
  function handleDragEnd() { setDragOverId(null); setDragSceneId(null); }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14, alignItems: "start" }}>

      {/* ── Left: editor + global ── */}
      <div>
        <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="adjustments" size={13} />
          {selectedScene ? `Szene ${scenes.findIndex(s => s.id === selectedId) + 1} bearbeiten` : "Szene auswählen →"}
        </div>
        {selectedScene && (
          <SceneItemEditor scene={selectedScene} onChange={updated => updateScene(selectedId, updated)} />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 10, background: "#111", borderRadius: 7, border: "1px solid #1e1e1e", marginTop: 8 }}>
          <F label="Höhe (px)"><input style={iStyle} type="number" value={globalProps.height} onChange={e => onGlobalChange("height", e.target.value)} /></F>
          <F label="Eckenradius (px)"><input style={iStyle} type="number" value={globalProps.borderRadius} onChange={e => onGlobalChange("borderRadius", e.target.value)} /></F>
          <F label="Innenabstand (px)"><input style={iStyle} type="number" value={globalProps.padding} onChange={e => onGlobalChange("padding", e.target.value)} /></F>
          <F label="Link-URL"><input style={iStyle} value={globalProps.linkUrl||""} onChange={e => onGlobalChange("linkUrl", e.target.value)} placeholder="https://…" /></F>
        </div>
      </div>

      {/* ── Right: scene list with D&D ── */}
      <div style={{ position: "sticky", top: 0, maxHeight: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <span>Szenen</span>
          <span style={{ color: "#666" }}>{(totalMs/1000).toFixed(1)}s</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {scenes.map((scene, i) => (
            <React.Fragment key={scene.id}>
              <SceneThumbnail
                scene={scene} index={i}
                selected={selectedId === scene.id}
                isDragOver={dragOverId === scene.id && dragSceneId !== scene.id}
                onClick={() => setSelectedId(scene.id)}
                onDelete={() => deleteScene(scene.id)}
                canDelete={scenes.length > 1}
                onCopy={() => copyScene(scene.id)}
                onDragStart={e => handleDragStart(e, scene.id)}
                onDragOver={e => handleDragOver(e, scene.id)}
                onDrop={() => handleDrop(scene.id)}
                onDragEnd={handleDragEnd}
              />
              <TransitionConnector
                scene={scene}
                onChange={patch => updateTransition(scene.id, patch)}
                isLast={i === scenes.length - 1}
              />
            </React.Fragment>
          ))}
          <button onClick={addScene}
            style={{ width: "100%", padding: "7px", borderRadius: 7, border: "1px dashed #2a2a2a", background: "transparent", color: "#777", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 2 }}>
            <Icon name="plus" size={13} />Szene hinzufügen
          </button>
        </div>
      </div>

    </div>
  );
}

function hexToRgba(hex, opacity) {
  const m = (hex || "#000000").replace("#", "").match(/.{2}/g);
  if (!m) return `rgba(0,0,0,${opacity/100})`;
  return `rgba(${parseInt(m[0],16)},${parseInt(m[1],16)},${parseInt(m[2],16)},${opacity/100})`;
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

  // Build background style with radial gradient and pattern support
  let bgStyle;
  if (p.bgType === "image" && p.bgImage) {
    bgStyle = applyPatternToImageCss(bgImageCss(p), p);
  } else if (p.bgType === "gradient") {
    const grad = p.gradientDir === "radial"
      ? `radial-gradient(circle, ${p.color1}, ${p.color2})`
      : `linear-gradient(${cssDirMap[p.gradientDir] || "to right"}, ${p.color1}, ${p.color2})`;
    const patBg = makePatternBg(p);
    bgStyle = patBg
      ? { backgroundImage: `${patBg}, ${grad}` }
      : { backgroundImage: grad };
  } else {
    const patBg = makePatternBg(p);
    bgStyle = patBg
      ? { backgroundColor: p.color1, backgroundImage: patBg }
      : { background: p.color1 };
  }

  const href    = p.linkUrl ? buildUrl(p.linkUrl, p) : null;
  const pad     = parseInt(p.padding) || 16;
  const h       = parseInt(p.height)  || 80;
  const r       = parseInt(p.borderRadius) || 0;
  const bw      = parseInt(p.borderWidth)  || 0;
  const justify = { center: "center", right: "flex-end", left: "flex-start" }[p.textAlign] || "flex-start";
  const overlayOp = parseInt(p.bgOverlayOpacity || 0);

  function textStyle(color, size, weight, strokeW, strokeC, shadowOp, shadowC, shadowX, shadowY) {
    const stroke = parseInt(strokeW || 0) > 0
      ? { WebkitTextStroke: `${strokeW}px ${strokeC || "#000"}` } : {};
    const shadow = parseInt(shadowOp || 0) > 0
      ? { textShadow: `${shadowX || 2}px ${shadowY || 2}px 3px ${hexToRgba(shadowC || "#000", parseInt(shadowOp))}` } : {};
    return { margin: 0, color, fontSize: `${size}px`, fontWeight: weight, fontFamily: "Arial, sans-serif", lineHeight: 1.4, ...stroke, ...shadow };
  }

  const borderStyle = bw > 0 ? { boxShadow: `inset 0 0 0 ${bw}px ${p.borderColor || "#fff"}` } : {};

  const content = (
    <div style={{ position: "relative", zIndex: 1, textAlign: p.textAlign }}>
      {p.textIsHtml
        ? <p style={textStyle(p.textColor, p.fontSize, p.fontWeight, p.textStrokeWidth, p.textStrokeColor, p.textShadowOpacity, p.textShadowColor, p.textShadowX, p.textShadowY)}
            dangerouslySetInnerHTML={{ __html: p.text }} />
        : <p style={textStyle(p.textColor, p.fontSize, p.fontWeight, p.textStrokeWidth, p.textStrokeColor, p.textShadowOpacity, p.textShadowColor, p.textShadowX, p.textShadowY)}>{p.text}</p>
      }
      {p.subtext && (p.subtextIsHtml
        ? <p style={{ ...textStyle(p.subtextColor, p.subtextSize, "normal", p.subtextStrokeWidth, p.subtextStrokeColor, p.subtextShadowOpacity, p.subtextShadowColor, p.subtextShadowX, p.subtextShadowY), marginTop: 6 }}
            dangerouslySetInnerHTML={{ __html: p.subtext }} />
        : <p style={{ ...textStyle(p.subtextColor, p.subtextSize, "normal", p.subtextStrokeWidth, p.subtextStrokeColor, p.subtextShadowOpacity, p.subtextShadowColor, p.subtextShadowX, p.subtextShadowY), marginTop: 6 }}>{p.subtext}</p>
      )}
    </div>
  );
  const wrapper = (
    <div style={{ position: "relative", ...bgStyle, ...borderStyle, padding: pad, borderRadius: r, minHeight: h, display: "flex", alignItems: "center", justifyContent: justify }}>
      {overlayOp > 0 && <div style={{ position: "absolute", inset: 0, background: p.bgOverlayColor || "#000", opacity: overlayOp / 100, borderRadius: r, pointerEvents: "none" }} />}
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
    <label style={{ display: "block", fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>{hint}</div>}
  </div>
);

// ─── Text Effects (Kontur + Schatten) — compact inline row ───────────────────
function TextEffectsEditor({ strokeWidth, strokeColor, shadowOpacity, shadowColor, shadowX, shadowY, onChange }) {
  const sw = parseInt(strokeWidth || 0);
  const sh = parseInt(shadowOpacity || 0);
  const cInput = (v, cb) => (
    <input type="color" value={v} onChange={e => cb(e.target.value)}
      style={{ width: 24, height: 24, padding: 1, border: "1px solid #2a2a2a", borderRadius: 3, cursor: "pointer", background: "#111", flexShrink: 0 }} />
  );
  const nInput = (v, cb, w = 44) => (
    <input style={{ ...iStyle, width: w, padding: "4px 6px" }} type="number"
      value={v} onChange={e => cb(e.target.value)} />
  );
  return (
    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: "#999", minWidth: 40, flexShrink: 0 }}>Kontur px</span>
        {nInput(strokeWidth || "0", v => onChange({ strokeWidth: v }), 44)}
        {sw > 0 && cInput(strokeColor || "#000000", v => onChange({ strokeColor: v }))}
        <span style={{ fontSize: 9, color: "#999", marginLeft: "auto", flexShrink: 0 }}>Schatten</span>
        <input type="range" min={0} max={100} value={sh}
          onChange={e => onChange({ shadowOpacity: e.target.value })}
          style={{ flex: 1, accentColor: "#c4b5fd", minWidth: 50 }} />
        <span style={{ fontSize: 9, color: "#777", minWidth: 22, flexShrink: 0 }}>{sh}%</span>
      </div>
      {sh > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {cInput(shadowColor || "#000000", v => onChange({ shadowColor: v }))}
          <span style={{ fontSize: 9, color: "#999" }}>X</span>
          {nInput(shadowX ?? "2", v => onChange({ shadowX: v }), 40)}
          <span style={{ fontSize: 9, color: "#999" }}>Y</span>
          {nInput(shadowY ?? "2", v => onChange({ shadowY: v }), 40)}
        </div>
      )}
    </div>
  );
}

// ─── BG Effects (Overlay + Rahmen) — compact inline rows ─────────────────────
function BgEffectsEditor({ overlayColor, overlayOpacity, borderWidth, borderColor, onChange }) {
  const ov = parseInt(overlayOpacity || 0);
  const bw = parseInt(borderWidth || 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: "#999", minWidth: 40, flexShrink: 0 }}>Overlay</span>
        <input type="range" min={0} max={80} value={ov}
          onChange={e => onChange({ overlayOpacity: e.target.value })}
          style={{ flex: 1, accentColor: "#c4b5fd", minWidth: 50 }} />
        <span style={{ fontSize: 9, color: "#777", minWidth: 22, flexShrink: 0 }}>{ov}%</span>
        {ov > 0 && (
          <input type="color" value={overlayColor || "#000000"} onChange={e => onChange({ overlayColor: e.target.value })}
            style={{ width: 24, height: 24, padding: 1, border: "1px solid #2a2a2a", borderRadius: 3, cursor: "pointer", background: "#111", flexShrink: 0 }} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: "#999", minWidth: 40, flexShrink: 0 }}>Rahmen</span>
        <input style={{ ...iStyle, width: 48, padding: "4px 6px" }} type="number" min="0" max="20"
          value={borderWidth || "0"} onChange={e => onChange({ borderWidth: e.target.value })} />
        <span style={{ fontSize: 9, color: "#777" }}>px</span>
        {bw > 0 && (
          <input type="color" value={borderColor || "#ffffff"} onChange={e => onChange({ borderColor: e.target.value })}
            style={{ width: 24, height: 24, padding: 1, border: "1px solid #2a2a2a", borderRadius: 3, cursor: "pointer", background: "#111", flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}

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
  const FONT_FAMILIES = [{ v: "sans", label: "Sans" }, { v: "serif", label: "Serif" }, { v: "mono", label: "Mono" }];

  return (
    <div>
      <F label="Haupttext">
        {p.textIsHtml ? (
          <RichTextEditor
            value={p.text || ""}
            onChange={v => u("text", v)}
            placeholder="z.B. Jetzt Termin buchen!"
            textColor={p.textColor}
            fontSize={parseInt(p.fontSize || 16)}
            fontWeight={p.fontWeight}
            fontStyle={p.fontStyle}
            fontFamily={p.fontFamily}
          />
        ) : (
          <input style={iStyle} value={p.text} onChange={e => u("text", e.target.value)} placeholder="z.B. Jetzt Termin buchen!" />
        )}
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label="Schriftgröße (px)"><input style={iStyle} type="number" value={p.fontSize} onChange={e => u("fontSize", e.target.value)} /></F>
        <F label="Ausrichtung">
          <select style={iStyle} value={p.textAlign} onChange={e => u("textAlign", e.target.value)}>
            {["left","center","right"].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <button onClick={() => u("fontWeight", p.fontWeight === "bold" ? "normal" : "bold")}
          style={{ padding: "5px 10px", background: p.fontWeight === "bold" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.fontWeight === "bold" ? "#1a1a0a" : "#888", fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>B</button>
        <button onClick={() => u("fontStyle", p.fontStyle === "italic" ? "normal" : "italic")}
          style={{ padding: "5px 10px", background: p.fontStyle === "italic" ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.fontStyle === "italic" ? "#1a1a0a" : "#888", fontStyle: "italic", cursor: "pointer", fontSize: 13 }}>I</button>
        <div style={{ display: "flex", gap: 1, border: "1px solid #2a2a2a", borderRadius: 4, overflow: "hidden" }}>
          <button onClick={() => u("textIsHtml", false)}
            style={{ padding: "4px 8px", fontSize: 10, background: !p.textIsHtml ? "#fce49933" : "transparent", border: "none", color: !p.textIsHtml ? "#fce499" : "#555", cursor: "pointer" }}>T</button>
          <button onClick={() => u("textIsHtml", true)}
            style={{ padding: "4px 8px", fontSize: 10, background: p.textIsHtml ? "#c4b5fd33" : "transparent", border: "none", color: p.textIsHtml ? "#c4b5fd" : "#555", cursor: "pointer" }}>✦</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {FONT_FAMILIES.map(ff => (
          <button key={ff.v} onClick={() => u("fontFamily", ff.v)}
            style={{ flex: 1, padding: "3px 4px", fontSize: 10, background: (p.fontFamily||"sans") === ff.v ? "#1a1500" : "#111", border: `1px solid ${(p.fontFamily||"sans") === ff.v ? "#fce499" : "#2a2a2a"}`, borderRadius: 4, color: (p.fontFamily||"sans") === ff.v ? "#fce499" : "#555", cursor: "pointer" }}>{ff.label}</button>
        ))}
      </div>
      <F label="Textfarbe"><ColorInput value={p.textColor} onChange={v => u("textColor", v)} /></F>
      <TextEffectsEditor
        strokeWidth={p.textStrokeWidth} strokeColor={p.textStrokeColor}
        shadowOpacity={p.textShadowOpacity} shadowColor={p.textShadowColor}
        shadowX={p.textShadowX} shadowY={p.textShadowY}
        onChange={d => onChange({ ...p,
          ...(d.strokeWidth  !== undefined && { textStrokeWidth:  d.strokeWidth }),
          ...(d.strokeColor  !== undefined && { textStrokeColor:  d.strokeColor }),
          ...(d.shadowOpacity !== undefined && { textShadowOpacity: d.shadowOpacity }),
          ...(d.shadowColor  !== undefined && { textShadowColor:  d.shadowColor }),
          ...(d.shadowX      !== undefined && { textShadowX:      d.shadowX }),
          ...(d.shadowY      !== undefined && { textShadowY:      d.shadowY }),
        })}
      />
      <F label="Subtext (optional)" style={{ marginTop: 10 }}>
        <input style={iStyle} value={p.subtext} onChange={e => u("subtext", e.target.value)} placeholder="Zusatzzeile..." />
      </F>
      {p.subtext && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label="Subtext-Farbe"><ColorInput value={p.subtextColor} onChange={v => u("subtextColor", v)} /></F>
            <F label="Subtext-Größe (px)"><input style={iStyle} type="number" value={p.subtextSize} onChange={e => u("subtextSize", e.target.value)} /></F>
          </div>
          <TextEffectsEditor
            strokeWidth={p.subtextStrokeWidth} strokeColor={p.subtextStrokeColor}
            shadowOpacity={p.subtextShadowOpacity} shadowColor={p.subtextShadowColor}
            shadowX={p.subtextShadowX} shadowY={p.subtextShadowY}
            onChange={d => onChange({ ...p,
              ...(d.strokeWidth !== undefined && { subtextStrokeWidth: d.strokeWidth }),
              ...(d.strokeColor  !== undefined && { subtextStrokeColor: d.strokeColor }),
              ...(d.shadowOpacity !== undefined && { subtextShadowOpacity: d.shadowOpacity }),
              ...(d.shadowColor  !== undefined && { subtextShadowColor: d.shadowColor }),
              ...(d.shadowX      !== undefined && { subtextShadowX: d.shadowX }),
              ...(d.shadowY      !== undefined && { subtextShadowY: d.shadowY }),
            })}
          />
        </>
      )}

      <F label="Link-URL (optional)">
        <input style={iStyle} value={p.linkUrl} onChange={e => u("linkUrl", e.target.value)} placeholder="https://..." />
      </F>
      {p.linkUrl && <UTMEditor p={p} onChange={onChange} />}

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e", marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7 }}>Hintergrund</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {[["solid","Vollfarbe"],["gradient","Verlauf"],["image","Bild"]].map(([val, lbl]) => (
            <button key={val} onClick={() => u("bgType", val)}
              style={{ flex: 1, padding: "5px 8px", background: p.bgType === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.bgType === val ? "#1a1a0a" : "#888", cursor: "pointer", fontSize: 12, fontWeight: p.bgType === val ? 700 : 400 }}>{lbl}</button>
          ))}
        </div>
        {p.bgType === "image" ? (
          <>
            <F label="Hintergrundbild">
              <ImageUpload value={p.bgImage||""} onChange={v => u("bgImage", v)} />
            </F>
            <ImageFitControls scene={p} onChange={onChange} />
            <div style={{ padding: "5px 8px", background: "#1a1500", border: "1px solid #3a2800", borderRadius: 5, fontSize: 10, color: "#888", marginBottom: 6, marginTop: 8 }}>
              <Icon name="alert-triangle" size={11} style={{ color: "#fce499", marginRight: 4 }} />
              Outlook unterstützt keine Hintergrundbilder in Tabellen
            </div>
          </>
        ) : (
          <>
            <F label={p.bgType === "gradient" ? "Farbe 1" : "Hintergrundfarbe"}>
              <ColorInput value={p.color1} onChange={v => u("color1", v)} />
            </F>
            {p.bgType === "gradient" && (
              <>
                <F label="Farbe 2"><ColorInput value={p.color2} onChange={v => u("color2", v)} /></F>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Richtung</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["horizontal","↔ Horizontal"],["vertical","↕ Vertikal"],["diagonal","↘ Diagonal"],["radial","◎ Radial"]].map(([val, lbl]) => (
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
          </>
        )}
        <BgEffectsEditor
          overlayColor={p.bgOverlayColor} overlayOpacity={p.bgOverlayOpacity}
          borderWidth={p.borderWidth} borderColor={p.borderColor}
          onChange={d => onChange({ ...p,
            ...(d.overlayColor  !== undefined && { bgOverlayColor: d.overlayColor }),
            ...(d.overlayOpacity !== undefined && { bgOverlayOpacity: d.overlayOpacity }),
            ...(d.borderWidth   !== undefined && { borderWidth: d.borderWidth }),
            ...(d.borderColor   !== undefined && { borderColor: d.borderColor }),
          })}
        />
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1a1a1a" }}>
          <PatternEditor scene={p} onChange={onChange} />
        </div>
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

  // Scene mode: props.scenes array present and length >= 1
  const isSceneMode = Array.isArray(props.scenes) && props.scenes.length >= 1;

  function enableSceneMode() {
    const firstScene = DEFAULT_SCENE({
      text: props.text, subtext: props.subtext,
      textColor: props.textColor, subtextColor: props.subtextColor,
      fontSize: props.fontSize, subtextSize: props.subtextSize,
      fontWeight: props.fontWeight, textAlign: props.textAlign,
      bgType: props.bgType, color1: props.color1, color2: props.color2, gradientDir: props.gradientDir,
      bgImage: props.bgImage || "",
      bgImageFit: props.bgImageFit || "cover", bgImageX: props.bgImageX || "50", bgImageY: props.bgImageY || "50", bgImageRepeat: props.bgImageRepeat || "no-repeat",
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

      {/* GIF status — in scene mode constrained to left column */}
      {gifReady && (
        isSceneMode ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 14, marginTop: 12 }}>
            <div style={{ padding: "8px 12px", background: "#0a1f14", border: "1px solid #064e3b", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="circle-check" size={14} style={{ color: "#6ee7b7" }} />
              <span style={{ fontSize: 12, color: "#6ee7b7" }}>GIF bereit — {Math.round(props.gif_data.length * 0.75 / 1024)} KB</span>
              <button onClick={() => setProps(p => ({ ...p, gif_data: "" }))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 11 }}>× entfernen</button>
              <div style={{ background: "#111", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                <img src={`data:image/gif;base64,${props.gif_data}`} alt="Vorschau" style={{ display: "block", maxHeight: 80, width: "auto" }} />
              </div>
            </div>
            <div />
          </div>
        ) : (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "#0a1f14", border: "1px solid #064e3b", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="circle-check" size={14} style={{ color: "#6ee7b7" }} />
            <span style={{ fontSize: 12, color: "#6ee7b7" }}>GIF bereit — {Math.round(props.gif_data.length * 0.75 / 1024)} KB</span>
            <button onClick={() => setProps(p => ({ ...p, gif_data: "" }))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 11 }}>× entfernen</button>
          </div>
        )
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

      {!editing && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {banners.map(b => {
            let p = DEFAULT_PROPS;
            try { p = { ...DEFAULT_PROPS, ...JSON.parse(b.props_json) }; } catch {}

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
                style={{ background: "#161616", border: `2px solid ${dragOver === b.id ? "#fce499" : "#222"}`, borderRadius: 10, overflow: "hidden", cursor: "grab", opacity: dragId === b.id ? 0.4 : 1, transition: "border-color .1s" }}>
                <div style={{ pointerEvents: "none" }}>
                  <BannerPreview p={previewProps} />
                </div>
                <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #222" }}>
                  <Icon name="ad" size={12} style={{ color: "#555" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#ddd", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{b.name}</span>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button style={{ ...btnSecondary, padding: "4px 8px", fontSize: 11 }} onClick={() => setEditing(b)}>
                      <Icon name="edit" size={12} />Bearbeiten
                    </button>
                    <button style={{ ...btnDanger, padding: "4px 8px" }} onClick={() => del(b.id)}><Icon name="trash" size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
