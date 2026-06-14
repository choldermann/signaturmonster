import React, { useState, useEffect, useCallback, useRef } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import { useTheme, useI18n } from "./AppContext.jsx";

const FREE_FEATURES = new Set(["smtp_basic", "signatures", "rules"]);

const PAGE_FEATURE = {
  "senders":     "senders",
  "disclaimers": "disclaimer",
  "banners":     "banners",
  "campaigns":   "campaigns",
  "images":      "banners",
  "ci":          "ci_branding",
  "templates":   "templates",
  "trules":      "templates",
  "admin-users": "user_mgmt",
};

const API = "";

async function api(method, path, body) {
  const token = localStorage.getItem("sm_token");
  const r = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const inputStyle = {
  width: "100%", padding: "9px 12px",
  background: "var(--bg-input)", border: "1px solid var(--border-3)",
  borderRadius: 8, color: "var(--text-2)", fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const btnPrimary = {
  padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)",
  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
};
const btnSecondary = {
  padding: "9px 18px", background: "transparent", color: "var(--text-3)",
  border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13,
  fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
};
const btnDanger = {
  padding: "7px 12px", background: "transparent", color: "var(--red-s)",
  border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
};

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{
          padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: toast.type === "ok" ? "var(--green-bg)" : "var(--red-bg)",
          color:      toast.type === "ok" ? "var(--green)"    : "var(--red)",
          border: `1px solid ${toast.type === "ok" ? "var(--green-bd)" : "var(--red-bd)"}`,
          display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn .2s ease",
        }}>
          <Icon name={toast.type === "ok" ? "circle-check" : "circle-x"} size={16} />
          {toast.msg}
        </div>
      ))}
    </div>
  );
}

