import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../AppContext.jsx";
import ImageLibraryModal from "../components/ImageLibraryModal.jsx";

const API = "";
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const iStyle = { width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--text-3)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "8px 14px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const btnDanger = { padding: "7px 10px", background: "transparent", color: "var(--red-s)", border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

const EMPTY = { email: "", first_name: "", last_name: "", job_title: "", photo_url: "", phone: "", mobile: "", street: "", postal_code: "", city: "", country: "", company: "" };

function Avatar({ sender, size = 44 }) {
  const initials = [sender.first_name?.[0], sender.last_name?.[0]].filter(Boolean).join("").toUpperCase() || sender.email?.[0]?.toUpperCase() || "?";
  if (sender.photo_url) {
    return <img src={sender.photo_url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-3)", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--border-3)", border: "2px solid var(--text-7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function SenderEditor({ sender, onSave, onCancel, toast }) {
  const { t } = useI18n();
  const [form, setForm] = useState(sender ? { ...sender } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.email.trim()) { toast("err", t("common.requiredFields")); return; }
    setSaving(true);
    try {
      if (sender?.id) { await api("PUT", `/api/senders/${sender.id}`, form); toast("ok", t("senders.saved")); }
      else { await api("POST", "/api/senders/", form); toast("ok", t("senders.created")); }
      onSave();
    } catch { toast("err", t("common.saveError")); }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={btnSecondary}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> {t("common.cancel")}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", margin: 0, flex: 1 }}>
          {sender?.id ? t("senders.editTitle") : t("senders.newTitle")}
        </h1>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />{saving ? t("common.saving") : t("common.save")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-id-badge" style={{ color: "var(--accent)" }} /> {t("senders.masterData")}
            </div>
            <Field label={t("senders.emailField")}>
              <input style={iStyle} type="email" value={form.email} onChange={e => u("email", e.target.value)} placeholder="max@firma.de" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("senders.firstName")}>
                <input style={iStyle} value={form.first_name} onChange={e => u("first_name", e.target.value)} placeholder="Max" />
              </Field>
              <Field label={t("senders.lastName")}>
                <input style={iStyle} value={form.last_name} onChange={e => u("last_name", e.target.value)} placeholder="Mustermann" />
              </Field>
            </div>
            <Field label={t("senders.jobTitle")}>
              <input style={iStyle} value={form.job_title} onChange={e => u("job_title", e.target.value)} placeholder="Geschäftsführer" />
            </Field>
            <Field label={t("senders.company")}>
              <input style={iStyle} value={form.company} onChange={e => u("company", e.target.value)} placeholder="Musterfirma GmbH" />
            </Field>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-phone" style={{ color: "var(--accent)" }} /> {t("senders.contact")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("senders.phone")}>
                <input style={iStyle} value={form.phone} onChange={e => u("phone", e.target.value)} placeholder="+49 30 123 456" />
              </Field>
              <Field label={t("senders.mobile")}>
                <input style={iStyle} value={form.mobile} onChange={e => u("mobile", e.target.value)} placeholder="+49 151 123 456" />
              </Field>
            </div>
            <Field label={t("senders.street")}>
              <input style={iStyle} value={form.street} onChange={e => u("street", e.target.value)} placeholder="Musterstraße 1" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 12 }}>
              <Field label={t("senders.postalCode")}>
                <input style={iStyle} value={form.postal_code} onChange={e => u("postal_code", e.target.value)} placeholder="12345" />
              </Field>
              <Field label={t("senders.city")}>
                <input style={iStyle} value={form.city} onChange={e => u("city", e.target.value)} placeholder="Musterstadt" />
              </Field>
              <Field label={t("senders.country")}>
                <input style={iStyle} value={form.country} onChange={e => u("country", e.target.value)} placeholder="Deutschland" />
              </Field>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <i className="ti ti-photo" style={{ color: "var(--accent)" }} /> {t("senders.profilePhoto")}
            </div>
            {showLibrary && (
              <ImageLibraryModal
                onSelect={url => { u("photo_url", url); setShowLibrary(false); }}
                onClose={() => setShowLibrary(false)}
              />
            )}
            <Field label={t("senders.photoUrl")} hint={t("senders.photoUrlHint")}>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...iStyle, flex: 1 }} value={form.photo_url} onChange={e => u("photo_url", e.target.value)} placeholder="https://firma.de/fotos/max.jpg" />
                <button onClick={() => setShowLibrary(true)}
                  style={{ flexShrink: 0, padding: "9px 12px", background: "var(--bg-hover)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--accent)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-photo-library" style={{ fontSize: 14 }} /> {t("images.title")}
                </button>
              </div>
            </Field>
          </div>
        </div>

        {/* Vorschau + Variablen */}
        <div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>{t("senders.preview")}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <Avatar sender={form} size={56} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                  {[form.first_name, form.last_name].filter(Boolean).join(" ") || "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>{form.job_title || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2 }}>{form.email}</div>
              </div>
            </div>
            {(form.phone || form.mobile) && (
              <div style={{ fontSize: 11, color: "var(--text-4)", lineHeight: "18px" }}>
                {form.phone && <div>📞 {form.phone}</div>}
                {form.mobile && <div>📱 {form.mobile}</div>}
              </div>
            )}
            {(form.street || form.city) && (
              <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 4 }}>
                📍 {[form.street, [form.postal_code, form.city].filter(Boolean).join(" "), form.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>{t("senders.availableVars")}</div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginBottom: 10, lineHeight: "16px" }}>
              {t("senders.availableVarsHint")}
            </div>
            {[
              ["vorname", form.first_name],
              ["nachname", form.last_name],
              ["name", [form.first_name, form.last_name].filter(Boolean).join(" ")],
              ["email", form.email],
              ["berufsbezeichnung", form.job_title],
              ["firma", form.company],
              ["telefon", form.phone],
              ["mobil", form.mobile],
              ["strasse",  form.street],
              ["plz",      form.postal_code],
              ["ort",      form.city],
              ["land",     form.country],
              ["adresse",  [form.street, [form.postal_code, form.city].filter(Boolean).join(" "), form.country].filter(Boolean).join(", ")],
              ["foto",     form.photo_url ? t("senders.imageUrl") : ""],
            ].map(([k, val]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <code style={{ fontSize: 10, background: "var(--bg-nav)", border: "1px solid var(--border-3)", borderRadius: 4, padding: "2px 6px", color: "var(--accent)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                  {`{{${k}}}`}
                </code>
                <span style={{ fontSize: 11, color: "var(--text-6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportResultModal({ result, onClose, t }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 14, padding: "28px 32px", width: 420, maxWidth: "90vw" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", margin: "0 0 20px" }}>{t("senders.importResult")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: t("senders.importCreated"), value: result.created, color: "var(--green-s)" },
            { label: t("senders.importUpdated"), value: result.updated, color: "var(--accent)" },
            { label: t("senders.importErrors"),  value: result.errors.length, color: result.errors.length ? "var(--red-s)" : "var(--text-5)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--bg-input)", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        {result.errors.length > 0 && (
          <div style={{ background: "var(--red-bg)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, maxHeight: 120, overflowY: "auto" }}>
            {result.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--red-s)", marginBottom: 3 }}>{e}</div>
            ))}
          </div>
        )}
        <button style={{ ...btnPrimary, width: "100%" }} onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}

export default function SendersPage({ toast }) {
  const { t } = useI18n();
  const [senders, setSenders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef();

  const load = useCallback(async () => {
    try { const d = await api("GET", "/api/senders/"); setSenders(d); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/senders/${id}`);
    toast("ok", t("senders.deleted"));
    load();
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/senders/import", { method: "POST", body: form });
      const result = await resp.json();
      setImportResult(result);
      load();
    } catch { toast("err", t("senders.importError")); }
    setImporting(false);
  }

  function handleExport(format) {
    const token = localStorage.getItem("token");
    const url = `/api/senders/export?format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  if (editing !== null) return (
    <SenderEditor
      sender={editing === "new" ? null : editing}
      onSave={() => { setEditing(null); load(); }}
      onCancel={() => setEditing(null)}
      toast={toast}
    />
  );

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  const filtered = senders.filter(s =>
    !search || [s.first_name, s.last_name, s.email, s.job_title, s.company].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {importResult && (
        <ImportResultModal result={importResult} onClose={() => setImportResult(null)} t={t} />
      )}
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={handleImport} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("senders.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("senders.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={btnSecondary} onClick={() => handleExport("xlsx")} title={t("senders.exportXlsx")}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize: 15 }} /> XLSX
          </button>
          <button style={btnSecondary} onClick={() => handleExport("csv")} title={t("senders.exportCsv")}>
            <i className="ti ti-file-text" style={{ fontSize: 15 }} /> CSV
          </button>
          <button style={btnSecondary} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <i className="ti ti-upload" style={{ fontSize: 15 }} />{importing ? t("senders.importing") : t("senders.import")}
          </button>
          <button style={btnPrimary} onClick={() => setEditing("new")}>
            <i className="ti ti-plus" style={{ fontSize: 15 }} />{t("senders.newSender")}
          </button>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--accent-bd)", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <i className="ti ti-variable" style={{ fontSize: 16, color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: "var(--text-5)", lineHeight: "18px" }}>
          {t("senders.variableHint")}
          {" "}{["{{vorname}}", "{{nachname}}", "{{email}}", "{{berufsbezeichnung}}", "{{telefon}}", "{{mobil}}", "{{strasse}}", "{{plz}}", "{{ort}}", "{{land}}", "{{adresse}}"].map(v => (
            <code key={v} style={{ background: "var(--bg-nav)", border: "1px solid var(--border-3)", borderRadius: 3, padding: "0 4px", color: "var(--accent)", fontSize: 11, marginRight: 4, fontFamily: "monospace" }}>{v}</code>
          ))}
        </div>
      </div>

      {senders.length > 4 && (
        <div style={{ marginBottom: 14 }}>
          <input style={iStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("senders.searchPlaceholder")} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-6)" }}>
          <i className="ti ti-users" style={{ fontSize: 40, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>{search ? t("senders.noResults") : t("senders.empty")}</div>
          {!search && <div style={{ fontSize: 12, color: "var(--text-7)", marginTop: 6 }}>{t("senders.emptyHint")}</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Avatar sender={s} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                </div>
                {s.job_title && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>{s.job_title}</div>}
                <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                {(s.phone || s.mobile) && (
                  <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 4 }}>
                    {s.phone && <span style={{ marginRight: 10 }}>📞 {s.phone}</span>}
                    {s.mobile && <span>📱 {s.mobile}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button style={btnSecondary} onClick={() => setEditing(s)}>
                  <i className="ti ti-edit" style={{ fontSize: 13 }} />
                </button>
                <button style={btnDanger} onClick={() => del(s.id)}>
                  <i className="ti ti-trash" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
