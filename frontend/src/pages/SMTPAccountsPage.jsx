import React, { useState, useEffect, useCallback } from "react";

async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = {
  width: "100%", padding: "9px 12px", background: "#1a1a1a",
  border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0",
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const btnPrimary   = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnDanger    = { padding: "7px 12px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{hint}</div>}
  </div>
);

const PROVIDERS = [
  { label: "IONOS",   host: "smtp.ionos.de",    port: 587 },
  { label: "Strato",  host: "smtp.strato.de",   port: 587 },
  { label: "Gmail",   host: "smtp.gmail.com",   port: 587 },
  { label: "Mailcow", host: "mail.example.com", port: 587 },
];

const EMPTY = {
  name: "", relay_host: "", relay_port: 587, relay_user: "", relay_pass: "",
  from_address: "", match_domain: "", is_default: false,
};

function AccountForm({ initial, onSave, onCancel, toast }) {
  const [form, setForm]     = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPass, setShowPass]     = useState(false);
  const [testAddr, setTestAddr]     = useState("");
  const isNew = !initial?.id;

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim() || !form.relay_host.trim()) {
      toast("err", "Name und SMTP-Host sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const r = isNew
        ? await api("POST", "/api/smtp-accounts/", form)
        : await api("PUT",  `/api/smtp-accounts/${initial.id}`, form);
      if (r.id) { toast("ok", isNew ? "Konto erstellt" : "Konto gespeichert"); onSave(); }
      else       { toast("err", r.detail || "Fehler beim Speichern"); }
    } catch { toast("err", "Verbindung zum Backend fehlgeschlagen"); }
    setSaving(false);
  }

  async function testConn() {
    if (!testAddr) return;
    setTesting(true); setTestResult(null);
    try {
      const id = initial?.id;
      if (id) {
        const r = await api("POST", `/api/smtp-accounts/${id}/test`, { to_address: testAddr });
        setTestResult(r);
        toast(r.ok ? "ok" : "err", r.ok ? "Testmail gesendet!" : r.error);
      }
    } catch (e) { setTestResult({ ok: false, error: String(e) }); }
    setTesting(false);
  }

  return (
    <div style={{ background: "#161616", border: "1px solid #fce49944", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fce499", marginBottom: 20 }}>
        {isNew ? "Neues SMTP-Konto" : `Konto bearbeiten: ${initial.name}`}
      </div>

      {/* Schnellauswahl */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Schnellauswahl</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PROVIDERS.map(p => (
            <button key={p.label} onClick={() => setForm(f => ({ ...f, relay_host: p.host, relay_port: p.port }))}
              style={{ ...btnSecondary, fontSize: 12, padding: "6px 14px" }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Name (intern)">
          <input style={inputStyle} value={form.name} onChange={e => u("name", e.target.value)} placeholder="z.B. Holdermann IT" />
        </Field>
        <Field label="Domain-Match" hint="Absender-Domain → dieser Relay. Leer = Standard/Fallback.">
          <input style={inputStyle} value={form.match_domain} onChange={e => u("match_domain", e.target.value.toLowerCase())} placeholder="z.B. holdermann.de" />
        </Field>
        <Field label="SMTP Host">
          <input style={inputStyle} value={form.relay_host} onChange={e => u("relay_host", e.target.value)} placeholder="smtp.ionos.de" />
        </Field>
        <Field label="Port">
          <input style={inputStyle} type="number" value={form.relay_port} onChange={e => u("relay_port", parseInt(e.target.value) || 587)} />
        </Field>
        <Field label="Benutzername">
          <input style={inputStyle} value={form.relay_user} onChange={e => u("relay_user", e.target.value)} placeholder="deine@mail.de" />
        </Field>
        <Field label="Passwort">
          <div style={{ position: "relative" }}>
            <input style={{ ...inputStyle, paddingRight: 40 }} type={showPass ? "text" : "password"}
              value={form.relay_pass} onChange={e => u("relay_pass", e.target.value)} placeholder="••••••••" />
            <button onClick={() => setShowPass(s => !s)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer" }}>
              <Icon name={showPass ? "eye-off" : "eye"} size={15} />
            </button>
          </div>
        </Field>
      </div>
      <Field label="Absender-Adresse" hint="Leer = Benutzername wird verwendet">
        <input style={{ ...inputStyle }} value={form.from_address} onChange={e => u("from_address", e.target.value)} placeholder="info@firma.de" />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", cursor: "pointer", marginBottom: 20 }}>
        <input type="checkbox" checked={form.is_default} onChange={e => u("is_default", e.target.checked)} />
        Standard-Relay (Fallback wenn kein Domain-Match greift)
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <Icon name="device-floppy" size={15} />{saving ? "Speichern..." : "Speichern"}
        </button>
        <button style={btnSecondary} onClick={onCancel}>Abbrechen</button>

        {!isNew && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...inputStyle, width: 200 }} type="email" value={testAddr}
              onChange={e => setTestAddr(e.target.value)} placeholder="test@example.com" />
            <button style={{ ...btnSecondary, fontSize: 12 }} onClick={testConn} disabled={testing || !testAddr}>
              <Icon name={testing ? "loader" : "send"} size={14} />{testing ? "Sende..." : "Testmail"}
            </button>
          </div>
        )}
      </div>

      {testResult && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8,
          background: testResult.ok ? "#0a1f14" : "#1f0a0a",
          border: `1px solid ${testResult.ok ? "#064e3b" : "#7f1d1d"}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: testResult.ok ? "#6ee7b7" : "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={testResult.ok ? "circle-check" : "circle-x"} size={15} />
            {testResult.ok ? testResult.message : "Fehler"}
          </div>
          {!testResult.ok && <div style={{ fontSize: 12, color: "#f87171", marginTop: 5, fontFamily: "monospace" }}>{testResult.error}</div>}
        </div>
      )}
    </div>
  );
}

export default function SMTPAccountsPage({ toast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // null | "new" | account-object

  const load = useCallback(async () => {
    try {
      const d = await api("GET", "/api/smtp-accounts/");
      setAccounts(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/smtp-accounts/${id}`);
    toast("ok", "Konto gelöscht");
    load();
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>SMTP-Konten</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Mehrere Relay-Mailserver — je nach Absender-Domain wird der passende gewählt.
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setEditing("new")}>
          <Icon name="plus" size={15} />Neues Konto
        </button>
      </div>

      {/* Info-Banner */}
      <div style={{ padding: "12px 16px", background: "#1a1a1a", border: "1px solid #93c5fd22", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon name="info-circle" size={16} style={{ color: "#93c5fd", marginTop: 1, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#93c5fd" }}>Automatische Relay-Auswahl</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 3, lineHeight: "18px" }}>
            Der SMTP-Proxy wählt den Relay anhand der Absender-Domain. <strong style={{ color: "#888" }}>Reihenfolge:</strong> (1) Explizites Konto aus Signatur-Regel → (2) Domain-Match → (3) Standard-Fallback.<br />
            Mehrere Domains pro Konto sind als separate Einträge mit gleichem Server anzulegen.
          </div>
        </div>
      </div>

      {/* Neues Konto Form */}
      {editing === "new" && (
        <AccountForm
          initial={null}
          toast={toast}
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Konto bearbeiten */}
      {editing && editing !== "new" && (
        <AccountForm
          initial={editing}
          toast={toast}
          onSave={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Konto-Liste */}
      {accounts.length === 0 && !editing ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="server" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine SMTP-Konten</div>
          <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Erstelle ein Konto für jeden Mailserver.</div>
        </div>
      ) : accounts.map(acc => (
        <div key={acc.id} style={{
          background: "#161616", border: `1px solid ${editing?.id === acc.id ? "#fce49966" : "#222"}`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 8,
          display: "flex", alignItems: "center", gap: 12,
          opacity: editing && editing !== "new" && editing.id !== acc.id ? 0.4 : 1,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="server" size={16} style={{ color: acc.is_default ? "#fce499" : "#555" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              {acc.name}
              {acc.is_default && (
                <span style={{ fontSize: 10, background: "#2a2a00", color: "#fce499", padding: "2px 6px", borderRadius: 4 }}>STANDARD</span>
              )}
              {acc.match_domain && (
                <span style={{ fontSize: 10, background: "#0a1a2a", color: "#93c5fd", padding: "2px 7px", borderRadius: 4, fontFamily: "monospace" }}>@{acc.match_domain}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 3, fontFamily: "monospace" }}>
              {acc.relay_user && <span style={{ color: "#6ee7b7" }}>{acc.relay_user}</span>}
              {acc.relay_user && <span style={{ color: "#333" }}> → </span>}
              <span style={{ color: "#93c5fd" }}>{acc.relay_host || "—"}</span>
              {acc.relay_host && <span style={{ color: "#444" }}>:{acc.relay_port}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => setEditing(editing?.id === acc.id ? null : acc)}>
              <Icon name="edit" size={13} />Bearbeiten
            </button>
            <button style={btnDanger} onClick={() => del(acc.id)}>
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