function Nav({ page, setPage, user, onLogout, activeFeatures }) {
  const { t, lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const groups = [
    // "Mein Profil" (self-service) hidden until employee login exists
    {
      label: t("nav.group.config"),
      items: [
        { id: "smtp",        icon: "server",       label: t("nav.item.smtp") },
        { id: "smtp-users",  icon: "user-bolt",    label: t("nav.item.smtpUsers") },
        { id: "test",        icon: "send",         label: t("nav.item.test") },
        { id: "admin-users", icon: "users",        label: t("nav.item.adminUsers") },
        { id: "license",     icon: "key",          label: t("nav.item.license") },
        { id: "update",      icon: "refresh",      label: t("nav.item.update") },
        { id: "logs",        icon: "terminal-2",   label: t("nav.item.logs") },
        { id: "maillog",     icon: "mail-search",  label: t("nav.item.maillog") },
        { id: "mailqueue",   icon: "mail-forward",  label: t("nav.item.mailqueue") },
        { id: "addon",       icon: "brand-firefox", label: t("nav.item.addon") },
      ],
    },
    {
      label: t("nav.group.signatures"),
      items: [
        { id: "senders",     icon: "at",        label: t("nav.item.senders") },
        { id: "signatures",  icon: "signature", label: t("nav.item.signatures") },
        { id: "rules",       icon: "filter",    label: t("nav.item.rules") },
        { id: "disclaimers", icon: "shield",    label: t("nav.item.disclaimers") },
        { id: "banners",     icon: "ad",        label: t("nav.item.banners") },
      ],
    },
    {
      label: t("nav.group.templates"),
      items: [
        { id: "templates", icon: "template",   label: t("nav.item.templates") },
        { id: "trules",    icon: "git-branch", label: t("nav.item.trules") },
      ],
    },
    {
      label: t("nav.group.branding"),
      items: [
        { id: "ci",        icon: "palette",      label: t("nav.item.ci") },
        { id: "images",    icon: "photo",        label: t("nav.item.images") },
        { id: "campaigns", icon: "speakerphone", label: t("nav.item.campaigns") },
      ],
    },
  ];

  return (
    <nav style={{
      width: 220, height: "100vh",
      position: "sticky", top: 0,
      background: "var(--bg-nav)", borderRight: "1px solid var(--border-1)",
      display: "flex", flexDirection: "column", padding: "0 0 24px", flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid var(--border-1)" }}>
        <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>Signatur</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.5px" }}>Monster</div>
        <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{t("nav.version")}</div>
      </div>

      <div style={{ padding: "12px 12px", flex: 1, overflowY: "auto" }}>
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "1px", padding: "0 8px", marginBottom: 4 }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const requiredFeature = PAGE_FEATURE[item.id];
              const locked = requiredFeature && !activeFeatures.has(requiredFeature);
              return (
                <button key={item.id} onClick={() => setPage(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                    marginBottom: 1, textAlign: "left", fontSize: 13, fontWeight: 500,
                    background: page === item.id ? "var(--bg-hover)" : "transparent",
                    color: page === item.id ? "var(--accent)" : locked ? "var(--text-7)" : "var(--text-4)",
                    transition: "all .15s",
                    opacity: locked ? 0.65 : 1,
                  }}>
                  <Icon name={item.icon} size={15} style={{ color: page === item.id ? "var(--accent)" : locked ? "var(--text-7)" : "var(--text-6)" }} />
                  {item.label}
                  {locked
                    ? <Icon name="lock" size={11} style={{ marginLeft: "auto", color: "var(--text-7)" }} />
                    : page === item.id && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 12px" }}>
        {/* Datenquellen */}
        <div style={{ padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8, border: "1px solid var(--border-1)", marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>
            {t("nav.footer.dataSources")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-5)", display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <Icon name="database" size={11} style={{ color: "var(--text-7)" }} /> {t("nav.footer.lexware")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-5)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="database" size={11} style={{ color: "var(--text-7)" }} /> {t("nav.footer.jtl")}
          </div>
        </div>

        {/* Theme + Language toggles */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={toggleTheme}
            title={theme === "dark" ? t("nav.theme.toLight") : t("nav.theme.toDark")}
            style={{
              flex: 1, padding: "7px 0", background: "var(--bg-input)",
              border: "1px solid var(--border-1)", borderRadius: 7,
              color: "var(--text-4)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
          </button>
          <button onClick={toggleLang}
            title={t("nav.lang.other")}
            style={{
              flex: 1, padding: "7px 0", background: "var(--bg-input)",
              border: "1px solid var(--border-1)", borderRadius: 7,
              color: "var(--text-4)", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.5px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            {lang === "de" ? "EN" : "DE"}
          </button>
        </div>

        {/* User + Logout */}
        <div style={{ padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8, border: "1px solid var(--border-1)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="user" size={13} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name || "—"}
            </div>
            {user?.is_admin && <div style={{ fontSize: 9, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{t("nav.footer.admin")}</div>}
          </div>
          <button onClick={onLogout} title={t("nav.footer.logout")}
            style={{ background: "none", border: "1px solid var(--border-3)", borderRadius: 5, color: "var(--text-5)", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", flexShrink: 0 }}>
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
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Card({ title, icon, children, action }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 12, marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {icon && <Icon name={icon} size={15} style={{ color: "var(--accent)" }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function InfoBanner({ icon, color, title, text }) {
  return (
    <div style={{ padding: "12px 16px", background: "var(--bg-input)", border: "1px solid var(--border-2)", borderRadius: 10, marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <Icon name={icon} size={16} style={{ color, marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-5)", marginTop: 3, lineHeight: "18px" }}>{text}</div>
      </div>
    </div>
  );
}

// ─── SMTP Accounts Loader ─────────────────────────────────────────────────────
function SMTPPage({ toast }) {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SMTPAccountsPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
}

// ─── Signatures Page ──────────────────────────────────────────────────────────
function SignaturesPage({ toast }) {
  const { t } = useI18n();
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
    toast("ok", t("signatures.toast.deleted"));
    load();
  }

  function exportOne(sig) {
    const data = {
      type: "signaturmonster-signatures", version: 1,
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
        toast("err", t("signatures.toast.invalidFormat")); return;
      }
      for (const s of data.signatures) {
        await api("POST", "/api/signatures/", {
          name: s.name, html_content: s.html_content || "",
          text_content: s.text_content || "", is_default: false,
          designer_json: s.designer_json || null,
        });
      }
      toast("ok", t("signatures.toast.imported", { count: data.signatures.length }));
      load();
    } catch { toast("err", t("signatures.toast.importFailed")); }
  }

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  if (designer !== null && DesignerComp) return (
    <DesignerComp
      signature={designer === "new" ? null : designer}
      onSave={() => { setDesigner(null); load(); }}
      onCancel={() => setDesigner(null)}
      toast={toast}
    />
  );

  if (designer !== null && !DesignerComp) return (
    <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loadingDesigner")}</div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("signatures.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("signatures.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary} onClick={() => setDesigner("new")}>
            <Icon name="wand" size={15} />{t("signatures.btnDesigner")}
          </button>
          <input type="file" accept=".json" ref={importRef} style={{ display: "none" }} onChange={handleImport} />
          <button style={btnSecondary} onClick={() => importRef.current?.click()}>
            <Icon name="upload" size={15} />{t("signatures.btnImport")}
          </button>
        </div>
      </div>
      <InfoBanner icon="wand" color="var(--green)"
        title={t("signatures.info.title")} text={t("signatures.info.text")} />
      {sigs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
          <Icon name="signature" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>{t("signatures.empty.title")}</div>
          <div style={{ fontSize: 12, color: "var(--text-7)", marginTop: 6 }}>{t("signatures.empty.subtitle")}</div>
        </div>
      ) : sigs.map(sig => (
        <div key={sig.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 7, background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="signature" size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 7 }}>
              {sig.name}
              {sig.is_default && <span style={{ fontSize: 10, background: "var(--accent-bg)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4 }}>{t("signatures.badge.default")}</span>}
              {sig.designer_json && <span style={{ fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 6px", borderRadius: 4 }}>{t("signatures.badge.designer")}</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2, fontFamily: "monospace" }}>{sig.html_content?.substring(0, 60)}…</div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <button style={{ ...btnPrimary, padding: "6px 12px", fontSize: 12 }} onClick={() => setDesigner(sig)}>
              <Icon name="wand" size={13} /> {t("signatures.btnDesigner")}
            </button>
            <button style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12 }} onClick={() => exportOne(sig)}>
              <Icon name="download" size={13} /> {t("signatures.btnExport")}
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
  const { t } = useI18n();
  const [rules, setRules] = useState([]);
  const [sigs, setSigs] = useState([]);
  const EMPTY = { name: "", match_sender: "", match_domain: "", apply_on_new: true, apply_on_reply: false, signature_id: "", ci_config_id: "", smtp_account_id: "", disclaimer_id: "", priority: 100, is_active: true, recipient_scope: "all", match_recipient: "", match_recipient_domain: "", time_from: "", time_until: "", days_of_week: "", forward_to: "" };
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
  const [smtpAccounts, setSmtpAccounts] = useState([]);
  const [disclaimers, setDisclaimers] = useState([]);

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
    setInternalDomains(dom); setInternalDomainsSaved(dom);
    const tz = settings?.timezone || "";
    setTimezone(tz); setTimezoneSaved(tz);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setEditingId("new"); }
  function openEdit(rule) {
    setForm({ name: rule.name, match_sender: rule.match_sender || "", match_domain: rule.match_domain || "", apply_on_new: rule.apply_on_new, apply_on_reply: rule.apply_on_reply, signature_id: rule.signature_id || "", ci_config_id: rule.ci_config_id || "", smtp_account_id: rule.smtp_account_id || "", disclaimer_id: rule.disclaimer_id || "", priority: rule.priority, is_active: rule.is_active, recipient_scope: rule.recipient_scope || "all", match_recipient: rule.match_recipient || "", match_recipient_domain: rule.match_recipient_domain || "", time_from: rule.time_from || "", time_until: rule.time_until || "", days_of_week: rule.days_of_week || "", forward_to: rule.forward_to || "" });
    setEditingId(rule.id);
  }
  function closeForm() { setEditingId(null); setForm(EMPTY); }

  async function save() {
    const payload = { ...form, match_sender: form.match_sender || null, match_domain: form.match_domain || null, signature_id: parseInt(form.signature_id), ci_config_id: form.ci_config_id ? parseInt(form.ci_config_id) : null, smtp_account_id: form.smtp_account_id ? parseInt(form.smtp_account_id) : null, disclaimer_id: form.disclaimer_id ? parseInt(form.disclaimer_id) : null, enrichment_source: null, template_id: null, recipient_scope: form.recipient_scope || "all", match_recipient: form.match_recipient || null, match_recipient_domain: form.match_recipient_domain || null, time_from: form.time_from || null, time_until: form.time_until || null, days_of_week: form.days_of_week || null, forward_to: form.forward_to || null };
    try {
      if (editingId === "new") { await api("POST", "/api/rules/", payload); toast("ok", t("rules.toast.created")); }
      else { await api("PUT", `/api/rules/${editingId}`, payload); toast("ok", t("rules.toast.saved")); }
      closeForm(); load();
    } catch { toast("err", t("rules.toast.saveError")); }
  }

  async function del(id) { await api("DELETE", `/api/rules/${id}`); toast("ok", t("rules.toast.deleted")); load(); }

  async function togglePoweredBy() {
    if (isFree) { toast("err", t("rules.toast.freeLicense")); return; }
    const newVal = poweredBy ? "false" : "true";
    const r = await api("PUT", "/api/settings/powered-by", { value: newVal });
    if (r.powered_by_enabled !== undefined) {
      setPoweredBy(r.powered_by_enabled !== "false");
      toast("ok", t("rules.toast.settingsSaved"));
    } else {
      toast("err", r.detail || t("rules.toast.saveError"));
    }
  }

  async function saveInternalDomains() {
    await api("PUT", "/api/settings/internal_domains", { value: internalDomains });
    setInternalDomainsSaved(internalDomains);
    toast("ok", t("rules.toast.internalDomainsSaved"));
  }

  async function saveTimezone() {
    await api("PUT", "/api/settings/timezone", { value: timezone });
    setTimezoneSaved(timezone);
    toast("ok", t("rules.toast.timezoneSaved"));
  }

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("rules.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("rules.subtitle")}</p>
        </div>
        <button style={btnPrimary} onClick={editingId ? closeForm : openNew}>
          <Icon name={editingId ? "x" : "plus"} size={15} />
          {editingId ? t("rules.btnCancel") : t("rules.btnNew")}
        </button>
      </div>

      {/* Powered-by Branding */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="badge" size={14} style={{ color: "var(--accent)" }} />
            {t("rules.poweredBy.title")}
            {isFree && <span style={{ fontSize: 10, background: "var(--accent-bg2)", color: "var(--accent)", border: "1px solid var(--accent-bd)", padding: "1px 7px", borderRadius: 20 }}>{t("rules.poweredBy.badgeFree")}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-5)", lineHeight: "17px" }}>
            {t("rules.poweredBy.desc")}
            {isFree && <span style={{ color: "var(--text-4)" }}> {t("rules.poweredBy.upgradeHint")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {isFree && <Icon name="lock" size={14} style={{ color: "var(--text-5)" }} />}
          <button onClick={togglePoweredBy} disabled={isFree}
            style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: isFree ? "not-allowed" : "pointer", background: poweredBy ? "var(--accent)" : "var(--border-3)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: poweredBy ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: poweredBy ? "var(--accent-fg)" : "var(--text-5)", transition: "left .2s" }} />
          </button>
          <span style={{ fontSize: 12, color: poweredBy ? "var(--accent)" : "var(--text-5)", minWidth: 22 }}>
            {poweredBy ? t("rules.poweredBy.on") : t("rules.poweredBy.off")}
          </span>
        </div>
      </div>

      {/* Regelengine-Einstellungen */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Icon name="settings" size={14} style={{ color: "var(--blue)" }} />
          {t("rules.settings.title")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-5)", marginBottom: 5 }}>
              {t("rules.settings.internalDomains")} <span style={{ color: "var(--text-7)" }}>({t("rules.settings.internalDomainsHint")})</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1, fontSize: 12 }} value={internalDomains} onChange={e => setInternalDomains(e.target.value)} placeholder="firma.de, tochter-gmbh.de" />
              <button style={{ ...btnPrimary, padding: "6px 10px", opacity: internalDomains === internalDomainsSaved ? 0.5 : 1 }} disabled={internalDomains === internalDomainsSaved} onClick={saveInternalDomains}>
                <Icon name="device-floppy" size={13} />
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-5)", marginBottom: 5 }}>
              {t("rules.settings.timezone")} <span style={{ color: "var(--text-7)" }}>({t("rules.settings.timezoneHint")})</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...inputStyle, flex: 1, fontSize: 12 }} value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Europe/Berlin" />
              <button style={{ ...btnPrimary, padding: "6px 10px", opacity: timezone === timezoneSaved ? 0.5 : 1 }} disabled={timezone === timezoneSaved} onClick={saveTimezone}>
                <Icon name="device-floppy" size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <InfoBanner icon="info-circle" color="var(--blue)"
        title={t("rules.info.title")} text={t("rules.info.text")} />

      {editingId !== null && (
        <Card title={editingId === "new" ? t("rules.form.titleNew") : t("rules.form.titleEdit")} icon="filter">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("rules.form.name")}>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("rules.form.namePlaceholder")} />
            </Field>
            <Field label={t("rules.form.priority")} hint={t("rules.form.priorityHint")}>
              <input style={inputStyle} type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} />
            </Field>
            <Field label={t("rules.form.sender")} hint={t("rules.form.senderHint")}>
              <input style={inputStyle} value={form.match_sender} onChange={e => setForm(f => ({ ...f, match_sender: e.target.value }))} placeholder={t("rules.form.senderPlaceholder")} />
            </Field>
            <Field label={t("rules.form.domain")} hint={t("rules.form.domainHint")}>
              <input style={inputStyle} value={form.match_domain} onChange={e => setForm(f => ({ ...f, match_domain: e.target.value }))} placeholder={t("rules.form.domainPlaceholder")} />
            </Field>
            <Field label={t("rules.form.signature")}>
              <select style={inputStyle} value={form.signature_id} onChange={e => setForm(f => ({ ...f, signature_id: e.target.value }))}>
                <option value="">{t("rules.form.signatureEmpty")}</option>
                {sigs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label={t("rules.form.ciProfile")} hint={t("rules.form.ciProfileHint")}>
              <select style={inputStyle} value={form.ci_config_id} onChange={e => setForm(f => ({ ...f, ci_config_id: e.target.value }))}>
                <option value="">{t("rules.form.ciProfileEmpty")}</option>
                {cis.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t("rules.form.smtpAccount")} hint={t("rules.form.smtpAccountHint")}>
              <select style={inputStyle} value={form.smtp_account_id} onChange={e => setForm(f => ({ ...f, smtp_account_id: e.target.value }))}>
                <option value="">{t("rules.form.smtpAccountEmpty")}</option>
                {smtpAccounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.match_domain ? ` (@${a.match_domain})` : ` (${t("rules.form.smtpAccountDefault")})`}</option>)}
              </select>
            </Field>
            <Field label={t("rules.form.disclaimer")} hint={t("rules.form.disclaimerHint")}>
              <select style={inputStyle} value={form.disclaimer_id} onChange={e => setForm(f => ({ ...f, disclaimer_id: e.target.value }))}>
                <option value="">{t("rules.form.disclaimerEmpty")}</option>
                {disclaimers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label={t("rules.form.recipientScope")} hint={t("rules.form.recipientScopeHint")}>
              <select style={inputStyle} value={form.recipient_scope} onChange={e => setForm(f => ({ ...f, recipient_scope: e.target.value }))}>
                <option value="all">{t("rules.form.scopeAll")}</option>
                <option value="external_only">{t("rules.form.scopeExternal")}</option>
                <option value="internal_only">{t("rules.form.scopeInternal")}</option>
              </select>
            </Field>
            <Field label={t("rules.form.recipient")} hint={t("rules.form.recipientHint")}>
              <input style={inputStyle} value={form.match_recipient} onChange={e => setForm(f => ({ ...f, match_recipient: e.target.value }))} placeholder={t("rules.form.recipientPlaceholder")} />
            </Field>
            <Field label={t("rules.form.recipientDomain")} hint={t("rules.form.recipientHint")}>
              <input style={inputStyle} value={form.match_recipient_domain} onChange={e => setForm(f => ({ ...f, match_recipient_domain: e.target.value }))} placeholder={t("rules.form.recipientDomainPlaceholder")} />
            </Field>
          </div>

          {/* Zeitbasierte Einschränkungen */}
          <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border-1)" }}>
            <div style={{ fontSize: 11, color: "var(--text-6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              {t("rules.form.timeBased")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("rules.form.timeFrom")} hint={t("rules.form.timeHint")}>
                <input style={inputStyle} type="time" value={form.time_from} onChange={e => setForm(f => ({ ...f, time_from: e.target.value }))} />
              </Field>
              <Field label={t("rules.form.timeTo")} hint={t("rules.form.timeHint")}>
                <input style={inputStyle} type="time" value={form.time_until} onChange={e => setForm(f => ({ ...f, time_until: e.target.value }))} />
              </Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "var(--text-5)", marginBottom: 6 }}>
                {t("rules.form.weekdays")} <span style={{ color: "var(--text-7)" }}>({t("rules.form.weekdaysHint")})</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[0,1,2,3,4,5,6].map(val => {
                  const active = (form.days_of_week || "").split(",").map(s => s.trim()).includes(String(val));
                  return (
                    <button key={val} type="button"
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid", fontSize: 12, cursor: "pointer", transition: "all .15s",
                        background: active ? "var(--blue-bg)" : "var(--bg-input)",
                        color: active ? "var(--blue)" : "var(--text-6)",
                        borderColor: active ? "var(--blue-bd)" : "var(--border-2)" }}
                      onClick={() => {
                        const cur = (form.days_of_week || "").split(",").map(s => s.trim()).filter(Boolean);
                        const next = active ? cur.filter(d => d !== String(val)) : [...cur, String(val)].sort();
                        setForm(f => ({ ...f, days_of_week: next.join(",") }));
                      }}
                    >{t(`rules.wd.${val}`)}</button>
                  );
                })}
                {form.days_of_week && (
                  <button type="button" style={{ fontSize: 11, color: "var(--text-6)", background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => setForm(f => ({ ...f, days_of_week: "" }))}>
                    {t("rules.form.weekAll")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Weiterleitung */}
          <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border-1)" }}>
            <div style={{ fontSize: 11, color: "var(--text-6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              {t("rules.form.forwardSection")}
            </div>
            <Field label={t("rules.form.forwardTo")} hint={t("rules.form.forwardHint")}>
              <input style={inputStyle} value={form.forward_to} onChange={e => setForm(f => ({ ...f, forward_to: e.target.value }))} placeholder={t("rules.form.forwardPlaceholder")} />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {[["apply_on_new", t("rules.form.applyNew")], ["apply_on_reply", t("rules.form.applyReply")], ["is_active", t("rules.form.active")]].map(([k, l]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-3)", cursor: "pointer" }}>
                <input type="checkbox" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />{l}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button style={btnPrimary} onClick={save}><Icon name="device-floppy" size={15} />{t("rules.form.save")}</button>
            <button style={btnSecondary} onClick={closeForm}>{t("rules.btnCancel")}</button>
          </div>
        </Card>
      )}

      {rules.filter(r => !r.template_id).length === 0 && editingId === null ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
          <Icon name="filter" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>{t("rules.list.empty")}</div>
        </div>
      ) : rules.filter(r => !r.template_id).map(rule => {
        const sig     = sigs.find(s => s.id === rule.signature_id);
        const smtpAcc = smtpAccounts.find(a => a.id === rule.smtp_account_id);
        return (
          <div key={rule.id} style={{ background: "var(--bg-card)", border: `1px solid ${editingId === rule.id ? "var(--accent)" : "var(--border-2)"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 7, display: "flex", alignItems: "center", gap: 12, opacity: rule.is_active ? 1 : 0.5 }}>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--text-5)" }}>{rule.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{rule.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>{rule.match_sender || rule.match_domain ? `${rule.match_sender || "*"}@${rule.match_domain || "*"}` : t("rules.list.allSenders")}</span>
                <span style={{ color: "var(--text-7)" }}>→</span>
                <span style={{ color: "var(--text-2)" }}>{sig?.name || "—"}</span>
                <span style={{ color: "var(--text-6)" }}>{[rule.apply_on_new && t("rules.form.applyNew"), rule.apply_on_reply && t("rules.form.applyReply")].filter(Boolean).join(" + ")}</span>
                {rule.ci_config_id && <span style={{ background: "var(--green-bg)", color: "var(--green)", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>CI</span>}
                {smtpAcc && <span style={{ background: "var(--blue-bg)", color: "var(--blue)", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{smtpAcc.name}</span>}
                {rule.recipient_scope === "external_only" && <span style={{ background: "var(--purple-bg)", color: "var(--purple)", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{t("rules.badge.extern")}</span>}
                {rule.recipient_scope === "internal_only" && <span style={{ background: "var(--teal-bg)", color: "var(--teal)", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{t("rules.badge.intern")}</span>}
                {rule.match_recipient && <span style={{ background: "var(--bg-input)", color: "var(--pink)", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>→{rule.match_recipient}</span>}
                {rule.match_recipient_domain && !rule.match_recipient && <span style={{ background: "var(--bg-input)", color: "var(--pink)", fontSize: 10, padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>→@{rule.match_recipient_domain}</span>}
                {(rule.time_from || rule.time_until) && <span style={{ background: "var(--bg-input)", color: "var(--yellow)", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{rule.time_from || "00:00"}–{rule.time_until || "24:00"}</span>}
                {rule.days_of_week && <span style={{ background: "var(--bg-input)", color: "var(--yellow)", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{rule.days_of_week.split(",").map(d => t(`rules.wd.${d.trim()}`) || d).join(" ")}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => openEdit(rule)}><Icon name="edit" size={13} />{t("common.edit")}</button>
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
  const { t } = useI18n();
  const [rules, setRules] = useState([]);
  const [tmpls, setTmpls] = useState([]);
  const EMPTY = { name: "", match_sender: "", match_domain: "", apply_on_new: true, apply_on_reply: false, template_id: "", enrichment_source: "lexware", priority: 50, is_active: true };
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [r, tl] = await Promise.all([api("GET", "/api/rules/"), api("GET", "/api/templates/")]);
    setRules(r); setTmpls(tl); setLoading(false);
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
      if (editingId === "new") { await api("POST", "/api/rules/", payload); toast("ok", t("trules.toast.created")); }
      else { await api("PUT", `/api/rules/${editingId}`, payload); toast("ok", t("trules.toast.saved")); }
      closeForm(); load();
    } catch { toast("err", t("trules.toast.saveError")); }
  }

  async function del(id) { await api("DELETE", `/api/rules/${id}`); toast("ok", t("trules.toast.deleted")); load(); }

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  const tmplRules = rules.filter(r => r.template_id);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("trules.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("trules.subtitle")}</p>
        </div>
        <button style={btnPrimary} onClick={editingId ? closeForm : () => { setForm(EMPTY); setEditingId("new"); }}>
          <Icon name={editingId ? "x" : "plus"} size={15} />
          {editingId ? t("rules.btnCancel") : t("trules.btnNew")}
        </button>
      </div>

      <InfoBanner icon="git-branch" color="var(--accent)"
        title={t("trules.info.title")} text={t("trules.info.text")} />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { icon: "mail",     color: "var(--blue)",   label: t("trules.step1.label"), text: t("trules.step1.text") },
          { icon: "database", color: "var(--accent)",  label: t("trules.step2.label"), text: t("trules.step2.text") },
          { icon: "send",     color: "var(--green)",   label: t("trules.step3.label"), text: t("trules.step3.text") },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={s.icon} size={14} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2 }}>{s.text}</div>
            </div>
          </div>
        ))}
      </div>

      {tmpls.length === 0 && (
        <div style={{ padding: "12px 14px", background: "var(--accent-bg2)", border: "1px solid var(--accent-bd)", borderRadius: 8, fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
          <Icon name="alert-triangle" size={13} style={{ color: "var(--accent)", marginRight: 6 }} />
          {t("trules.noTemplatesWarning")}
        </div>
      )}

      {editingId !== null && (
        <Card title={editingId === "new" ? t("trules.form.titleNew") : t("trules.form.titleEdit")} icon="git-branch">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("rules.form.name")}>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Lexware Angebote" />
            </Field>
            <Field label={t("rules.form.priority")}>
              <input style={inputStyle} type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} />
            </Field>
            <Field label={t("rules.form.sender")} hint={t("rules.form.senderHint")}>
              <input style={inputStyle} value={form.match_sender} onChange={e => setForm(f => ({ ...f, match_sender: e.target.value }))} placeholder="z.B. lexware@firma.de" />
            </Field>
            <Field label={t("rules.form.domain")} hint={t("rules.form.domainHint")}>
              <input style={inputStyle} value={form.match_domain} onChange={e => setForm(f => ({ ...f, match_domain: e.target.value }))} placeholder="z.B. holdermann.de" />
            </Field>
            <Field label={t("trules.form.template")}>
              <select style={inputStyle} value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}>
                <option value="">{t("trules.form.templateEmpty")}</option>
                {tmpls.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
              </select>
            </Field>
            <Field label={t("trules.form.dataSource")}>
              <select style={inputStyle} value={form.enrichment_source} onChange={e => setForm(f => ({ ...f, enrichment_source: e.target.value }))}>
                <option value="lexware">{t("trules.form.sourceLexware")}</option>
                <option value="jtl">{t("trules.form.sourceJtl")}</option>
                <option value="">{t("trules.form.sourceNone")}</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <button style={btnPrimary} onClick={save}><Icon name="device-floppy" size={15} />{t("rules.form.save")}</button>
            <button style={btnSecondary} onClick={closeForm}>{t("rules.btnCancel")}</button>
          </div>
        </Card>
      )}

      {tmplRules.length === 0 && editingId === null ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
          <Icon name="git-branch" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>{t("trules.list.empty")}</div>
        </div>
      ) : tmplRules.map(rule => {
        const tmpl = tmpls.find(tl => tl.id === rule.template_id);
        return (
          <div key={rule.id} style={{ background: "var(--bg-card)", border: `1px solid ${editingId === rule.id ? "var(--accent)" : "var(--border-2)"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 7, display: "flex", alignItems: "center", gap: 12, opacity: rule.is_active ? 1 : 0.5 }}>
            <div style={{ width: 26, height: 26, borderRadius: 5, background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--text-5)" }}>{rule.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 7 }}>
                {rule.name}
                {rule.enrichment_source && <span style={{ fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 6px", borderRadius: 4 }}>{rule.enrichment_source.toUpperCase()}</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2, display: "flex", gap: 10 }}>
                <span>{rule.match_sender || rule.match_domain ? `${rule.match_sender || "*"}@${rule.match_domain || "*"}` : t("rules.list.allSenders")}</span>
                <span style={{ color: "var(--text-7)" }}>→</span>
                <span style={{ color: "var(--accent)" }}>{tmpl?.name || "—"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btnSecondary, padding: "6px 12px", fontSize: 12 }} onClick={() => openEdit(rule)}><Icon name="edit" size={13} />{t("common.edit")}</button>
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
  const { t } = useI18n();
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
      setResult(r); toast(r.ok ? "ok" : "err", r.ok ? t("test.sendTest.success") : r.error);
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("test.title")}</h1>
        <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>{t("test.subtitle")}</p>
      </div>
      <Card title={t("test.sendTest.title")} icon="send">
        <Field label={t("test.sendTest.recipient")}>
          <input style={inputStyle} type="email" value={toAddr} onChange={e => setToAddr(e.target.value)} placeholder="test@example.com" />
        </Field>
        <button style={btnPrimary} onClick={sendTest} disabled={sending || !toAddr}>
          <Icon name={sending ? "loader" : "send"} size={15} />
          {sending ? t("test.sendTest.btnSending") : t("test.sendTest.btnSend")}
        </button>
        {result && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: result.ok ? "var(--green-bg)" : "var(--red-bg)", border: `1px solid ${result.ok ? "var(--green-bd)" : "var(--red-bd)"}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: result.ok ? "var(--green)" : "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name={result.ok ? "circle-check" : "circle-x"} size={15} />
              {result.ok ? result.message : t("test.sendTest.error")}
            </div>
            {!result.ok && <div style={{ fontSize: 12, color: "var(--red-s)", marginTop: 5, fontFamily: "monospace" }}>{result.error}</div>}
          </div>
        )}
      </Card>
      <Card title={t("test.ruleTest.title")} icon="filter">
        <Field label={t("test.ruleTest.sender")}>
          <input style={inputStyle} value={matchTest.sender} onChange={e => setMatchTest(m => ({ ...m, sender: e.target.value }))} placeholder="max@holdermann.de" />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)", cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={matchTest.is_reply} onChange={e => setMatchTest(m => ({ ...m, is_reply: e.target.checked }))} />
          {t("test.ruleTest.isReply")}
        </label>
        <button style={btnPrimary} onClick={testMatch} disabled={!matchTest.sender}>
          <Icon name="search" size={15} />{t("test.ruleTest.btn")}
        </button>
        {matchResult !== null && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: matchResult ? "var(--blue-bg)" : "var(--bg-input)", border: `1px solid ${matchResult ? "var(--blue-bd)" : "var(--border-2)"}` }}>
            {matchResult ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="circle-check" size={15} />{t("test.ruleTest.hit", { id: matchResult.rule_id })}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-5)", marginTop: 6 }}>
                  <span style={{ color: "var(--text-3)" }}>{t("test.ruleTest.signature")} </span>
                  <span style={{ color: "var(--accent)" }}>{matchResult.signature?.name || "—"}</span>
                  {matchResult.enrichment_source && <span style={{ marginLeft: 10, color: "var(--green)" }}>+ {matchResult.enrichment_source}</span>}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-6)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="circle-x" size={15} />{t("test.ruleTest.noHit")}
              </div>
            )}
          </div>
        )}
      </Card>
      <Card title={t("test.proxy.title")} icon="activity">
        <div style={{ display: "flex", gap: 12 }}>
          {[{ label: t("test.proxy.backend"), port: "8001", url: "/health" }, { label: t("test.proxy.smtp"), port: "2587", url: null }].map(s => (
            <div key={s.label} style={{ flex: 1, background: "var(--bg-page)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "11px 13px" }}>
              <div style={{ fontSize: 11, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{s.label}</div>
              <div style={{ fontSize: 13, color: "var(--text-4)", marginTop: 4, fontFamily: "monospace" }}>:{s.port}</div>
              {s.url && (
                <button onClick={async () => {
                  try { const r = await fetch(`http://localhost:${s.port}${s.url}`); const d = await r.json(); alert(JSON.stringify(d)); }
                  catch(e) { alert(t("test.proxy.unreachable", { err: String(e) })); }
                }} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 11, marginTop: 7 }}>{t("test.proxy.ping")}</button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Locked Feature Screen ────────────────────────────────────────────────────
function LockedFeaturePage({ featureId, onGoLicense }) {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center", padding: "60px 40px" }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: "var(--bg-card)", border: "1px solid var(--border-2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Icon name="lock" size={32} style={{ color: "var(--text-6)" }} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>
        {t("license.lockedTitle")}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-5)", maxWidth: 420, lineHeight: "20px", marginBottom: 8 }}>
        {t("license.lockedText")}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-6)", fontFamily: "monospace", background: "var(--bg-input)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "4px 10px", marginBottom: 24 }}>
        {featureId}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onGoLicense}
          style={{ padding: "10px 20px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="key" size={15} />{t("license.lockedCta")}
        </button>
        <a href="https://monstersuite.de" target="_blank" rel="noopener noreferrer"
          style={{ padding: "10px 20px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Icon name="external-link" size={14} />monstersuite.de
        </a>
      </div>
    </div>
  );
}

// ─── Lazy-loaded page wrappers ────────────────────────────────────────────────
const TemplatesPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/TemplatesPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loadingTemplates")}</div>;
  return <Comp toast={toast} />;
};

const SendersPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SendersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const CIPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/CIPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const LicensePageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/LicensePage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const UpdatePageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/UpdatePage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const LogsPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/LogsPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const SMTPUsersLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SMTPUsersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const UsersManagementLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/UsersManagementPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const DisclaimersPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/DisclaimersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const BannersPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/BannersPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const MailQueuePageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/MailQueuePage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const AddonPageLoader = () => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/AddonPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp />;
};

const MailLogPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/MailLogPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const CampaignsPageLoader = ({ toast }) => {
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/CampaignsPage.jsx").then(m => setComp(() => m.default)); }, []);
  return Comp ? <Comp toast={toast} /> : null;
};

const ImagesPageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/ImagesPage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

const SelfServicePageLoader = ({ toast }) => {
  const { t } = useI18n();
  const [Comp, setComp] = useState(null);
  useEffect(() => { import("./pages/SelfServicePage.jsx").then(m => setComp(() => m.default)); }, []);
  if (!Comp) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;
  return <Comp toast={toast} />;
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("smtp");
  const [toasts, setToasts] = useState([]);
  const [activeFeatures, setActiveFeatures] = useState(FREE_FEATURES);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sm_user")); } catch { return null; }
  });

  useEffect(() => {
    if (!user) return;
    api("GET", "/api/license/").then(d => {
      setActiveFeatures(new Set(d.active_features || [...FREE_FEATURES]));
    }).catch(() => {});
  }, [user]);

  function toast(type, msg) {
    const id = Date.now();
    setToasts(t => [...t, { id, type, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function handleLogin(u) { setUser(u); }

  function handleLogout() {
    localStorage.removeItem("sm_token");
    localStorage.removeItem("sm_user");
    setUser(null);
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const isFullWidth = ["templates","signatures","senders","banners","disclaimers","logs","images","campaigns","maillog","mailqueue"].includes(page);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-page)", color: "var(--text-2)" }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        input:focus, select:focus, textarea:focus { border-color: var(--accent) !important; outline: none; }
        button:disabled { opacity: .5; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--bg-nav); }
        ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
      `}</style>
      <Nav page={page} setPage={setPage} user={user} onLogout={handleLogout} activeFeatures={activeFeatures} />
      <main style={{ flex: 1, padding: isFullWidth ? "28px 32px" : "32px 40px", maxWidth: isFullWidth ? "none" : 800, overflowY: "auto", overflowX: "hidden" }}>
        {(() => {
          const requiredFeature = PAGE_FEATURE[page];
          if (requiredFeature && !activeFeatures.has(requiredFeature)) {
            return <LockedFeaturePage featureId={requiredFeature} onGoLicense={() => setPage("license")} />;
          }
          return (
            <>
              {page === "smtp"        && <SMTPPage toast={toast} />}
              {page === "senders"     && <SendersPageLoader toast={toast} />}
              {page === "signatures"  && <SignaturesPage toast={toast} />}
              {page === "rules"       && <RulesPage toast={toast} />}
              {page === "trules"      && <TemplateRulesPage toast={toast} />}
              {page === "test"        && <TestPage toast={toast} />}
              {page === "templates"   && <TemplatesPageLoader toast={toast} />}
              {page === "ci"          && <CIPageLoader toast={toast} />}
              {page === "smtp-users"  && <SMTPUsersLoader toast={toast} />}
              {page === "update"      && <UpdatePageLoader toast={toast} />}
              {page === "admin-users" && <UsersManagementLoader toast={toast} />}
              {page === "license"     && <LicensePageLoader toast={toast} />}
              {page === "disclaimers" && <DisclaimersPageLoader toast={toast} />}
              {page === "banners"     && <BannersPageLoader toast={toast} />}
              {page === "logs"        && <LogsPageLoader toast={toast} />}
              {page === "images"      && <ImagesPageLoader toast={toast} />}
              {page === "campaigns"   && <CampaignsPageLoader toast={toast} />}
              {page === "maillog"     && <MailLogPageLoader toast={toast} />}
              {page === "mailqueue"   && <MailQueuePageLoader toast={toast} />}
              {page === "addon"       && <AddonPageLoader />}
              {page === "self-service" && <SelfServicePageLoader toast={toast} />}
            </>
          );
        })()}
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}
