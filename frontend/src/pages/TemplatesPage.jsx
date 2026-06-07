import React, { useState, useEffect, useCallback, useRef } from "react";
import { OFFER_TEMPLATES } from "../data/offerTemplates.js";

const API = "";
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const BLOCK_TYPES = [
  { type: "header",   label: "Header",      icon: "ti-layout-navbar",   dynamic: false },
  { type: "intro",    label: "Anschreiben", icon: "ti-writing",         dynamic: false },
  { type: "position", label: "Position",    icon: "ti-package",         dynamic: true  },
  { type: "sum",      label: "Gesamtpreis", icon: "ti-receipt",         dynamic: false },
  { type: "notice",   label: "Hinweis",     icon: "ti-info-circle",     dynamic: false },
  { type: "cta",      label: "Button/CTA",  icon: "ti-cursor-text",     dynamic: false },
  { type: "footer",   label: "Footer",      icon: "ti-layout-bottombar",dynamic: false },
  { type: "divider",  label: "Trennlinie",  icon: "ti-minus",           dynamic: false },
];

const DP = {
  header:   { companyName: "Holdermann IT", tagline: "IT-Support · Softwareentwicklung · Datenkonvertierung", accentColor: "#fce499", bgColor: "#242424", logoUrl: "https://holdermann.me/Angebote/thumbs-up.png" },
  intro:    { text: "Hallo {{anrede}} {{nachname}},\n\ngerne unterbreite ich Ihnen folgendes Angebot:", bgColor: "#242424", textColor: "#cfcfcf" },
  position: { showImage: true, showArticleNumber: true, showDescription: true, accentColor: "#fce499", bgColor: "#1b1b1b", borderColor: "#333333" },
  sum:      { label: "Gesamtpreis zzgl. MwSt.:", accentColor: "#fce499", bgColor: "#121212", borderColor: "#fce499" },
  notice:   { text: "Hinweis: Die gesetzliche Mehrwertsteuer wird im Rechnungsfall gesondert ausgewiesen. Zahlungsbedingungen: Vorkasse", textColor: "#9d9d9d", bgColor: "#242424" },
  cta:      { label: "Ich freue mich auf Ihre Rückmeldung", accentColor: "#fce499", bgColor: "#242424", mailSubject: "Angebot {{angebotsnummer}}" },
  footer:   { name: "Christof Holdermann", company: "Holdermann IT", email: "info@holdermann.me", phone: "+49 (0)7841 8329775", web: "https://holdermann.me", accentColor: "#fce499", bgColor: "#1a1a1a", borderColor: "#333333", logoUrl: "https://holdermann.me/Angebote/thumbs-up.png" },
  divider:  { color: "#333333", margin: "8" },
};

const SAMPLE = {
  anrede: "Frau", nachname: "Stahlberger", firma: "Hausverwaltung Stahlberger",
  strasse: "Bernsteinstr. 11", ort: "76461 Muggensturm",
  angebotsnummer: "ANG-2026-001", datum: "26.05.2026", gueltig_bis: "30.06.2026", gesamtpreis: "1.576,00 €",
  positions: [
    { artikelnummer: "100669388", name: "APPLE iPad Pro 11\" M5 Wi-Fi 512GB", description: "Tandem-OLED, ProMotion, M5-Chip.", preis: "1.199,00 €", bildUrl: "{https://holdermann.me/Angebote/c7b874812d9451da491baa9c51a09bc9.webp}" },
    { artikelnummer: "100515903", name: "Apple Pencil Pro – Weiß", description: "Magnetisch befestigen, kabellos laden.", preis: "149,00 €", bildUrl: "{https://holdermann.me/Angebote/d6d3c6baa9a82acb831b96d55df016e8.webp}" },
    { artikelnummer: "100499439", name: "Apple Netzteil 70W USB-C", description: "Schnelles Laden für alle Apple-Geräte.", preis: "79,00 €", bildUrl: "" },
  ]
};

function rv(tpl, d) { return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => d[k] || `{{${k}}}`); }
function imgUrl(v) { if (!v) return ""; const m = v.match(/\{(https?:\/\/[^}]+)\}/); return m ? m[1] : ""; }

