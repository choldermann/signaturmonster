import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8001";

async function api(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: t.type === "ok" ? "#1a3a2a" : "#3a1a1a",
          color: t.type === "ok" ? "#6ee7b7" : "#fca5a5",
          border: `1px solid ${t.type === "ok" ? "#064e3b" : "#7f1d1d"}`,
          display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn .2s ease",
        }}>
          <Icon name={t.type === "ok" ? "circle-check" : "circle-x"} size={16} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const items = [
    { id: "smtp",       icon: "server",        label: "SMTP" },
    { id: "signatures", icon: "signature",     label: "Signaturen" },
    { id: "rules",      icon: "filter",        label: "Regeln" },
    { id: "test",       icon: "send",          label: "Test" },
  ];
  return (
    <nav style={{
      width: 220, minHeight: "100vh", background: "#111", borderRight: "1px solid #222",
      display: "flex", flexDirection: "column", padding: "0 0 24px",
    }}>
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#fce499", fontWeight: 700 }}>Signatur</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Monster</div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>v0.1 · self-hosted</div>
      </div>
      <div style={{ padding: "16px 12px", flex: 1 }}>
        {items.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              marginBottom: 2, textAlign: "left", fontSize: 13, fontWeight: 500,
              background: page === item.id ? "#1e1e1e" : "transparent",
              color: page === item.id ? "#fce499" : "#888",
              transition: "all .15s",
            }}>
            <Icon name={item.icon} size={16} style={{ color: page === item.id ? "#fce499" : "#555" }} />
            {item.label}
            {page === item.id && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#fce499" }} />}
          </button>
        ))}
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #222" }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Datenquelle</div>
          <div style={{ fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="database" size={12} style={{ color: "#444" }} />
            Lexware Office
          </div>
          <div style={{ fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <Icon name="database" size={12} style={{ color: "#444" }} />
            JTL-Wawi
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnPrimary = {
  padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none",
  borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex",
  alignItems: "center", gap: 7,
};

const btnSecondary = {
  padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a",
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex",
  alignItems: "center", gap: 7,
};

const btnDanger = {
  padding: "7px 12px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a",
  borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
};

function Card({ title, icon, children, action }) {
  return (
    <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, marginBottom: 20 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {icon && <Icon name={icon} size={16} style={{ color: "#fce499" }} />}
          <span style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ─── SMTP Page ────────────────────────────────────────────────────────────────
function SMTPPage({ toast }) {
  const [cfg, setCfg] = useState({ relay_host: "", relay_port: 587, relay_user: "", relay_pass: "", from_address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    api("GET", "/api/settings/smtp").then(d => { setCfg(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await api("POST", "/api/settings/smtp", cfg);
      toast(r.ok ? "ok" : "err", r.ok ? "SMTP-Einstellungen gespeichert" : r.error);
    } catch { toast("err", "Verbindung zum Backend fehlgeschlagen"); }
    setSaving(false);
  }

  const providers = [
    { label: "IONOS",   host: "smtp.ionos.de",    port: 587 },
    { label: "Strato",  host: "smtp.strato.de",   port: 587 },
    { label: "Gmail",   host: "smtp.gmail.com",   port: 587 },
    { label: "Mailcow", host: "mail.example.com", port: 587 },
  ];

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>SMTP-Konfiguration</h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Relay-Mailserver über den Signaturmonster ausgehende Mails weiterleitet.</p>
      </div>

      <Card title="Schnellauswahl" icon="bolt">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {providers.map(p => (
            <button key={p.label} onClick={() => setCfg(c => ({ ...c, relay_host: p.host, relay_port: p.port }))}
              style={{ ...btnSecondary, fontSize: 12, padding: "6px 14px" }}>
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Relay-Server" icon="server">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
          <Field label="SMTP Host">
            <input style={inputStyle} value={cfg.relay_host} onChange={e => setCfg(c => ({ ...c, relay_host: e.target.value }))} placeholder="smtp.ionos.de" />
          </Field>
          <Field label="Port">
            <input style={inputStyle} type="number" value={cfg.relay_port} onChange={e => setCfg(c => ({ ...c, relay_port: parseInt(e.target.value) }))} />
          </Field>
        </div>
        <Field label="Benutzername">
          <input style={inputStyle} value={cfg.relay_user} onChange={e => setCfg(c => ({ ...c, relay_user: e.target.value }))} placeholder="deine@mail.de" />
        </Field>
        <Field label="Passwort">
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingRight: 40 }} type={showPass ? "text" : "password"} value={cfg.relay_pass} onChange={e => setCfg(c => ({ ...c, relay_pass: e.target.value }))} placeholder="••••••••" />
            <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <Icon name={showPass ? "eye-off" : "eye"} size={15} />
            </button>
          </div>
        </Field>
        <Field label="Absender-Adresse" hint="Falls leer: Benutzername wird verwendet">
          <input style={inputStyle} value={cfg.from_address} onChange={e => setCfg(c => ({ ...c, from_address: e.target.value }))} placeholder="info@firma.de" />
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={btnPrimary} onClick={save} disabled={saving}>
            <Icon name="device-floppy" size={15} />
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </Card>

      <Card title="Verbindungsstatus" icon="wifi">
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#888" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.relay_host ? "#fce499" : "#333" }} />
          {cfg.relay_host ? `Konfiguriert: ${cfg.relay_host}:${cfg.relay_port}` : "Noch nicht konfiguriert — bitte oben speichern"}
        </div>
        {cfg.relay_host && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#555", background: "#111", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace" }}>
            <span style={{ color: "#444" }}>relay → </span>
            <span style={{ color: "#6ee7b7" }}>{cfg.relay_user}</span>
            <span style={{ color: "#444" }}>@</span>
            <span style={{ color: "#93c5fd" }}>{cfg.relay_host}</span>
            <span style={{ color: "#444" }}>:{cfg.relay_port}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Signatures Page ──────────────────────────────────────────────────────────
function SignaturesPage({ toast }) {
  const [sigs, setSigs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", html_content: "", text_content: "", is_default: false });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("html");

  const load = useCallback(async () => {
    const d = await api("GET", "/api/signatures/");
    setSigs(d); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setEditing("new");
    setForm({ name: "", html_content: "<p>Mit freundlichen Grüßen<br><strong>Vorname Nachname</strong><br>Firma GmbH<br>Tel: +49 ...</p>", text_content: "Mit freundlichen Grüßen\nVorname Nachname\nFirma GmbH", is_default: false });
  }

  function startEdit(sig) {
    setEditing(sig.id);
    setForm({ name: sig.name, html_content: sig.html_content, text_content: sig.text_content, is_default: sig.is_default });
  }

  async function save() {
    try {
      if (editing === "new") {
        await api("POST", "/api/signatures/", form);
        toast("ok", "Signatur erstellt");
      } else {
        await api("PUT", `/api/signatures/${editing}`, form);
        toast("ok", "Signatur gespeichert");
      }
      setEditing(null);
      load();
    } catch { toast("err", "Fehler beim Speichern"); }
  }

  async function del(id) {
    await api("DELETE", `/api/signatures/${id}`);
    toast("ok", "Signatur gelöscht");
    load();
  }

  const vars = ["{{anrede}}", "{{nachname}}", "{{firma}}", "{{angebotsnummer}}", "{{datum}}", "{{gesamtpreis}}"];

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  if (editing !== null) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setEditing(null)} style={{ ...btnSecondary, padding: "7px 12px" }}>
          <Icon name="arrow-left" size={15} /> Zurück
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
          {editing === "new" ? "Neue Signatur" : "Signatur bearbeiten"}
        </h1>
      </div>

      <Card title="Details" icon="signature">
        <Field label="Name">
          <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Standard Signatur" />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer", marginBottom: 18 }}>
          <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
          Als Standard-Signatur verwenden
        </label>
      </Card>

      <Card title="Inhalt" icon="code"
        action={
          <div style={{ display: "flex", gap: 4 }}>
            {["html", "text", "preview"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px", background: tab === t ? "#fce499" : "#222", color: tab === t ? "#1a1a0a" : "#666" }}>
                {t}
              </button>
            ))}
          </div>
        }>
        {tab === "html" && <textarea style={{ ...inputStyle, minHeight: 180, fontFamily: "monospace", fontSize: 12 }} value={form.html_content} onChange={e => setForm(f => ({ ...f, html_content: e.target.value }))} />}
        {tab === "text" && <textarea style={{ ...inputStyle, minHeight: 180, fontFamily: "monospace", fontSize: 12 }} value={form.text_content} onChange={e => setForm(f => ({ ...f, text_content: e.target.value }))} />}
        {tab === "preview" && (
          <div style={{ background: "#fff", borderRadius: 8, padding: 16, minHeight: 120 }}
            dangerouslySetInnerHTML={{ __html: form.html_content }} />
        )}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Verfügbare Variablen</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {vars.map(v => (
              <code key={v} onClick={() => setForm(f => ({ ...f, html_content: f.html_content + v }))}
                style={{ fontSize: 11, background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 5, padding: "3px 8px", color: "#fce499", cursor: "pointer", fontFamily: "monospace" }}
                title="Klick zum Einfügen">{v}</code>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={btnPrimary} onClick={save}><Icon name="device-floppy" size={15} />Speichern</button>
        <button style={btnSecondary} onClick={() => setEditing(null)}>Abbrechen</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Signaturen</h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>{sigs.length} Signatur{sigs.length !== 1 ? "en" : ""} angelegt</p>
        </div>
        <button style={btnPrimary} onClick={startNew}><Icon name="plus" size={15} />Neue Signatur</button>
      </div>

      {sigs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
          <Icon name="signature" size={40} style={{ display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Signaturen — erstelle deine erste!</div>
        </div>
      ) : sigs.map(sig => (
        <div key={sig.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="signature" size={17} style={{ color: "#fce499" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 8 }}>
              {sig.name}
              {sig.is_default && <span style={{ fontSize: 10, background: "#2a2a00", color: "#fce499", padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>STANDARD</span>}
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 3, fontFamily: "monospace" }}>
              {sig.html_content?.substring(0, 60)}…
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btnSecondary, padding: "7px 12px", fontSize: 12 }} onClick={() => startEdit(sig)}>
              <Icon name="edit" size={14} /> Bearbeiten
            </button>
            <button style={btnDanger} onClick={() => del(sig.id)}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Rules Page ───────────────────────────────────────────────────────────────
function RulesPage({ toast }) {
  const [rules, setRules] = useState([]);
  const [sigs, setSigs] = useState([]);
  const [form, setForm] = useState({ name: "", match_sender: "", match_domain: "", apply_on_new: true, apply_on_reply: false, signature_id: "", enrichment_source: "", priority: 100, is_active: true });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([api("GET", "/api/rules/"), api("GET", "/api/signatures/")]);
    setRules(r); setSigs(s); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    try {
      await api("POST", "/api/rules/", { ...form, match_sender: form.match_sender || null, match_domain: form.match_domain || null, enrichment_source: form.enrichment_source || null, signature_id: parseInt(form.signature_id) });
      toast("ok", "Regel erstellt"); setShowForm(false); load();
    } catch { toast("err", "Fehler beim Speichern"); }
  }

  async function del(id) {
    await api("DELETE", `/api/rules/${id}`);
    toast("ok", "Regel gelöscht"); load();
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Regeln</h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Wer bekommt welche Signatur — und wann.</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowForm(s => !s)}>
          <Icon name={showForm ? "x" : "plus"} size={15} />{showForm ? "Abbrechen" : "Neue Regel"}
        </button>
      </div>

      {showForm && (
        <Card title="Neue Regel" icon="filter">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Holdermann Domain" /></Field>
            <Field label="Priorität" hint="Niedriger = höhere Priorität"><input style={inputStyle} type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} /></Field>
            <Field label="Absender (exakt)" hint="z.B. max@firma.de"><input style={inputStyle} value={form.match_sender} onChange={e => setForm(f => ({ ...f, match_sender: e.target.value }))} placeholder="leer = alle" /></Field>
            <Field label="Domain" hint="z.B. firma.de"><input style={inputStyle} value={form.match_domain} onChange={e => setForm(f => ({ ...f, match_domain: e.target.value }))} placeholder="leer = alle" /></Field>
            <Field label="Signatur">
              <select style={{ ...inputStyle }} value={form.signature_id} onChange={e => setForm(f => ({ ...f, signature_id: e.target.value }))}>
                <option value="">— Signatur wählen —</option>
                {sigs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Enrichment-Quelle" hint="Optional: Lexware / JTL-Wawi">
              <select style={{ ...inputStyle }} value={form.enrichment_source} onChange={e => setForm(f => ({ ...f, enrichment_source: e.target.value }))}>
                <option value="">— Keine —</option>
                <option value="lexware">Lexware Office</option>
                <option value="jtl">JTL-Wawi</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#888", cursor: "pointer" }}>
              <input type="checkbox" checked={form.apply_on_new} onChange={e => setForm(f => ({ ...f, apply_on_new: e.target.checked }))} />
              Neue Mails
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#888", cursor: "pointer" }}>
              <input type="checkbox" checked={form.apply_on_reply} onChange={e => setForm(f => ({ ...f, apply_on_reply: e.target.checked }))} />
              Antworten / Weiterleitungen
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#888", cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Aktiv
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <button style={btnPrimary} onClick={save}><Icon name="device-floppy" size={15} />Regel speichern</button>
          </div>
        </Card>
      )}

      {rules.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
          <Icon name="filter" size={40} style={{ display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Regeln — erstelle deine erste!</div>
        </div>
      ) : rules.map((rule, idx) => {
        const sig = sigs.find(s => s.id === rule.signature_id);
        return (
          <div key={rule.id} style={{ background: "#161616", border: `1px solid ${rule.is_active ? "#222" : "#1a1a1a"}`, borderRadius: 12, padding: "14px 20px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, opacity: rule.is_active ? 1 : 0.5 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#555" }}>{rule.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 8 }}>
                {rule.name}
                {!rule.is_active && <span style={{ fontSize: 10, color: "#555" }}>INAKTIV</span>}
                {rule.enrichment_source && <span style={{ fontSize: 10, background: "#1a2a1a", color: "#6ee7b7", padding: "2px 7px", borderRadius: 5 }}>{rule.enrichment_source.toUpperCase()}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 3, display: "flex", gap: 12 }}>
                <span>{rule.match_sender ? `@${rule.match_sender}` : rule.match_domain ? `*@${rule.match_domain}` : "Alle Absender"}</span>
                <span style={{ color: "#333" }}>→</span>
                <span style={{ color: "#aaa" }}>{sig?.name || "—"}</span>
                <span style={{ color: "#444" }}>{[rule.apply_on_new && "Neu", rule.apply_on_reply && "Antwort"].filter(Boolean).join(" + ")}</span>
              </div>
            </div>
            <button style={btnDanger} onClick={() => del(rule.id)}><Icon name="trash" size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Test Page ────────────────────────────────────────────────────────────────
function TestPage({ toast }) {
  const [toAddr, setToAddr] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [matchTest, setMatchTest] = useState({ sender: "", is_reply: false });
  const [matchResult, setMatchResult] = useState(null);

  async function sendTest() {
    if (!toAddr) return;
    setSending(true); setResult(null);
    try {
      const r = await api("POST", "/api/settings/smtp/test", { to_address: toAddr });
      setResult(r);
      toast(r.ok ? "ok" : "err", r.ok ? "Testmail gesendet!" : r.error);
    } catch (e) { setResult({ ok: false, error: String(e) }); }
    setSending(false);
  }

  async function testMatch() {
    if (!matchTest.sender) return;
    const domain = matchTest.sender.includes("@") ? matchTest.sender.split("@")[1] : "";
    const r = await api("POST", "/api/rules/match", { sender: matchTest.sender, domain, is_reply: matchTest.is_reply });
    setMatchResult(r);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Verbindungstest</h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>SMTP-Verbindung prüfen und Regel-Matching testen.</p>
      </div>

      <Card title="Testmail senden" icon="send">
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Sendet eine Testmail über den konfigurierten SMTP-Relay um die Verbindung zu prüfen.</p>
        <Field label="Empfänger-Adresse">
          <input style={inputStyle} type="email" value={toAddr} onChange={e => setToAddr(e.target.value)} placeholder="test@example.com" />
        </Field>
        <button style={btnPrimary} onClick={sendTest} disabled={sending || !toAddr}>
          <Icon name={sending ? "loader" : "send"} size={15} />
          {sending ? "Sende..." : "Testmail senden"}
        </button>
        {result && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: result.ok ? "#0a1f14" : "#1f0a0a", border: `1px solid ${result.ok ? "#064e3b" : "#7f1d1d"}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: result.ok ? "#6ee7b7" : "#fca5a5", display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name={result.ok ? "circle-check" : "circle-x"} size={16} />
              {result.ok ? result.message : "Fehler"}
            </div>
            {!result.ok && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6, fontFamily: "monospace" }}>{result.error}</div>}
          </div>
        )}
      </Card>

      <Card title="Regel-Matching testen" icon="filter">
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Prüfe welche Signatur für einen bestimmten Absender angewendet würde.</p>
        <Field label="Absender">
          <input style={inputStyle} value={matchTest.sender} onChange={e => setMatchTest(m => ({ ...m, sender: e.target.value }))} placeholder="max@holdermann.de" />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer", marginBottom: 16 }}>
          <input type="checkbox" checked={matchTest.is_reply} onChange={e => setMatchTest(m => ({ ...m, is_reply: e.target.checked }))} />
          Als Antwort / Weiterleitung behandeln
        </label>
        <button style={btnPrimary} onClick={testMatch} disabled={!matchTest.sender}>
          <Icon name="search" size={15} /> Regel prüfen
        </button>
        {matchResult !== null && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: matchResult ? "#0a1a2a" : "#1a1a1a", border: `1px solid ${matchResult ? "#1e3a5f" : "#2a2a2a"}` }}>
            {matchResult ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#93c5fd", display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="circle-check" size={16} /> Treffer: Regel #{matchResult.rule_id}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                  <span style={{ color: "#888" }}>Signatur: </span>
                  <span style={{ color: "#fce499" }}>{matchResult.signature?.name}</span>
                  {matchResult.enrichment_source && <span style={{ marginLeft: 10, color: "#6ee7b7" }}>+ {matchResult.enrichment_source}</span>}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="circle-x" size={16} /> Kein Treffer — keine passende Regel gefunden
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Proxy-Status" icon="activity">
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Backend API", port: "8001", url: "/health" },
            { label: "SMTP Proxy", port: "2587", url: null },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.6px" }}>{s.label}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 5, fontFamily: "monospace" }}>:{s.port}</div>
              {s.url && (
                <button onClick={async () => { try { const r = await fetch("http://localhost:"+s.port+s.url); const d = await r.json(); alert(JSON.stringify(d)); } catch(e) { alert("Nicht erreichbar: "+e); }}}
                  style={{ ...btnSecondary, padding: "4px 10px", fontSize: 11, marginTop: 8 }}>
                  Ping
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("smtp");
  const [toasts, setToasts] = useState([]);

  function toast(type, msg) {
    const id = Date.now();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  const pages = { smtp: SMTPPage, signatures: SignaturesPage, rules: RulesPage, test: TestPage };
  const Page = pages[page];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d0d0d", color: "#ccc" }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        * { box-sizing: border-box; }
        input, select, textarea { transition: border-color .15s; }
        input:focus, select:focus, textarea:focus { border-color: #fce499 !important; outline: none; }
        button:hover { opacity: .85; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
      `}</style>
      <Nav page={page} setPage={setPage} />
      <main style={{ flex: 1, padding: "36px 40px", maxWidth: 780, overflowY: "auto" }}>
        <Page toast={toast} />
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}
