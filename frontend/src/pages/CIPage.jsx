import React, { useState, useEffect, useCallback, useRef } from "react";
import { ACCENT_COLORS, CI_PALETTES } from "../data/colorPresets.js";
import { useI18n } from "../AppContext.jsx";

const API = "";
async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const inputStyle = { width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--text-2)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const btnPrimary = { padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "9px 18px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnDanger = { padding: "7px 12px", background: "transparent", color: "var(--red-s)", border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 34, padding: 3, border: "1px solid var(--border-3)", borderRadius: 6, cursor: "pointer", background: "var(--bg-input)" }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
        {ACCENT_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            style={{ width: 18, height: 18, borderRadius: 3, background: c, border: value === c ? "2px solid var(--accent)" : "1px solid var(--border-3)", cursor: "pointer", padding: 0, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

const EMPTY = {
  name: "", primary_color: "#fce499", text_color: "#333333",
  bg_color: "#ffffff", header_bg: "#242424",
  font_family: "Arial, Helvetica, sans-serif", font_size: "14px",
  line_height: "1.6", container_width: "620",
  logo_url: "", company_name: "",
  show_header: true, show_footer: true, footer_text: "",
  content_bg: "#ffffff", shadow: "0 2px 12px rgba(0,0,0,0.08)",
};

function resizeImage(file, maxH) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const scale = maxH / img.height;
        const w = Math.round(img.width * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = maxH;
        canvas.getContext("2d").drawImage(img, 0, 0, w, maxH);
        resolve(canvas.toDataURL(file.type || "image/png"));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function LogoUpload({ value, onChange }) {
  const { t } = useI18n();
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizeImage(file, 50);
    onChange(resized);
    e.target.value = "";
  }

  const isDataUri = value && value.startsWith("data:");
  const isUrl = value && !isDataUri;

  return (
    <div>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-nav)", border: "1px solid var(--border-3)", borderRadius: 8 }}>
          <img src={value} alt="Logo" style={{ maxHeight: 36, maxWidth: 100, objectFit: "contain", borderRadius: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: isUrl ? "var(--red-s)" : "var(--teal)" }}>
              {isUrl ? t("ci.logoExternalUrl") : t("ci.logoEmbedded")}
            </div>
          </div>
          <button onClick={() => fileRef.current.click()} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 11 }}>
            <i className="ti ti-upload" style={{ fontSize: 12 }} /> {t("ci.logoSwap")}
          </button>
          <button onClick={() => onChange("")} style={{ ...btnDanger, padding: "5px 8px" }}>
            <i className="ti ti-x" style={{ fontSize: 12 }} />
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current.click()} style={{ ...btnSecondary, width: "100%", justifyContent: "center", padding: "10px" }}>
          <i className="ti ti-upload" style={{ fontSize: 14 }} /> {t("ci.logoUpload")}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

function CIPreview({ cfg }) {
  const { t } = useI18n();
  const c = { ...EMPTY, ...cfg };
  return (
    <div style={{ background: "#f0f0f0", borderRadius: 10, overflow: "hidden", border: "1px solid var(--text-2)" }}>
      <div style={{ background: "var(--bg-input)", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
        <span style={{ fontSize: 10, color: "var(--text-5)", marginLeft: 6 }}>{t("common.preview")}</span>
      </div>
      <div style={{ padding: "16px", background: c.bg_color }}>
        <div style={{ maxWidth: "100%", background: c.content_bg || "#fff", borderRadius: 10, border: c.border || "1px solid #dddddd", overflow: "hidden" }}>
          {c.show_header && (c.logo_url || c.company_name) && (
            <div style={{ background: c.header_bg, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              {c.logo_url && <img src={c.logo_url} alt="" style={{ maxHeight: 32, display: "block", border: 0 }} />}
              {c.company_name && <span style={{ fontSize: 15, fontWeight: "bold", color: c.primary_color }}>{c.company_name}</span>}
            </div>
          )}
          <div style={{ padding: "16px", fontFamily: c.font_family, fontSize: c.font_size, color: c.text_color, lineHeight: c.line_height }}>
            <p>Hallo Frau Mustermann,</p>
            <p style={{ marginTop: 8 }}>anbei sende ich Ihnen die gewünschten Unterlagen. Bei Rückfragen stehe ich gerne zur Verfügung.</p>
            <p style={{ marginTop: 8 }}>Mit freundlichen Grüßen</p>
          </div>
          <div style={{ borderTop: "1px solid #eee", padding: "10px 16px" }}>
            <div style={{ fontSize: 11, color: "#888" }}>
              <strong style={{ color: c.primary_color }}>Max Mustermann</strong><br />
              Musterfirma GmbH · info@musterfirma.de
            </div>
          </div>
          {c.show_footer && c.footer_text && (
            <div style={{ background: c.header_bg, padding: "8px 16px", fontSize: 10, color: "#888" }}>
              {c.footer_text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CIEditor({ ci, onSave, onCancel, toast }) {
  const { t } = useI18n();
  const [form, setForm] = useState(ci ? { ...ci } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const u = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function save() {
    if (!form.name.trim()) { toast("err", t("ci.errorName")); return; }
    setSaving(true);
    try {
      if (ci?.id) { await api("PUT", `/api/ci/${ci.id}`, form); toast("ok", t("ci.saved")); }
      else { await api("POST", "/api/ci/", form); toast("ok", t("ci.created")); }
      onSave();
    } catch { toast("err", t("common.saveError")); }
    setSaving(false);
  }

  const FONTS = [
    "Arial, Helvetica, sans-serif",
    "Georgia, 'Times New Roman', serif",
    "'Trebuchet MS', sans-serif",
    "Verdana, Geneva, sans-serif",
    "'Courier New', monospace",
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ ...btnSecondary, padding: "7px 12px" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> {t("common.cancel")}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", margin: 0, flex: 1 }}>
          {ci?.id ? t("ci.editTitle") : t("ci.newTitle")}
        </h1>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} />{saving ? t("common.saving") : t("common.save")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-id-badge" style={{ color: "var(--accent)" }} /> {t("ci.sectionGeneral")}
            </div>
            <Field label={t("ci.fieldName")}>
              <input style={inputStyle} value={form.name} onChange={e => u("name", e.target.value)} placeholder={t("ci.fieldNamePlaceholder")} />
            </Field>
            <Field label={t("ci.fieldCompany")}>
              <input style={inputStyle} value={form.company_name} onChange={e => u("company_name", e.target.value)} placeholder={t("ci.fieldCompanyPlaceholder")} />
            </Field>
            <Field label={t("ci.fieldLogo")} hint={t("ci.fieldLogoHint")}>
              <LogoUpload value={form.logo_url} onChange={v => u("logo_url", v)} />
            </Field>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-palette" style={{ color: "var(--accent)" }} /> {t("ci.sectionColors")}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>{t("ci.palettePreset")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {CI_PALETTES.map(p => (
                  <button key={p.name} title={p.name}
                    onClick={() => setForm(f => ({ ...f, primary_color: p.primary_color, text_color: p.text_color, bg_color: p.bg_color, header_bg: p.header_bg, content_bg: p.content_bg }))}
                    style={{ padding: "7px 6px", background: "var(--bg-nav)", border: "1px solid var(--border-3)", borderRadius: 7, cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                      {p.preview.map((c, i) => (
                        <div key={i} style={{ flex: 1, height: 10, borderRadius: 2, background: c, border: "1px solid var(--text-7)" }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
            <ColorField label={t("ci.colorAccent")} value={form.primary_color} onChange={v => u("primary_color", v)} />
            <ColorField label={t("ci.colorText")} value={form.text_color} onChange={v => u("text_color", v)} />
            <ColorField label={t("ci.colorBg")} value={form.bg_color} onChange={v => u("bg_color", v)} />
            <ColorField label={t("ci.colorHeader")} value={form.header_bg} onChange={v => u("header_bg", v)} />
            <ColorField label={t("ci.colorContent")} value={form.content_bg} onChange={v => u("content_bg", v)} />
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-typography" style={{ color: "var(--accent)" }} /> {t("ci.sectionTypography")}
            </div>
            <Field label={t("ci.fieldFont")}>
              <select style={inputStyle} value={form.font_family} onChange={e => u("font_family", e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f.split(",")[0]}</option>)}
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label={t("ci.fieldFontSize")}>
                <input style={inputStyle} value={form.font_size} onChange={e => u("font_size", e.target.value)} placeholder="14px" />
              </Field>
              <Field label={t("ci.fieldLineHeight")}>
                <input style={inputStyle} value={form.line_height} onChange={e => u("line_height", e.target.value)} placeholder="1.6" />
              </Field>
              <Field label={t("ci.fieldWidth")}>
                <input style={inputStyle} value={form.container_width} onChange={e => u("container_width", e.target.value)} placeholder="620" />
              </Field>
            </div>
              <Field label={t("ci.fieldBorder")} hint={t("ci.fieldBorderHint")}>
                <input style={inputStyle} value={form.border} onChange={e => u("border", e.target.value)} placeholder="1px solid #dddddd" />
              </Field>
        </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-layout" style={{ color: "var(--accent)" }} /> {t("ci.sectionLayout")}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)", cursor: "pointer", marginBottom: 10 }}>
              <input type="checkbox" checked={form.show_header} onChange={e => u("show_header", e.target.checked)} />
              {t("ci.showHeader")}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)", cursor: "pointer", marginBottom: 14 }}>
              <input type="checkbox" checked={form.show_footer} onChange={e => u("show_footer", e.target.checked)} />
              {t("ci.showFooter")}
            </label>
            <Field label={t("ci.fieldFooterText")} hint={t("ci.fieldFooterTextHint")}>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.footer_text} onChange={e => u("footer_text", e.target.value)} placeholder="Holdermann IT · Musterstr. 1 · 12345 Musterstadt" />
            </Field>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-eye" style={{ color: "var(--accent)" }} /> {t("ci.livePreview")}
          </div>
          <div style={{ position: "sticky", top: 20 }}>
            <CIPreview cfg={form} />
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 8, fontSize: 12, color: "var(--text-5)", lineHeight: "18px" }}>
              <i className="ti ti-info-circle" style={{ marginRight: 6, color: "var(--accent)" }} />
              {t("ci.previewHint")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CIPage({ toast }) {
  const { t } = useI18n();
  const [configs, setConfigs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const importRef = useRef(null);

  const load = useCallback(async () => {
    try { const d = await api("GET", "/api/ci/"); setConfigs(d); }
    catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    await api("DELETE", `/api/ci/${id}`);
    toast("ok", t("ci.deleted"));
    load();
  }

  function exportOne(ci) {
    const { id: _, created_at: __, ...fields } = ci;
    const data = {
      type: "signaturmonster-ci",
      version: 1,
      exported_at: new Date().toISOString(),
      profiles: [fields],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ci-profil-${ci.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const data = JSON.parse(await file.text());
      if (data.type !== "signaturmonster-ci" || !Array.isArray(data.profiles)) {
        toast("err", t("ci.importInvalidFormat")); return;
      }
      for (const p of data.profiles) {
        const { id: _, created_at: __, ...fields } = p;
        await api("POST", "/api/ci/", fields);
      }
      toast("ok", `${data.profiles.length} ${t("ci.importedProfiles")}`);
      load();
    } catch { toast("err", t("ci.importFailed")); }
  }

  if (editing !== null) return (
    <CIEditor ci={editing === "new" ? null : editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} toast={toast} />
  );

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("ci.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("ci.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary} onClick={() => setEditing("new")}>
            <i className="ti ti-plus" style={{ fontSize: 15 }} />{t("ci.newProfile")}
          </button>
          <input type="file" accept=".json" ref={importRef} style={{ display: "none" }} onChange={handleImport} />
          <button style={btnSecondary} onClick={() => importRef.current?.click()}>
            <i className="ti ti-upload" style={{ fontSize: 15 }} />{t("common.import")}
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 16px", background: "var(--bg-input)", border: "1px solid var(--blue-bd)", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12 }}>
        <i className="ti ti-wand" style={{ fontSize: 16, color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{t("ci.infoTitle")}</div>
          <div style={{ fontSize: 12, color: "var(--text-5)", marginTop: 3, lineHeight: "18px" }}>
            {t("ci.infoText")}
          </div>
        </div>
      </div>

      {configs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-6)" }}>
          <i className="ti ti-palette" style={{ fontSize: 40, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>{t("ci.emptyTitle")}</div>
          <div style={{ fontSize: 12, color: "var(--text-7)", marginTop: 6 }}>{t("ci.emptySubtitle")}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {configs.map(ci => (
            <div key={ci.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: ci.header_bg || "#242424", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                {ci.logo_url && <img src={ci.logo_url} alt="" style={{ maxHeight: 28, display: "block", border: 0 }} />}
                <span style={{ fontSize: 13, fontWeight: "bold", color: ci.primary_color || "var(--accent)" }}>{ci.company_name || ci.name}</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>{ci.name}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[ci.primary_color, ci.text_color, ci.bg_color, ci.header_bg].map((c, i) => (
                    <div key={i} title={c} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: "1px solid var(--text-7)" }} />
                  ))}
                  <span style={{ fontSize: 11, color: "var(--text-5)", marginLeft: 4, alignSelf: "center" }}>
                    {ci.font_family?.split(",")[0]}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, padding: "7px 0", background: "transparent", border: "1px solid var(--border-3)", borderRadius: 7, color: "var(--text-3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                    onClick={() => setEditing(ci)}>
                    <i className="ti ti-edit" style={{ fontSize: 13 }} />{t("common.edit")}
                  </button>
                  <button style={{ padding: "7px 10px", background: "transparent", border: "1px solid var(--border-3)", borderRadius: 7, color: "var(--text-3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                    onClick={() => exportOne(ci)}>
                    <i className="ti ti-download" style={{ fontSize: 13 }} />{t("common.export")}
                  </button>
                  <button style={btnDanger} onClick={() => del(ci.id)}>
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
