import React, { useState, useEffect, useCallback, useRef } from "react";
import LoginPage from "./pages/LoginPage.jsx";

const API = "";

async function api(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

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

function Nav({ page, setPage, user, onLogout }) {
  const groups = [
    {
      label: "Konfiguration",
      items: [
        { id: "smtp",        icon: "server",     label: "SMTP-Konten" },
        { id: "smtp-users",  icon: "user-bolt",  label: "SMTP-Zugänge" },
        { id: "test",        icon: "send",       label: "Test" },
        { id: "admin-users", icon: "users",      label: "Benutzer" },
        { id: "license",     icon: "key",        label: "Lizenz" },
        { id: "update",      icon: "refresh",    label: "Update" },
        { id: "logs",        icon: "terminal-2", label: "System-Log" },
        { id: "maillog",     icon: "mail-search", label: "Audit-Log" },
      ]
    },
    {
      label: "Signaturen",
      items: [
        { id: "senders",     icon: "at",        label: "Mailadressen" },
        { id: "signatures",  icon: "signature", label: "Signaturen" },
        { id: "rules",       icon: "filter",    label: "Regeln" },
        { id: "disclaimers", icon: "shield",    label: "Disclaimer" },
        { id: "banners",     icon: "ad",        label: "Banner" },
      ]
    },
    {
      label: "Angebote & Templates",
      items: [
        { id: "templates", icon: "template",   label: "Templates" },
        { id: "trules",    icon: "git-branch", label: "Template-Regeln" },
      ]
    },
    {
      label: "Branding",
      items: [
        { id: "ci",        icon: "palette",    label: "CI-Profile" },
        { id: "images",    icon: "photo",      label: "Bildbibliothek" },
        { id: "campaigns", icon: "speakerphone", label: "Kampagnen" },
      ]
    },
  ];

  return (
    <nav style={{ width: 220, minHeight: "100vh", background: "#111", borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column", padding: "0 0 24px", flexShrink: 0 }}>
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#fce499", fontWeight: 700 }}>Signatur</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Monster</div>
        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>v0.7 · self-hosted</div>
      </div>
      <div style={{ padding: "12px 12px", flex: 1, overflowY: "auto" }}>
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "1px", padding: "0 8px", marginBottom: 4 }}>{group.label}</div>
            {group.items.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                  marginBottom: 1, textAlign: "left", fontSize: 13, fontWeight: 500,
                  background: page === item.id ? "#1e1e1e" : "transparent",
                  color: page === item.id ? "#fce499" : "#666",
                  transition: "all .15s",
                }}>
                <Icon name={item.icon} size={15} style={{ color: page === item.id ? "#fce499" : "#444" }} />
                {item.label}
                {page === item.id && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#fce499" }} />}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: "0 12px" }}>
        <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #1e1e1e", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>Datenquellen</div>
          <div style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <Icon name="database" size={11} style={{ color: "#333" }} /> Lexware Office
          </div>
          <div style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="database" size={11} style={{ color: "#333" }} /> JTL-Wawi
          </div>
        </div>
        {/* Benutzer + Logout */}
        <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#2a2a00", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="user" size={13} style={{ color: "#fce499" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "—"}</div>
            {user?.is_admin && <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.6px" }}>Admin</div>}
          </div>
          <button onClick={onLogout} title="Abmelden"
            style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 5, color: "#555", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <Icon name="logout" size={13} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnDanger = { padding: "7px 12px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

function Card({ title, icon, children, action }) {
  return (
    <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 12, marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {icon && <Icon name={icon} size={15} style={{ color: "#fce499" }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function InfoBanner({ icon, color, title, text }) {
  return (
    <div style={{ padding: "12px 16px", background: "#1a1a1a", border: `1px solid ${color}22`, borderRadius: 10, marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <Icon name={icon} size={16} style={{ color, marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{title}</div>
        <div style={{ fontSize: 12, color: "#555", marginTop: 3, lineHeight: "18px" }}>{text}</div>
      </div>
    </div>
  );
}

// ─── SMTP Accounts Loader ─────────────────────────────────────────────────────
function SMTPPage({ toast }) {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SMTPAccountsPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;
  return <Comp toast={toast} />;
}

// ─── Signatures Page ──────────────────────────────────────────────────────────
function SignaturesPage({ toast }) {
  const [sigs, setSigs] = useState([]);
  const [designer, setDesigner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [DesignerComp, setDesignerComp] = useState(null);
  const importRef = useRef(null);

  useEffect(() => {
    import("./pages/SignatureDesigner.jsx").then(m => setDesignerComp(() => m.default));
  }, []);

  const load = useCallback(async () => {
    const d = await api("GET", "/api/signatures/");
    setSigs(d); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/signatures/${id}`);
    toast("ok", "Signatur gelöscht");
    load();
  }

  function exportOne(sig) {
    const data = {
      type: "signaturmonster-signatures",
      version: 1,
      exported_at: new Date().toISOString(),
      signatures: [{ name: sig.name, html_content: sig.html_content, text_content: sig.text_content, is_default: sig.is_default, designer_json: sig.designer_json }],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signatur-${sig.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const data = JSON.parse(await file.text());
      if (data.type !== "signaturmonster-signatures" || !Array.isArray(data.signatures)) {
        toast("err", "Ungültiges Format"); return;
      }
      for (const s of data.signatures) {
        await api("POST", "/api/signatures/", {
          name: s.name, html_content: s.html_content || "",
          text_content: s.text_content || "", is_default: false,
          designer_json: s.designer_json || null,
        });
      }
      toast("ok", `${data.signatures.length} Signatur(en) importiert`);
      load();
    } catch { toast("err", "Import fehlgeschlagen"); }
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  if (designer !== null && DesignerComp) return (
    <DesignerComp
      signature={designer === "new" ? null : designer}
      onSave={() => { setDesigner(null); load(); }}
      onCancel={() => setDesigner(null)}
      toast={toast}
    />
  );

  if (designer !== null && !DesignerComp) return (
    <div style={{ color: "#555", padding: 40 }}>Designer lädt...</div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Signaturen</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Werden automatisch an ausgehende Mails angehängt.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary} onClick={() => setDesigner("new")}>
            <Icon name="wand" size={15} />Designer
          </button>
          <input type="file" accept=".json" ref={importRef} style={{ display: "none" }} onChange={handleImport} />
          <button style={btnSecondary} onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={15} />Import
          </button>
        </div>
      </div>
      <InfoBanner icon="wand" color="#6ee7b7" title="Signatur-Designer"
        text="Signaturen mit Drag & Drop gestalten — Text, Bilder, Links, Social-Icons und UTM-Tracking. Werden automatisch an jede ausgehende Mail angehängt." />
      {sigs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="signature" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Signaturen</div>
          <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Erstelle deine erste Signatur mit dem visuellen Designer.</div>
        </div>
      ) : sigs.map(sig => (
        <div key={sig.id} style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="signature" size={16} style={{ color: "#fce499" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 7 }}>
              {sig.name}
              {sig.is_default && <span style={{ fontSize: 10, background: "#2a2a00", color: "#fce499", padding: "2px 6px", borderRadius: 4 }}>STANDARD</span>}
              {sig.designer_json && <span style={{ fontSize: 10, background: "#1a2a1a", color: "#6ee7b7", padding: "2px 6px", borderRadius: 4 }}>DESIGNER</span>}
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 2, fontFamily: "monospace" }}>{sig.html_content?.substring(0, 60)}…</div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <button style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12 }} onClick={() => setDesigner(sig)}>
              <Icon name="wand" size={13} /> Designer
            </button>
            <button style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }} onClick={() => exportOne(sig)}>
              <Icon name="download" size={13} /> Export
            </button>
            <button style={btnDanger} onClick={() => del(sig.id)}><Icon name="trash" size={13} /></button>
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
  const EMPTY = { name: "", match_sender: "", match_domain: "", apply_on_new: true, apply_on_reply: false, signature_id: "", ci_config_id: "", smtp_account_id: "", disclaimer_id: "", priority: 100, is_active: true, recipient_scope: "all", match_recipient: "", match_recipient_domain: "", time_from: "", time_until: "", days_of_week: "" };
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [poweredBy, setPoweredBy] = useState(true);
  const [isFree, setIsFree] = useState(true);
  const [internalDomains, setInternalDomains] = useState("");
  const [internalDomainsSaved, setInternalDomainsSaved] = useState("");
  const [timezone, setTimezone] = useState("");
  const [timezoneSaved, setTimezoneSaved] = useState("");

  const [cis, setCIs] = useState([]);
  const [smtpAccounts, setSmtpAccounts]   = useState([]);
  const [disclaimers, setDisclaimers]     = useState([]);
  const load = useCallback(async () => {
    const [r, s, c, sa, dis, settings, lic] = await Promise.all([
      api("GET", "/api/rules/"), api("GET", "/api/signatures/"), api("GET", "/api/ci/"),
      api("GET", "/api/smtp-accounts/"), api("GET", "/api/disclaimers/"),
      api("GET", "/api/settings/"), api("GET", "/api/license/"),
    ]);
    setRules(r); setSigs(s); setCIs(c);
    setSmtpAccounts(Array.isArray(sa) ? sa : []);
    setDisclaimers(Array.isArray(dis) ? dis : []);
    setPoweredBy(settings?.powered_by_enabled !== "false");
    setIsFree((lic?.status ?? "free") === "free");
    const dom = settings?.internal_domains || "";
    setInternalDomains(dom);
    setInternalDomainsSaved(dom);
    const tz = settings?.timezone || "";
    setTimezone(tz);
    setTimezoneSaved(tz);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setEditingId("new"); }

  function openEdit(rule) {
    setForm({ name: rule.name, match_sender: rule.match_sender || "", match_domain: rule.match_domain || "", apply_on_new: rule.apply_on_new, apply_on_reply: rule.apply_on_reply, signature_id: rule.signature_id || "", ci_config_id: rule.ci_config_id || "", smtp_account_id: rule.smtp_account_id || "", disclaimer_id: rule.disclaimer_id || "", priority: rule.priority, is_active: rule.is_active, recipient_scope: rule.recipient_scope || "all", match_recipient: rule.match_recipient || "", match_recipient_domain: rule.match_recipient_domain || "", time_from: rule.time_from || "", time_until: rule.time_until || "", days_of_week: rule.days_of_week || "" });
    setEditingId(rule.id);
  }

  function closeForm() { setEditingId(null); setForm(EMPTY); }

  async function save() {
    const payload = { ...form, match_sender: form.match_sender || null, match_domain: form.match_domain || null, signature_id: parseInt(form.signature_id), ci_config_id: form.ci_config_id ? parseInt(form.ci_config_id) : null, smtp_account_id: form.smtp_account_id ? parseInt(form.smtp_account_id) : null, disclaimer_id: form.disclaimer_id ? parseInt(form.disclaimer_id) : null, enrichment_source: null, template_id: null, recipient_scope: form.recipient_scope || "all", match_recipient: form.match_recipient || null, match_recipient_domain: form.match_recipient_domain || null, time_from: form.time_from || null, time_until: form.time_until || null, days_of_week: form.days_of_week || null };
    try {
      if (editingId === "new") { await api("POST", "/api/rules/", payload); toast("ok", "Regel erstellt"); }
      else { await api("PUT", `/api/rules/${editingId}`, payload); toast("ok", "Regel gespeichert"); }
      closeForm(); load();
    } catch { toast("err", "Fehler beim Speichern"); }
  }

  async function del(id) { await api("DELETE", `/api/rules/${id}`); toast("ok", "Regel gelöscht"); load(); }

  async function togglePoweredBy() {
    if (isFree) { toast("err", "Nur mit Kauflizenz deaktivierbar"); return; }
    const newVal = poweredBy ? "false" : "true";
    const r = await api("PUT", "/api/settings/powered-by", { value: newVal });
    if (r.powered_by_enabled !== undefined) {
      setPoweredBy(r.powered_by_enabled !== "false");
      toast("ok", "Einstellung gespeichert");
    } else {
      toast("err", r.detail || "Fehler");
    }
  }

  async function saveInternalDomains() {
    await api("PUT", "/api/settings/internal_domains", { value: internalDomains });
    setInternalDomainsSaved(internalDomains);
    toast("ok", "Interne Domains gespeichert");
  }

  async function saveTimezone() {
    await api("PUT", "/api/settings/timezone", { value: timezone });
    setTimezoneSaved(timezone);
    toast("ok", "Zeitzone gespeichert");
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Signatur-Regeln</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Wer bekommt welche Signatur — und wann.</p>
        </div>
        <button style={btnPrimary} onClick={editingId ? closeForm : openNew}>
          <Icon name={editingId ? "x" : "plus"} size={15} />{editingId ? "Abbrechen" : "Neue Regel"}
        </button>
      </div>

      {/* ── Powered-by Branding ─────────────────────────────────── */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="badge" size={14} style={{ color: "#fce499" }} />
            Powered-by Branding
            {isFree && <span style={{ fontSize: 10, background: "#1a1400", color: "#fce499", border: "1px solid #78600a", padding: "1px 7px", borderRadius: 20 }}>Kostenlos</span>}
          </div>
          <div style={{ fontSize: 12, color: "#555", lineHeight: "17px" }}>
            Fügt einen kleinen <span style={{ fontFamily: "monospace", background: "#181818", padding: "1px 5px", borderRadius: 3 }}>
              <span style={{ color: "#fce499" }}>Signatur</span><span style={{ color: "#fff" }}>monster</span>
            </span>-Footer an jede verarbeitete Mail an.
            {isFree && <span style={{ color: "#666" }}> Mit Kauflizenz deaktivierbar.</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {isFree && <Icon name="lock" size={14} style={{ color: "#555" }} />}
          <button
            onClick={togglePoweredBy}
            disabled={isFree}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: isFree ? "not-allowed" : "pointer",
              background: poweredBy ? "#fce499" : "#2a2a2a", position: "relative", transition: "background .2s", flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: poweredBy ? 23 : 3, width: 18, height: 18,
              borderRadius: "50%", background: poweredBy ? "#1a1a0a" : "#555", transition: "left .2s",
            }} />
          </button>
          <span style={{ fontSize: 12, color: poweredBy ? "#fce499" : "#555", minWidth: 22 }}>{poweredBy ? "An" : "Aus"}</span>
        </div>
      </div>

      {/* ── Regelengine-Einstellungen ────────────────────────────── */}
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Icon name="settings" size={14} style={{ color: "#93c5fd" }} />
          Regelengine-Einstellungen
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 5 }}>Interne Domains <span style={{ color: "#333" }}>(kommagetrennt)</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1, fontSize: 12 }} value={internalDomains} onChange={e => setInternalDomains(e.target.value)} placeholder="firma.de, tochter-gmbh.de" />
              <button style={{ ...btnPrimary, padding: "6px 10px", opacity: internalDomains === internalDomainsSaved ? 0.5 : 1 }} disabled={internalDomains === internalDomainsSaved} onClick={saveInternalDomains}>
                <Icon name="device-floppy" size={13} />
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 5 }}>Zeitzone <span style={{ color: "#333" }}>(z.B. Europe/Berlin)</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1, fontSize: 12 }} value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Europe/Berlin" />
              <button style={{ ...btnPrimary, padding: "6px 10px", opacity: timezone === timezoneSaved ? 0.5 : 1 }} disabled={timezone === timezoneSaved} onClick={saveTimezone}>
                <Icon name="device-floppy" size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <InfoBanner icon="info-circle" color="#93c5fd" title="Signatur-Regeln"
        text="Diese Regeln steuern welche Signatur an reguläre Mails angehängt wird. Für Angebote mit Produktlisten bitte Template-Regeln verwenden." />
      {editingId !== null && (
        <Card title={editingId === "new" ? "Neue Regel" : "Regel bearbeiten"} icon="filter">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Holdermann Domain" /></Field>
            <Field label="Priorität" hint="Niedriger = höhere Priorität"><input style={inputStyle} type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} /></Field>
            <Field label="Absender" hint="leer = alle"><input style={inputStyle} value={form.match_sender} onChange={e => setForm(f => ({ ...f, match_sender: e.target.value }))} placeholder="z.B. max@firma.de" /></Field>
            <Field label="Domain" hint="leer = alle"><input style={inputStyle} value={form.match_domain} onChange={e => setForm(f => ({ ...f, match_domain: e.target.value }))} placeholder="z.B. firma.de" /></Field>
            <Field label="Signatur">
              <select style={inputStyle} value={form.signature_id} onChange={e => setForm(f => ({ ...f, signature_id: e.target.value }))}>
                <option value="">— Signatur wählen —</option>
                {sigs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
                        <Field label="CI-Profil (Mail Beautifier)" hint="Optional — bereinigt + branded den Mailtext">
              <select style={inputStyle} value={form.ci_config_id} onChange={e => setForm(f => ({ ...f, ci_config_id: e.target.value }))}>
                <option value="">— Nur Signatur (kein Branding) —</option>
                {cis.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="SMTP-Konto (Relay)" hint="Leer = automatisch per Domain-Match">
              <select style={inputStyle} value={form.smtp_account_id} onChange={e => setForm(f => ({ ...f, smtp_account_id: e.target.value }))}>
                <option value="">— Automatisch (Domain-Match) —</option>
                {smtpAccounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.match_domain ? ` (@${a.match_domain})` : " (Standard)"}</option>)}
              </select>
            </Field>
            <Field label="Disclaimer" hint="Nur wenn die Signatur einen Disclaimer-Block enthält">
              <select style={inputStyle} value={form.disclaimer_id} onChange={e => setForm(f => ({ ...f, disclaimer_id: e.target.value }))}>
                <option value="">— Kein Disclaimer —</option>
                {disclaimers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Empfänger-Scope" hint="Nur anwenden bei internen / externen Empfängern">
              <select style={inputStyle} value={form.recipient_scope} onChange={e => setForm(f => ({ ...f, recipient_scope: e.target.value }))}>
                <option value="all">Alle Empfänger</option>
                <option value="external_only">Nur externe Empfänger</option>
                <option value="internal_only">Nur interne Empfänger</option>
              </select>
            </Field>
            <Field label="Empfänger (exakt)" hint="leer = alle"><input style={inputStyle} value={form.match_recipient} onChange={e => setForm(f => ({ ...f, match_recipient: e.target.value }))} placeholder="z.B. kunde@example.com" /></Field>
            <Field label="Empfänger-Domain" hint="leer = alle"><input style={inputStyle} value={form.match_recipient_domain} onChange={e => setForm(f => ({ ...f, match_recipient_domain: e.target.value }))} placeholder="z.B. kunde.de" /></Field>
          </div>
          {/* Zeitbasierte Einschränkungen */}
          <div style={{ marginTop: 12, padding: "12px 14px", background: "#111", borderRadius: 8, border: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 11, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Zeitbasierte Einschränkungen</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Gültig ab (HH:MM)" hint="leer = ganztags">
                <input style={inputStyle} type="time" value={form.time_from} onChange={e => setForm(f => ({ ...f, time_from: e.target.value }))} />
              </Field>
              <Field label="Gültig bis (HH:MM)" hint="leer = ganztags">
                <input style={inputStyle} type="time" value={form.time_until} onChange={e => setForm(f => ({ ...f, time_until: e.target.value }))} />
              </Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Wochentage <span style={{ color: "#333" }}>(leer = alle)</span></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["0","Mo"],["1","Di"],["2","Mi"],["3","Do"],["4","Fr"],["5","Sa"],["6","So"]].map(([val, label]) => {
                  const active = (form.days_of_week || "").split(",").map(s => s.trim()).includes(val);
                  return (
                    <button key={val} type="button"
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid", fontSize: 12, cursor: "pointer", transition: "all .15s",
                        background: active ? "#1a2a3a" : "#1a1a1a", color: active ? "#93c5fd" : "#444", borderColor: active ? "#2563eb44" : "#222" }}
                      onClick={() => {
                        const cur = (form.days_of_week || "").split(",").map(s => s.trim()).filter(Boolean);
                        const next = active ? cur.filter(d => d !== val) : [...cur, val].sort();
                        setForm(f => ({ ...f, days_of_week: next.join(",") }));
                      }}
                    >{label}</button>
                  );
                })}
                {form.days_of_week && <button type="button" style={{ fontSize: 11, color: "#444", background: "none", border: "none", cursor: "pointer" }} onClick={() => setForm(f => ({ ...f, days_of_week: "" }))}>Alle</button>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {[["apply_on_new", "Neue Mails"], ["apply_on_reply", "Antworten"], ["is_active", "Aktiv"]].map(([k, l]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#777", cursor: "pointer" }}>
                <input type="checkbox" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />{l}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button style={btnPrimary} onClick={save}><Icon name="device-floppy" size={15} />Speichern</button>
            <button style={btnSecondary} onClick={closeForm}>Abbrechen</button>
          </div>
        </Card>
      )}
      {rules.filter(r => !r.template_id).length === 0 && editingId === null ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="filter" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Signatur-Regeln</div>
        </div>
      ) : rules.filter(r => !r.template_id).map(rule => {
        const sig     = sigs.find(s => s.id === rule.signature_id);
        const smtpAcc = smtpAccounts.find(a => a.id === rule.smtp_account_id);
        return (
          <div key={rule.id} style={{ background: "#161616", border: `1px solid ${editingId === rule.id ? "#fce49966" : "#222"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 7, display: "flex", alignItems: "center", gap: 12, opacity: rule.is_active ? 1 : 0.5 }}>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#555" }}>{rule.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{rule.name}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>{rule.match_sender || rule.match_domain ? `${rule.match_sender || "*"}@${rule.match_domain || "*"}` : "Alle Absender"}</span>
                <span style={{ color: "#333" }}>→</span>
                <span style={{ color: "#aaa" }}>{sig?.name || "—"}</span>
                <span style={{ color: "#444" }}>{[rule.apply_on_new && "Neu", rule.apply_on_reply && "Antwort"].filter(Boolean).join(" + ")}</span>
                {rule.ci_config_id && <span style={{ background: "#1a2a1a", color: "#6ee7b7", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>CI</span>}
                {smtpAcc && <span style={{ background: "#0a1a2a", color: "#93c5fd", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{smtpAcc.name}</span>}
                {rule.recipient_scope === "external_only" && <span style={{ background: "#1a1a2a", color: "#a78bfa", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>Extern</span>}
                {rule.recipient_scope === "internal_only" && <span style={{ background: "#1a2a2a", color: "#34d399", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>Intern</span>}
                {rule.match_recipient && <span style={{ background: "#1a1a1a", color: "#f9a8d4", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>→{rule.match_recipient}</span>}
                {rule.match_recipient_domain && !rule.match_recipient && <span style={{ background: "#1a1a1a", color: "#f9a8d4", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>→@{rule.match_recipient_domain}</span>}
                {(rule.time_from || rule.time_until) && <span style={{ background: "#1a1a1a", color: "#fbbf24", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{rule.time_from || "00:00"}–{rule.time_until || "24:00"}</span>}
                {rule.days_of_week && <span style={{ background: "#1a1a1a", color: "#fbbf24", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{rule.days_of_week.split(",").map(d=>["Mo","Di","Mi","Do","Fr","Sa","So"][parseInt(d)]||d).join(" ")}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => openEdit(rule)}><Icon name="edit" size={13} />Bearbeiten</button>
              <button style={btnDanger} onClick={() => del(rule.id)}><Icon name="trash" size={13} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Template Rules Page ──────────────────────────────────────────────────────
function TemplateRulesPage({ toast }) {
  const [rules, setRules] = useState([]);
  const [tmpls, setTmpls] = useState([]);
  const EMPTY = { name: "", match_sender: "", match_domain: "", apply_on_new: true, apply_on_reply: false, template_id: "", enrichment_source: "lexware", priority: 50, is_active: true };
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([api("GET", "/api/rules/"), api("GET", "/api/templates/")]);
    setRules(r); setTmpls(t); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(rule) {
    setForm({ name: rule.name, match_sender: rule.match_sender || "", match_domain: rule.match_domain || "", apply_on_new: rule.apply_on_new, apply_on_reply: rule.apply_on_reply, template_id: rule.template_id || "", enrichment_source: rule.enrichment_source || "lexware", priority: rule.priority, is_active: rule.is_active });
    setEditingId(rule.id);
  }

  function closeForm() { setEditingId(null); setForm(EMPTY); }

  async function save() {
    const payload = { ...form, match_sender: form.match_sender || null, match_domain: form.match_domain || null, enrichment_source: form.enrichment_source || null, template_id: parseInt(form.template_id), signature_id: null };
    try {
      if (editingId === "new") { await api("POST", "/api/rules/", payload); toast("ok", "Template-Regel erstellt"); }
      else { await api("PUT", `/api/rules/${editingId}`, payload); toast("ok", "Template-Regel gespeichert"); }
      closeForm(); load();
    } catch { toast("err", "Fehler beim Speichern"); }
  }

  async function del(id) { await api("DELETE", `/api/rules/${id}`); toast("ok", "Regel gelöscht"); load(); }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  const tmplRules = rules.filter(r => r.template_id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Template-Regeln</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Wann wird welches Angebots-Template verwendet.</p>
        </div>
        <button style={btnPrimary} onClick={editingId ? closeForm : () => { setForm(EMPTY); setEditingId("new"); }}>
          <Icon name={editingId ? "x" : "plus"} size={15} />{editingId ? "Abbrechen" : "Neue Regel"}
        </button>
      </div>
      <InfoBanner icon="git-branch" color="#fce499" title="Wie funktionieren Template-Regeln?"
        text="Erkennt Signaturmonster eine Lexware- oder JTL-Mail, ersetzt es den kompletten Mail-Body durch das gewählte Template — befüllt mit echten Angebotsdaten." />
      <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { icon: "mail",     color: "#93c5fd", label: "Mail erkannt",      text: "Absender / Domain matcht Regel" },
          { icon: "database", color: "#fce499", label: "Daten geladen",     text: "Lexware / JTL liefert Positionen" },
          { icon: "send",     color: "#6ee7b7", label: "Template gerendert",text: "Hübsche HTML-Mail wird versendet" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={s.icon} size={14} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>
      {tmpls.length === 0 && (
        <div style={{ padding: "12px 14px", background: "#1a1500", border: "1px solid #3a2a00", borderRadius: 8, fontSize: 12, color: "#888", marginBottom: 14 }}>
          <Icon name="alert-triangle" size={13} style={{ color: "#fce499", marginRight: 6 }} />
          Noch keine Templates — zuerst unter <strong style={{ color: "#fce499" }}>Templates</strong> ein Template erstellen.
        </div>
      )}
      {editingId !== null && (
        <Card title={editingId === "new" ? "Neue Template-Regel" : "Template-Regel bearbeiten"} icon="git-branch">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Lexware Angebote" /></Field>
            <Field label="Priorität"><input style={inputStyle} type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} /></Field>
            <Field label="Absender" hint="leer = alle"><input style={inputStyle} value={form.match_sender} onChange={e => setForm(f => ({ ...f, match_sender: e.target.value }))} placeholder="z.B. lexware@firma.de" /></Field>
            <Field label="Domain" hint="leer = alle"><input style={inputStyle} value={form.match_domain} onChange={e => setForm(f => ({ ...f, match_domain: e.target.value }))} placeholder="z.B. holdermann.de" /></Field>
            <Field label="Template">
              <select style={inputStyle} value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}>
                <option value="">— Template wählen —</option>
                {tmpls.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Datenquelle">
              <select style={inputStyle} value={form.enrichment_source} onChange={e => setForm(f => ({ ...f, enrichment_source: e.target.value }))}>
                <option value="lexware">Lexware Office</option>
                <option value="jtl">JTL-Wawi</option>
                <option value="">Keine (statisch)</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button style={btnPrimary} onClick={save}><Icon name="device-floppy" size={15} />Speichern</button>
            <button style={btnSecondary} onClick={closeForm}>Abbrechen</button>
          </div>
        </Card>
      )}
      {tmplRules.length === 0 && editingId === null ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="git-branch" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Template-Regeln</div>
        </div>
      ) : tmplRules.map(rule => {
        const tmpl = tmpls.find(t => t.id === rule.template_id);
        return (
          <div key={rule.id} style={{ background: "#161616", border: `1px solid ${editingId === rule.id ? "#fce49966" : "#222"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 7, display: "flex", alignItems: "center", gap: 12, opacity: rule.is_active ? 1 : 0.5 }}>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#555" }}>{rule.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", display: "flex", alignItems: "center", gap: 7 }}>
                {rule.name}
                {rule.enrichment_source && <span style={{ fontSize: 10, background: "#1a2a1a", color: "#6ee7b7", padding: "2px 6px", borderRadius: 4 }}>{rule.enrichment_source.toUpperCase()}</span>}
              </div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2, display: "flex", gap: 10 }}>
                <span>{rule.match_sender || rule.match_domain ? `${rule.match_sender || "*"}@${rule.match_domain || "*"}` : "Alle Absender"}</span>
                <span style={{ color: "#333" }}>→</span>
                <span style={{ color: "#fce499" }}>{tmpl?.name || "—"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => openEdit(rule)}><Icon name="edit" size={13} />Bearbeiten</button>
              <button style={btnDanger} onClick={() => del(rule.id)}><Icon name="trash" size={13} /></button>
            </div>
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
      setResult(r); toast(r.ok ? "ok" : "err", r.ok ? "Testmail gesendet!" : r.error);
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Verbindungstest</h1>
        <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>SMTP-Verbindung prüfen und Regel-Matching testen.</p>
      </div>
      <Card title="Testmail senden" icon="send">
        <Field label="Empfänger-Adresse">
          <input style={inputStyle} type="email" value={toAddr} onChange={e => setToAddr(e.target.value)} placeholder="test@example.com" />
        </Field>
        <button style={btnPrimary} onClick={sendTest} disabled={sending || !toAddr}>
          <Icon name={sending ? "loader" : "send"} size={15} />{sending ? "Sende..." : "Testmail senden"}
        </button>
        {result && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: result.ok ? "#0a1f14" : "#1f0a0a", border: `1px solid ${result.ok ? "#064e3b" : "#7f1d1d"}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: result.ok ? "#6ee7b7" : "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name={result.ok ? "circle-check" : "circle-x"} size={15} />
              {result.ok ? result.message : "Fehler"}
            </div>
            {!result.ok && <div style={{ fontSize: 12, color: "#f87171", marginTop: 5, fontFamily: "monospace" }}>{result.error}</div>}
          </div>
        )}
      </Card>
      <Card title="Regel-Matching testen" icon="filter">
        <Field label="Absender">
          <input style={inputStyle} value={matchTest.sender} onChange={e => setMatchTest(m => ({ ...m, sender: e.target.value }))} placeholder="max@holdermann.de" />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#777", cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={matchTest.is_reply} onChange={e => setMatchTest(m => ({ ...m, is_reply: e.target.checked }))} />
          Als Antwort / Weiterleitung behandeln
        </label>
        <button style={btnPrimary} onClick={testMatch} disabled={!matchTest.sender}><Icon name="search" size={15} />Regel prüfen</button>
        {matchResult !== null && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: matchResult ? "#0a1a2a" : "#1a1a1a", border: `1px solid ${matchResult ? "#1e3a5f" : "#2a2a2a"}` }}>
            {matchResult ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#93c5fd", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="circle-check" size={15} />Treffer: Regel #{matchResult.rule_id}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                  <span style={{ color: "#777" }}>Signatur: </span><span style={{ color: "#fce499" }}>{matchResult.signature?.name || "—"}</span>
                  {matchResult.enrichment_source && <span style={{ marginLeft: 10, color: "#6ee7b7" }}>+ {matchResult.enrichment_source}</span>}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="circle-x" size={15} />Kein Treffer
              </div>
            )}
          </div>
        )}
      </Card>
      <Card title="Proxy-Status" icon="activity">
        <div style={{ display: "flex", gap: 12 }}>
          {[{ label: "Backend API", port: "8001", url: "/health" }, { label: "SMTP Proxy", port: "2587", url: null }].map(s => (
            <div key={s.label} style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "11px 13px" }}>
              <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "0.6px" }}>{s.label}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4, fontFamily: "monospace" }}>:{s.port}</div>
              {s.url && <button onClick={async () => { try { const r = await fetch(`http://localhost:${s.port}${s.url}`); const d = await r.json(); alert(JSON.stringify(d)); } catch(e) { alert("Nicht erreichbar: "+e); }}} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 11, marginTop: 7 }}>Ping</button>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Templates Loader ─────────────────────────────────────────────────────────
const TemplatesPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    import("./pages/TemplatesPage.jsx").then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade Templates...</div>;
  return <Comp toast={toast} />;
};


// ─── Senders Page Loader ──────────────────────────────────────────────────────
const SendersPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SendersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;
  return <Comp toast={toast} />;
};

// ─── CI Page Loader ───────────────────────────────────────────────────────────
const CIPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/CIPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{color:"#555",padding:40}}>Lade...</div>;
  return <Comp toast={toast} />;
};

// ─── License Page Loader ─────────────────────────────────────────────────────
const LicensePageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/LicensePage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;
  return <Comp toast={toast} />;
};

// ─── Update Page Loader ───────────────────────────────────────────────────────
const UpdatePageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/UpdatePage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;
  return <Comp toast={toast} />;
};

const LogsPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/LogsPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;
  return <Comp toast={toast} />;
};

// ─── SMTP Users Loader ────────────────────────────────────────────────────────
const SMTPUsersLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SMTPUsersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;
  return <Comp toast={toast} />;
};

// ─── Users Management Loader ─────────────────────────────────────────────────
const UsersManagementLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/UsersManagementPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;
  return <Comp toast={toast} />;
};

// ─── Disclaimers Page Loader ──────────────────────────────────────────────────
const DisclaimersPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/DisclaimersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{color:"#555",padding:40}}>Lade...</div>;
  return <Comp toast={toast} />;
};

// ─── Banners Page Loader ──────────────────────────────────────────────────────
const BannersPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/BannersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{color:"#555",padding:40}}>Lade...</div>;
  return <Comp toast={toast} />;
};

// ─── Images Page Loader ───────────────────────────────────────────────────────
const MailLogPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/MailLogPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;
  return <Comp toast={toast} />;
};

const CampaignsPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/CampaignsPage.jsx").then(m => setComp(() => m.default)); }, []);
  return Comp ? <Comp toast={toast} /> : null;
};

const ImagesPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/ImagesPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{color:"#555",padding:40}}>Lade...</div>;
  return <Comp toast={toast} />;
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("smtp");
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sm_user")); } catch { return null; }
  });

  function toast(type, msg) {
    const id = Date.now();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function handleLogin(u) {
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem("sm_token");
    localStorage.removeItem("sm_user");
    setUser(null);
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isFullWidth = page === "templates" || page === "signatures" || page === "senders" || page === "banners" || page === "disclaimers" || page === "logs" || page === "images" || page === "campaigns" || page === "maillog";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d0d0d", color: "#ccc" }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #fce499 !important; outline: none; }
        button:disabled { opacity: .5; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
      `}</style>
      <Nav page={page} setPage={setPage} user={user} onLogout={handleLogout} />
      <main style={{ flex: 1, padding: isFullWidth ? "28px 32px" : "32px 40px", maxWidth: isFullWidth ? "none" : 800, overflowY: "auto", overflowX: "hidden" }}>
        {page === "smtp"       && <SMTPPage toast={toast} />}
        {page === "senders"    && <SendersPageLoader toast={toast} />}
        {page === "signatures" && <SignaturesPage toast={toast} />}
        {page === "rules"      && <RulesPage toast={toast} />}
        {page === "trules"     && <TemplateRulesPage toast={toast} />}
        {page === "test"       && <TestPage toast={toast} />}
        {page === "templates"  && <TemplatesPageLoader toast={toast} />}
        {page === "ci"          && <CIPageLoader toast={toast} />}
        {page === "smtp-users"   && <SMTPUsersLoader toast={toast} />}
        {page === "update"       && <UpdatePageLoader toast={toast} />}
        {page === "admin-users" && <UsersManagementLoader toast={toast} />}
        {page === "license"     && <LicensePageLoader toast={toast} />}
        {page === "disclaimers" && <DisclaimersPageLoader toast={toast} />}
        {page === "banners"     && <BannersPageLoader toast={toast} />}
        {page === "logs"        && <LogsPageLoader toast={toast} />}
        {page === "images"      && <ImagesPageLoader toast={toast} />}
        {page === "campaigns"   && <CampaignsPageLoader toast={toast} />}
        {page === "maillog"     && <MailLogPageLoader toast={toast} />}
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}
