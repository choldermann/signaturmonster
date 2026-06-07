import React, { useState, useEffect, useCallback, useRef } from "react";

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;

const btnPrimary   = { padding: "8px 16px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger    = { padding: "6px 11px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const inputStyle   = { width: "100%", padding: "8px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

// ─── Richtext Toolbar ─────────────────────────────────────────────────────────
const TOOLBAR = [
  { cmd: "bold",          icon: "bold",          title: "Fett (Strg+B)" },
  { cmd: "italic",        icon: "italic",        title: "Kursiv (Strg+I)" },
  { cmd: "underline",     icon: "underline",     title: "Unterstrichen (Strg+U)" },
  null,
  { cmd: "insertUnorderedList", icon: "list",     title: "Aufzählung" },
  { cmd: "insertOrderedList",   icon: "list-numbers", title: "Nummerierte Liste" },
  null,
  { cmd: "justifyLeft",   icon: "align-left",    title: "Linksbündig" },
  { cmd: "justifyCenter", icon: "align-center",  title: "Zentriert" },
  { cmd: "justifyRight",  icon: "align-right",   title: "Rechtsbündig" },
  null,
  { cmd: "createLink",    icon: "link",          title: "Link einfügen", prompt: true },
  { cmd: "unlink",        icon: "link-off",      title: "Link entfernen" },
];

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlSrc, setHtmlSrc]   = useState(value || "");
  const initialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = value || "";
      initialized.current = true;
    }
  }, []);

  function exec(cmd, prompt_) {
    editorRef.current?.focus();
    if (prompt_) {
      const url = window.prompt("URL eingeben:", "https://");
      if (url) document.execCommand(cmd, false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    onChange(editorRef.current?.innerHTML || "");
  }

  function onInput() {
    onChange(editorRef.current?.innerHTML || "");
  }

  function applyFontSize(size) {
    editorRef.current?.focus();
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll("font[size='7']").forEach(el => {
      el.removeAttribute("size");
      el.style.fontSize = size;
    });
    onChange(editorRef.current?.innerHTML || "");
  }

  function applyColor(color) {
    editorRef.current?.focus();
    document.execCommand("foreColor", false, color);
    onChange(editorRef.current?.innerHTML || "");
  }

  function toggleHtml() {
    if (!showHtml) {
      setHtmlSrc(editorRef.current?.innerHTML || "");
      setShowHtml(true);
    } else {
      if (editorRef.current) editorRef.current.innerHTML = htmlSrc;
      onChange(htmlSrc);
      setShowHtml(false);
    }
  }

  return (
    <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "6px 8px", background: "#111", borderBottom: "1px solid #222", alignItems: "center" }}>
        {TOOLBAR.map((item, i) =>
          item === null
            ? <div key={i} style={{ width: 1, height: 18, background: "#2a2a2a", margin: "0 3px" }} />
            : (
              <button key={item.cmd} title={item.title} onMouseDown={e => { e.preventDefault(); exec(item.cmd, item.prompt); }}
                style={{ width: 26, height: 26, border: "1px solid #2a2a2a", borderRadius: 4, background: "#1a1a1a", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={item.icon} size={13} />
              </button>
            )
        )}
        {/* Font size */}
        <select defaultValue="" onMouseDown={e => e.stopPropagation()} onChange={e => { if (e.target.value) { applyFontSize(e.target.value); e.target.value = ""; }}}
          style={{ height: 26, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: "#888", fontSize: 11, cursor: "pointer", padding: "0 4px" }}>
          <option value="">Größe</option>
          {["9px","10px","11px","12px","13px","14px","16px","18px","20px","24px"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* Color */}
        <input type="color" defaultValue="#888888" title="Textfarbe"
          onMouseDown={e => e.stopPropagation()} onChange={e => applyColor(e.target.value)}
          style={{ width: 26, height: 26, padding: 2, border: "1px solid #2a2a2a", borderRadius: 4, cursor: "pointer", background: "#1a1a1a", flexShrink: 0 }} />
        <div style={{ flex: 1 }} />
        <button onClick={toggleHtml} title="HTML-Quellcode anzeigen"
          style={{ height: 26, padding: "0 8px", border: "1px solid #2a2a2a", borderRadius: 4, background: showHtml ? "#fce499" : "#1a1a1a", color: showHtml ? "#1a1a0a" : "#888", cursor: "pointer", fontSize: 10, fontWeight: 600, fontFamily: "monospace" }}>
          &lt;/&gt;
        </button>
      </div>

      {showHtml ? (
        <textarea value={htmlSrc} onChange={e => setHtmlSrc(e.target.value)}
          style={{ width: "100%", minHeight: 180, background: "#0d0d0d", color: "#6ee7b7", border: "none", padding: "12px", fontFamily: "monospace", fontSize: 12, boxSizing: "border-box", resize: "vertical", outline: "none" }} />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          style={{
            minHeight: 180, padding: "12px 14px",
            background: "#0d0d0d", color: "#ccc",
            fontSize: 13, lineHeight: "1.6", outline: "none",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        />
      )}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────
function DisclaimerEditor({ initial, onSave, onCancel, toast }) {
  const [name, setName]         = useState(initial?.name || "");
  const [html, setHtml]         = useState(initial?.html_content || "");
  const [text, setText]         = useState(initial?.text_content || "");
  const [tab, setTab]           = useState("rich");
  const [saving, setSaving]     = useState(false);
  const isNew = !initial?.id;

  async function save() {
    if (!name.trim()) { toast("err", "Bitte einen Namen eingeben"); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), html_content: html, text_content: text };
      const r = isNew
        ? await api("POST", "/api/disclaimers/", payload)
        : await api("PUT",  `/api/disclaimers/${initial.id}`, payload);
      if (r.id) { toast("ok", isNew ? "Disclaimer erstellt" : "Disclaimer gespeichert"); onSave(); }
      else      { toast("err", r.detail || "Fehler"); }
    } catch { toast("err", "Verbindung fehlgeschlagen"); }
    setSaving(false);
  }

  const btnTab = (t) => ({
    padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 5,
    border: "none", cursor: "pointer",
    background: tab === t ? "#fce499" : "#1e1e1e",
    color: tab === t ? "#1a1a0a" : "#666",
  });

  return (
    <div style={{ background: "#161616", border: "1px solid #fce49944", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fce499", marginBottom: 18 }}>
        {isNew ? "Neuer Disclaimer" : `Bearbeiten: ${initial.name}`}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Name</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Rechtlicher Hinweis DE" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".8px" }}>Inhalt</label>
          <div style={{ display: "flex", gap: 3 }}>
            {[["rich","Rich Text"],["preview","Vorschau"],["text","Plaintext"]].map(([t, l]) =>
              <button key={t} style={btnTab(t)} onClick={() => setTab(t)}>{l}</button>
            )}
          </div>
        </div>

        {tab === "rich" && (
          <RichTextEditor value={html} onChange={setHtml} />
        )}

        {tab === "preview" && (
          <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", background: "#fff", minHeight: 80 }}
            dangerouslySetInnerHTML={{ __html: html || "<em style='color:#aaa'>Kein Inhalt</em>" }} />
        )}

        {tab === "text" && (
          <div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Wird in Plaintext-Mails verwendet (kein HTML)</div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              placeholder="Disclaimer als reiner Text..." />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <Icon name="device-floppy" />{saving ? "Speichern..." : "Speichern"}
        </button>
        <button style={btnSecondary} onClick={onCancel}>Abbrechen</button>
      </div>
    </div>
  );
}

// ─── List Page ────────────────────────────────────────────────────────────────
export default function DisclaimersPage({ toast }) {
  const [disclaimers, setDisclaimers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(null);

  const load = useCallback(async () => {
    try { const d = await api("GET", "/api/disclaimers/"); setDisclaimers(Array.isArray(d) ? d : []); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/disclaimers/${id}`);
    toast("ok", "Disclaimer gelöscht");
    load();
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Disclaimer</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Zentral verwaltete Rechtstexte — per Regel einer Signatur zuweisen.
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setEditing("new")}>
          <Icon name="plus" />Neuer Disclaimer
        </button>
      </div>

      <div style={{ padding: "12px 16px", background: "#1a1a1a", border: "1px solid #93c5fd22", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <Icon name="info-circle" size={15} style={{ color: "#93c5fd", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: "#555", lineHeight: "18px" }}>
          Füge in einer Signatur einen <strong style={{ color: "#888" }}>Disclaimer-Block</strong> ein. Der Inhalt wird beim Versand durch den hier verwalteten Text ersetzt — abhängig von der Regel. Kein Disclaimer-Block in der Signatur = kein Disclaimer im versendeten Mail.
        </div>
      </div>

      {editing === "new" && (
        <DisclaimerEditor initial={null} toast={toast} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}
      {editing && editing !== "new" && (
        <DisclaimerEditor initial={editing} toast={toast} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      )}

      {disclaimers.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="shield" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Disclaimer</div>
        </div>
      ) : disclaimers.map(d => (
        <div key={d.id} style={{ background: "#161616", border: `1px solid ${editing?.id === d.id ? "#fce49966" : "#222"}`, borderRadius: 10, padding: "13px 18px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="shield" size={15} style={{ color: "#fce499" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>{d.name}</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              dangerouslySetInnerHTML={{ __html: d.html_content?.replace(/<[^>]+>/g, " ").trim().substring(0, 120) || "—" }} />
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => setEditing(editing?.id === d.id ? null : d)}>
              <Icon name="edit" size={13} />Bearbeiten
            </button>
            <button style={btnDanger} onClick={() => del(d.id)}><Icon name="trash" size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