// ─── Block Preview ────────────────────────────────────────────────────────────
function BlockPreview({ block }) {
  const p = block.props; const s = SAMPLE;
  const wrap = (content) => (
    <div style={{ background: p.bgColor || "#242424", padding: "16px 28px" }}>{content}</div>
  );

  if (block.type === "header") return (
    <div style={{ background: p.bgColor, padding: "24px 28px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "1.6px", textTransform: "uppercase", color: p.accentColor, fontWeight: "bold" }}>{p.companyName}</div>
          <div style={{ fontSize: 20, color: p.accentColor, fontWeight: "bold", marginTop: 4 }}>Ihr individuelles Angebot</div>
          <div style={{ fontSize: 11, color: "#bcbcbc", marginTop: 4 }}>{p.tagline}</div>
        </div>
        {p.logoUrl && <img src={p.logoUrl} width="50" style={{ borderRadius: 6 }} alt="" />}
      </div>
      <div style={{ marginTop: 12, background: "#1b1b1b", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bcbcbc", lineHeight: "19px" }}>
        <div><span style={{ color: p.accentColor, fontWeight: "bold" }}>Angebotsnummer: </span>{s.angebotsnummer}<br /><span style={{ color: p.accentColor, fontWeight: "bold" }}>Datum: </span>{s.datum}</div>
        <div style={{ textAlign: "right" }}><span style={{ color: p.accentColor, fontWeight: "bold" }}>Kunde:</span><br />{s.firma}</div>
      </div>
    </div>
  );

  if (block.type === "intro") return wrap(
    <div style={{ fontSize: 12, color: p.textColor, lineHeight: "20px", whiteSpace: "pre-line" }}>{rv(p.text, s)}</div>
  );

  if (block.type === "position") return (
    <div style={{ background: p.bgColor, padding: "0 28px" }}>
      {s.positions.slice(0, 2).map((pos, i) => {
        const iu = imgUrl(pos.bildUrl);
        return (
          <div key={i} style={{ background: "#1b1b1b", border: `1px solid ${p.borderColor}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              {p.showArticleNumber && <div style={{ fontSize: 9, textTransform: "uppercase", color: "#8f8f8f", letterSpacing: "1px" }}>Art.-Nr.: {pos.artikelnummer}</div>}
              <div style={{ fontSize: 13, color: p.accentColor, fontWeight: "bold", marginTop: 3 }}>{pos.name}</div>
              {p.showDescription && <div style={{ fontSize: 11, color: "#c9c9c9", marginTop: 4 }}>{pos.description}</div>}
              <div style={{ fontSize: 14, color: "#fff", fontWeight: "bold", marginTop: 6 }}>{pos.preis}</div>
            </div>
            {p.showImage && iu && <img src={iu} width="70" height="52" style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }} alt="" />}
          </div>
        );
      })}
      {s.positions.length > 2 && <div style={{ fontSize: 10, color: "#555", padding: "4px 0 8px" }}>+{s.positions.length - 2} weitere Position(en)...</div>}
    </div>
  );

  if (block.type === "sum") return (
    <div style={{ background: p.bgColor, padding: "12px 28px" }}>
      <div style={{ background: p.bgColor, border: `1px solid ${p.borderColor}`, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: p.accentColor, fontWeight: "bold", fontSize: 13 }}>{p.label}</span>
        <span style={{ color: p.accentColor, fontWeight: "bold", fontSize: 18 }}>{s.gesamtpreis}</span>
      </div>
    </div>
  );

  if (block.type === "notice") return (
    <div style={{ background: p.bgColor, padding: "6px 28px", fontSize: 10, color: p.textColor, lineHeight: "16px" }}>{p.text}</div>
  );

  if (block.type === "cta") return (
    <div style={{ background: p.bgColor, padding: "14px 28px", textAlign: "center" }}>
      <span style={{ display: "inline-block", background: p.accentColor, color: "#242424", fontWeight: "bold", fontSize: 12, padding: "9px 18px", borderRadius: 999 }}>{p.label}</span>
    </div>
  );

  if (block.type === "footer") return (
    <div style={{ background: p.bgColor, borderTop: `1px solid ${p.borderColor}`, padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ fontSize: 10, color: "#9d9d9d", lineHeight: "17px" }}>
        <strong style={{ color: p.accentColor }}>{p.name}</strong><br />{p.company}<br />
        <a href={`mailto:${p.email}`} style={{ color: p.accentColor, textDecoration: "none" }}>{p.email}</a><br />{p.phone}
      </div>
      {p.logoUrl && <img src={p.logoUrl} width="44" alt="" />}
    </div>
  );

  if (block.type === "divider") return (
    <div style={{ background: "#242424", padding: `${p.margin}px 28px` }}>
      <div style={{ borderTop: `1px solid ${p.color}` }} />
    </div>
  );

  return null;
}

// ─── Prop Editor ──────────────────────────────────────────────────────────────
function PropEditor({ block, onChange }) {
  const p = block.props;
  const upd = (key, val) => onChange({ ...p, [key]: val });

  const F = ({ label, k, type = "text", opts }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={p[k]} rows={3} onChange={e => upd(k, e.target.value)}
          style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ddd", fontSize: 11, padding: "6px 8px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
      ) : type === "color" ? (
        <div style={{ display: "flex", gap: 5 }}>
          <input type="color" value={p[k]} onChange={e => upd(k, e.target.value)} style={{ width: 30, height: 26, padding: 2, border: "1px solid #2a2a2a", borderRadius: 4, cursor: "pointer", background: "#111" }} />
          <input type="text" value={p[k]} onChange={e => upd(k, e.target.value)} style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ddd", fontSize: 11, padding: "4px 8px" }} />
        </div>
      ) : type === "check" ? (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", cursor: "pointer" }}>
          <input type="checkbox" checked={p[k]} onChange={e => upd(k, e.target.checked)} />
          {opts}
        </label>
      ) : (
        <input type={type} value={p[k]} onChange={e => upd(k, e.target.value)}
          style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ddd", fontSize: 11, padding: "5px 8px", boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <div style={{ fontSize: 12 }}>
      {block.type === "header"   && <>{F({label:"Firmenname",k:"companyName"})}{F({label:"Tagline",k:"tagline"})}{F({label:"Akzentfarbe",k:"accentColor",type:"color"})}{F({label:"Hintergrund",k:"bgColor",type:"color"})}{F({label:"Logo-URL",k:"logoUrl"})}</>}
      {block.type === "intro"    && <>{F({label:"Text",k:"text",type:"textarea"})}{F({label:"Textfarbe",k:"textColor",type:"color"})}{F({label:"Hintergrund",k:"bgColor",type:"color"})}</>}
      {block.type === "position" && <>{F({label:"Akzentfarbe",k:"accentColor",type:"color"})}{F({label:"Hintergrund",k:"bgColor",type:"color"})}{F({label:"Rahmenfarbe",k:"borderColor",type:"color"})}{F({label:"",k:"showImage",type:"check",opts:"Produktbild"})}{F({label:"",k:"showArticleNumber",type:"check",opts:"Artikelnummer"})}{F({label:"",k:"showDescription",type:"check",opts:"Beschreibung"})}<div style={{marginTop:6,padding:"6px 8px",background:"#111",borderRadius:6,fontSize:10,color:"#555",lineHeight:"16px"}}>Bilder via <code style={{color:"#fce499",fontSize:10}}>{"{https://url.de/bild.jpg}"}</code></div></>}
      {block.type === "sum"      && <>{F({label:"Label",k:"label"})}{F({label:"Akzentfarbe",k:"accentColor",type:"color"})}{F({label:"Rahmenfarbe",k:"borderColor",type:"color"})}</>}
      {block.type === "notice"   && <>{F({label:"Text",k:"text",type:"textarea"})}{F({label:"Textfarbe",k:"textColor",type:"color"})}</>}
      {block.type === "cta"      && <>{F({label:"Button-Text",k:"label"})}{F({label:"Akzentfarbe",k:"accentColor",type:"color"})}{F({label:"Mail-Betreff",k:"mailSubject"})}</>}
      {block.type === "footer"   && <>{F({label:"Name",k:"name"})}{F({label:"Firma",k:"company"})}{F({label:"E-Mail",k:"email"})}{F({label:"Telefon",k:"phone"})}{F({label:"Website",k:"web"})}{F({label:"Akzentfarbe",k:"accentColor",type:"color"})}{F({label:"Hintergrund",k:"bgColor",type:"color"})}{F({label:"Logo-URL",k:"logoUrl"})}</>}
      {block.type === "divider"  && <>{F({label:"Farbe",k:"color",type:"color"})}{F({label:"Abstand px",k:"margin",type:"number"})}</>}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────
let idCnt = 50;

function TemplateEditor({ template, onSave, onCancel, toast }) {
  const [name, setName] = useState(template?.name || "");
  const [desc, setDesc] = useState(template?.description || "");
  const [blocks, setBlocks] = useState(() => {
    if (template?.blocks_json) {
      try { return JSON.parse(template.blocks_json).map((b, i) => ({ ...b, id: i + 1 })); } catch {}
    }
    if (template?.preloadBlocks) {
      return template.preloadBlocks.map((b, i) => ({ ...b, id: i + 1 }));
    }
    return [
      { id: 1, type: "header",   props: { ...DP.header } },
      { id: 2, type: "intro",    props: { ...DP.intro } },
      { id: 3, type: "position", props: { ...DP.position } },
      { id: 4, type: "sum",      props: { ...DP.sum } },
      { id: 5, type: "notice",   props: { ...DP.notice } },
      { id: 6, type: "cta",      props: { ...DP.cta } },
      { id: 7, type: "footer",   props: { ...DP.footer } },
    ];
  });
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("editor");
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [paletteType, setPaletteType] = useState(null);

  const selBlock = blocks.find(b => b.id === selected);

  function addBlock(type) {
    const id = ++idCnt;
    setBlocks(prev => [...prev, { id, type, props: { ...DP[type] } }]);
    setSelected(id);
  }

  function removeBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selected === id) setSelected(null);
  }

  function moveUp(id) {
    setBlocks(prev => {
      const arr = [...prev]; const i = arr.findIndex(b => b.id === id);
      if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
      return arr;
    });
  }

  function moveDown(id) {
    setBlocks(prev => {
      const arr = [...prev]; const i = arr.findIndex(b => b.id === id);
      if (i < arr.length - 1) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
      return arr;
    });
  }

  function updateProps(id, newProps) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, props: newProps } : b));
  }

  async function loadPreview() {
    setTab("preview");
    // Build preview locally using same logic as renderer
    const rows = blocks.map(b => renderBlockToHTML(b)).join("");
    setPreview(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f0f0;padding:20px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" border="0" style="width:620px;max-width:620px;background:#242424;border-radius:16px;overflow:hidden;">
<tr><td style="height:5px;background:#fce499;font-size:0;">&nbsp;</td></tr>
${rows}
</table></td></tr></table>
</body></html>`);
  }

  function renderBlockToHTML(block) {
    const p = block.props; const s = SAMPLE;
    const rvLocal = (t) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => s[k] || `{{${k}}}`);
    const iuLocal = (v) => { if (!v) return ""; const m = v.match(/\{(https?:\/\/[^}]+)\}/); return m ? m[1] : ""; };

    if (block.type === "header") return `<tr><td style="padding:28px 32px 16px;background:${p.bgColor}"><div style="font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:${p.accentColor};font-weight:bold">${p.companyName}</div><div style="font-size:22px;color:${p.accentColor};font-weight:bold;margin-top:4px">Ihr individuelles Angebot</div><div style="font-size:12px;color:#bcbcbc;margin-top:6px">${p.tagline}</div><div style="margin-top:14px;background:#1b1b1b;border:1px solid #333;border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;font-size:12px;color:#bcbcbc"><div><strong style="color:${p.accentColor}">Angebotsnummer:</strong> ${s.angebotsnummer}<br><strong style="color:${p.accentColor}">Datum:</strong> ${s.datum}</div><div style="text-align:right"><strong style="color:${p.accentColor}">Kunde:</strong><br>${s.firma}</div></div></td></tr>`;
    if (block.type === "intro") return `<tr><td style="padding:14px 32px;background:${p.bgColor};font-size:13px;line-height:22px;color:${p.textColor}">${rvLocal(p.text).replace(/\n/g,"<br>")}</td></tr>`;
    if (block.type === "position") return s.positions.map(pos => { const iu = iuLocal(pos.bildUrl); return `<tr><td style="padding:10px 32px 0"><div style="background:${p.bgColor};border:1px solid ${p.borderColor};border-radius:12px;padding:14px;display:flex;gap:12px">${p.showImage && iu ? `<img src="${iu}" width="90" height="67" style="border-radius:8px;object-fit:cover;flex-shrink:0" alt="">` : ""}<div style="flex:1">${p.showArticleNumber ? `<div style="font-size:10px;text-transform:uppercase;color:#8f8f8f">Art.-Nr.: ${pos.artikelnummer}</div>` : ""}<div style="font-size:15px;color:${p.accentColor};font-weight:bold;margin-top:4px">${pos.name}</div>${p.showDescription ? `<div style="font-size:12px;color:#c9c9c9;margin-top:6px">${pos.description}</div>` : ""}<div style="font-size:18px;color:#fff;font-weight:bold;margin-top:8px">${pos.preis}</div></div></div></td></tr>`; }).join("");
    if (block.type === "sum") return `<tr><td style="padding:14px 32px 0"><div style="background:${p.bgColor};border:1px solid ${p.borderColor};border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between"><span style="color:${p.accentColor};font-weight:bold;font-size:14px">${p.label}</span><span style="color:${p.accentColor};font-weight:bold;font-size:20px">${s.gesamtpreis}</span></div></td></tr>`;
    if (block.type === "notice") return `<tr><td style="padding:8px 32px;font-size:11px;color:${p.textColor};background:${p.bgColor}">${p.text}</td></tr>`;
    if (block.type === "cta") return `<tr><td style="padding:16px 32px;text-align:center;background:${p.bgColor}"><span style="display:inline-block;background:${p.accentColor};color:#242424;font-weight:bold;font-size:13px;padding:10px 20px;border-radius:999px">${p.label}</span></td></tr>`;
    if (block.type === "footer") return `<tr><td style="padding:16px 32px;background:${p.bgColor};border-top:1px solid ${p.borderColor}"><div style="font-size:11px;color:#9d9d9d;line-height:18px"><strong style="color:${p.accentColor}">${p.name}</strong><br>${p.company}<br><a href="mailto:${p.email}" style="color:${p.accentColor};text-decoration:none">${p.email}</a><br>${p.phone}</div></td></tr>`;
    if (block.type === "divider") return `<tr><td style="padding:${p.margin}px 32px;background:#242424"><div style="border-top:1px solid ${p.color}"></div></td></tr>`;
    return "";
  }

  async function save() {
    if (!name.trim()) { toast("err", "Bitte einen Namen eingeben"); return; }
    setSaving(true);
    const blocksData = blocks.map(({ id, ...b }) => b);
    const payload = { name, description: desc, blocks_json: JSON.stringify(blocksData), is_default: false };
    try {
      if (template?.id) {
        await api("PUT", `/api/templates/${template.id}`, payload);
        toast("ok", "Template gespeichert");
      } else {
        await api("POST", "/api/templates/", payload);
        toast("ok", "Template erstellt");
      }
      onSave();
    } catch { toast("err", "Fehler beim Speichern"); }
    setSaving(false);
  }

  const inputStyle = { width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, padding: "8px 12px", boxSizing: "border-box", fontFamily: "inherit" };
  const btnTab = (t) => ({ padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", background: tab === t ? "#fce499" : "#222", color: tab === t ? "#1a1a0a" : "#666" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ padding: "7px 12px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, color: "#888", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> Zurück
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, flex: 1 }}>
          {template?.id ? "Template bearbeiten" : "Neues Template"}
        </h1>
        <div style={{ display: "flex", gap: 4 }}>
          {["editor", "preview"].map(t => <button key={t} style={btnTab(t)} onClick={t === "preview" ? loadPreview : () => setTab(t)}>{t === "editor" ? "Editor" : "Vorschau"}</button>)}
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding: "8px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />{saving ? "Speichern..." : "Speichern"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Angebot Standard" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Beschreibung</label>
          <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="optional" />
        </div>
      </div>

      {tab === "preview" && (
        <div style={{ border: "1px solid #222", borderRadius: 12, overflow: "hidden", background: "#f0f0f0" }}>
          <div style={{ background: "#1a1a1a", padding: "7px 14px", borderBottom: "1px solid #333", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f56" }} />
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#27c93f" }} />
            <span style={{ fontSize: 11, color: "#555", marginLeft: 6 }}>Vorschau mit Beispieldaten</span>
          </div>
          <iframe srcDoc={preview} style={{ width: "100%", height: 600, border: "none" }} title="Template-Vorschau" />
        </div>
      )}

      {tab === "editor" && (
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 210px", gap: 12 }}>
          {/* Palette */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Blöcke</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)}
                  draggable onDragStart={() => setPaletteType(bt.type)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", fontSize: 12, border: "1px solid #222", borderRadius: 7, background: "#161616", cursor: "grab", textAlign: "left", color: "#aaa", width: "100%" }}>
                  <i className={`ti ${bt.icon}`} style={{ fontSize: 13, color: bt.dynamic ? "#fce499" : "#555" }} />
                  <span>{bt.label}</span>
                  {bt.dynamic && <span style={{ marginLeft: "auto", fontSize: 9, background: "#2a2000", color: "#fce499", padding: "1px 5px", borderRadius: 4 }}>DYN</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#444", lineHeight: "15px" }}>Klick oder Drag & Drop</div>
          </div>

          {/* Canvas */}
          <div style={{ border: "1px solid #222", borderRadius: 10, overflow: "hidden", background: "#1a1a1a", minHeight: 400 }}
            onDragOver={e => { e.preventDefault(); if (paletteType) setDragOverId("canvas"); }}
            onDrop={e => { e.preventDefault(); if (paletteType) { addBlock(paletteType); setPaletteType(null); setDragOverId(null); } }}>
            {blocks.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#444", fontSize: 13 }}>Blöcke hinzufügen →</div>
            )}
            {blocks.map((block) => (
              <div key={block.id}
                draggable
                onDragStart={() => { setDraggingId(block.id); setPaletteType(null); }}
                onDragOver={e => { e.preventDefault(); if (draggingId && draggingId !== block.id) setDragOverId(block.id); }}
                onDrop={e => {
                  e.preventDefault();
                  if (draggingId && draggingId !== block.id) {
                    setBlocks(prev => {
                      const arr = [...prev];
                      const fi = arr.findIndex(b => b.id === draggingId);
                      const ti = arr.findIndex(b => b.id === block.id);
                      const [item] = arr.splice(fi, 1); arr.splice(ti, 0, item);
                      return arr;
                    });
                    setDraggingId(null); setDragOverId(null);
                  }
                }}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                onClick={() => setSelected(block.id)}
                style={{
                  position: "relative", cursor: "pointer",
                  outline: selected === block.id ? "2px solid #fce499" : dragOverId === block.id ? "2px dashed #fce49966" : "none",
                  outlineOffset: -2, opacity: draggingId === block.id ? 0.4 : 1,
                }}>
                <BlockPreview block={block} />
                {selected === block.id && (
                  <div style={{ position: "absolute", top: 5, right: 5, display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveUp(block.id)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "#333", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-arrow-up" /></button>
                    <button onClick={() => moveDown(block.id)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "#333", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-arrow-down" /></button>
                    <button onClick={() => removeBlock(block.id)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-trash" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Props Panel */}
          <div>
            {selBlock ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <i className={`ti ${BLOCK_TYPES.find(b => b.type === selBlock.type)?.icon}`} style={{ fontSize: 14, color: "#666" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>{BLOCK_TYPES.find(b => b.type === selBlock.type)?.label}</span>
                </div>
                <div style={{ padding: "12px", background: "#161616", borderRadius: 8, border: "1px solid #222" }}>
                  <PropEditor block={selBlock} onChange={np => updateProps(selBlock.id, np)} />
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px 10px", textAlign: "center", color: "#444", fontSize: 12 }}>
                <i className="ti ti-click" style={{ fontSize: 24, display: "block", marginBottom: 6 }} />
                Block auswählen
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: "8px 12px", background: "#161616", borderRadius: 8, display: "flex", gap: 14, fontSize: 11, color: "#555" }}>
        <span><i className="ti ti-layout-columns" style={{ marginRight: 3 }} />{blocks.length} Blöcke</span>
        <span><i className="ti ti-package" style={{ marginRight: 3 }} />{blocks.filter(b => b.type === "position").length}× Position (dynamisch)</span>
        <span><i className="ti ti-database" style={{ marginRight: 3 }} />Lexware · JTL-Wawi</span>
      </div>
    </div>
  );
}

// ─── Offer Template Picker ────────────────────────────────────────────────────
function OfferTemplatePicker({ onSelect, onBlank, onCancel }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel}
          style={{ padding: "7px 12px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, color: "#888", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> Zurück
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Template-Startvorlage wählen</h1>
          <p style={{ fontSize: 12, color: "#555", margin: "4px 0 0" }}>Wähle ein Farbschema oder starte mit einem leeren Template.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 12 }}>
        {OFFER_TEMPLATES.map(tpl => (
          <div key={tpl.id} onClick={() => onSelect(tpl)}
            style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "border-color .15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = tpl.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#222"}>
            <div style={{ height: 10, background: tpl.accent }} />
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {tpl.preview.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 28, borderRadius: 5, background: c, border: "1px solid #333" }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <i className={`ti ${tpl.icon}`} style={{ fontSize: 16, color: tpl.accent }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{tpl.name}</span>
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>{tpl.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onBlank}
        style={{ padding: "11px 20px", background: "transparent", border: "1px dashed #2a2a2a", borderRadius: 10, color: "#555", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-plus" style={{ fontSize: 15 }} /> Leeres Template (Standard-Blöcke)
      </button>
    </div>
  );
}

// ─── Templates List Page ──────────────────────────────────────────────────────
export default function TemplatesPage({ toast }) {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickingTemplate, setPickingTemplate] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("GET", "/api/templates/");
      setTemplates(d);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/templates/${id}`);
    toast("ok", "Template gelöscht");
    load();
  }

  if (pickingTemplate) return (
    <OfferTemplatePicker
      onSelect={tpl => { setPickingTemplate(false); setEditing({ preloadBlocks: tpl.blocks }); }}
      onBlank={() => { setPickingTemplate(false); setEditing("new"); }}
      onCancel={() => setPickingTemplate(false)}
    />
  );

  if (editing !== null) return (
    <TemplateEditor
      template={editing === "new" ? null : editing}
      onSave={() => { setEditing(null); load(); }}
      onCancel={() => setEditing(null)}
      toast={toast}
    />
  );

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Templates</h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Angebots- und Mail-Templates mit Drag & Drop gestalten.</p>
        </div>
        <button onClick={() => setPickingTemplate(true)}
          style={{ padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} />Neues Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
          <i className="ti ti-template" style={{ fontSize: 40, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Templates — erstelle dein erstes!</div>
          <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Templates ersetzen hässliche Standard-Mails durch professionelle HTML-Designs.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {templates.map(tmpl => (
            <div key={tmpl.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#242424", height: 80, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #1e1e1e" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: "1.6px", textTransform: "uppercase", color: "#fce499", fontWeight: "bold" }}>Holdermann IT</div>
                  <div style={{ fontSize: 14, color: "#fce499", fontWeight: "bold" }}>Ihr individuelles Angebot</div>
                  <div style={{ fontSize: 9, color: "#bcbcbc", marginTop: 2 }}>IT-Support · Softwareentwicklung</div>
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 8 }}>
                  {tmpl.name}
                  {tmpl.is_default && <span style={{ fontSize: 10, background: "#2a2a00", color: "#fce499", padding: "2px 7px", borderRadius: 5 }}>STANDARD</span>}
                </div>
                {tmpl.description && <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{tmpl.description}</div>}
                <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
                  {(() => { try { return JSON.parse(tmpl.blocks_json).length; } catch { return 0; } })()} Blöcke
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => setEditing(tmpl)}
                    style={{ flex: 1, padding: "7px 0", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 7, color: "#888", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <i className="ti ti-edit" style={{ fontSize: 13 }} />Bearbeiten
                  </button>
                  <button onClick={() => del(tmpl.id)}
                    style={{ padding: "7px 12px", background: "transparent", border: "1px solid #3a1a1a", borderRadius: 7, color: "#f87171", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
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
