import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../AppContext.jsx";

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;

const STATUS_CONFIG = {
  free:          { color: "#6b7280", bg: "var(--bg-input)", border: "var(--border-3)", icon: "lock-open",         label: "license.statusFree" },
  active:        { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-bd)", icon: "shield-check",       label: "license.statusActive" },
  grace:         { color: "var(--accent)", bg: "var(--accent-bg2)", border: "var(--accent-bd)", icon: "shield-exclamation", label: "license.statusGrace" },
  grace_expired: { color: "var(--red-s)", bg: "var(--red-bg)", border: "var(--red-bd)", icon: "shield-x",           label: "license.statusGraceExpired" },
  expired:       { color: "var(--red-s)", bg: "var(--red-bg)", border: "var(--red-bd)", icon: "shield-x",           label: "license.statusExpired" },
  invalid:       { color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-bd)", icon: "shield-exclamation", label: "license.statusInvalid" },
};

const MODE_BADGE = {
  online:  { labelKey: "license.modeOnline",  color: "var(--green)", bg: "var(--green-bd)" },
  cached:  { labelKey: "license.modeCached",  color: "var(--blue)",  bg: "var(--blue-bd)" },
  grace:   { labelKey: "license.modeGrace",   color: "var(--accent)", bg: "var(--accent-bg)" },
  offline: { labelKey: "license.modeOffline", color: "var(--purple)", bg: "var(--purple-bg)" },
  none:    { labelKey: "license.modeNone",    color: "#6b7280", bg: "var(--bg-input)" },
};

const CATEGORY_ORDER = ["Konfiguration", "Signaturen", "Templates"];

function FeatureRow({ feature, active }) {
  const { t } = useI18n();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 16px",
      background: active ? "#0d1a10" : "var(--bg-card)",
      border: `1px solid ${active ? "#1a3a22" : "var(--border-2)"}`,
      borderRadius: 8, marginBottom: 6,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
        background: active ? "#1a3a22" : "var(--bg-hover)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={active ? "check" : (feature.free ? "check" : "lock")} size={15}
          style={{ color: active ? "var(--green)" : (feature.free ? "var(--green)" : "var(--text-6)") }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#d1fae5" : "var(--text-5)" }}>
          {feature.name}
        </div>
        <div style={{ fontSize: 11, color: active ? "#4a8a60" : "var(--text-7)", marginTop: 2 }}>
          {feature.description}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
        background: active ? "var(--green-bd)" : "var(--bg-hover)",
        color: active ? "var(--green)" : "var(--text-6)",
        border: `1px solid ${active ? "#065f46" : "var(--border-3)"}`,
        textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0,
      }}>
        {active ? (feature.free ? t("license.featureFree") : t("license.featureActive")) : t("license.featureLocked")}
      </div>
    </div>
  );
}

export default function LicensePage({ toast }) {
  const { t } = useI18n();
  const [license, setLicense]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail]         = useState("");
  const [key, setKey]             = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    const d = await api("GET", "/api/license/");
    setLicense(d);
    setEmail(d.email || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function activate() {
    if (!key.trim() || !email.trim()) { toast("err", t("license.activateRequired")); return; }
    setSaving(true);
    const r = await api("POST", "/api/license/activate", { key: key.trim(), email: email.trim() });
    if (r.ok) {
      toast("ok", `${t("license.activatedPlan")}: ${r.plan}${r.mode === "offline" ? ` (${t("license.modeOffline")})` : ""}`);
      setShowForm(false);
      setKey("");
      load();
    } else {
      toast("err", r.error || t("license.activationFailed"));
    }
    setSaving(false);
  }

  async function refresh() {
    setRefreshing(true);
    const r = await api("POST", "/api/license/refresh");
    if (r.ok) { toast("ok", t("license.refreshed")); load(); }
    else       { toast("err", r.error || t("license.serverUnreachable")); }
    setRefreshing(false);
  }

  async function deactivate() {
    const r = await api("DELETE", "/api/license/");
    if (r.ok) { toast("ok", t("license.removed")); load(); }
  }

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  const sc       = STATUS_CONFIG[license.status] || STATUS_CONFIG.free;
  const isActive = license.status === "active";
  const isGrace  = license.status === "grace";
  const hasFull  = isActive || isGrace;
  const activeSet = new Set(license.active_features || []);
  const modeBadge = MODE_BADGE[license._offline ? "offline" : license.validation_mode] || MODE_BADGE.none;

  const grouped = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = (license.features || []).filter(f => f.category === cat);
  }

  return (
    <div style={{ maxWidth: 760 }}>

      {/* Grace-Period-Warnung */}
      {isGrace && (
        <div style={{ padding: "12px 18px", background: "var(--accent-bg2)", border: "1px solid var(--accent-bd)", borderRadius: 10, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon name="alert-triangle" size={16} style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{t("license.graceTitle")}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, lineHeight: "18px" }}>
              {t("license.graceText")}
              {license.grace_remaining != null
                ? <strong style={{ color: "var(--accent)" }}> {license.grace_remaining} {t("license.graceDays")}</strong>
                : ` ${t("license.graceSomeDays")}`} {t("license.graceValid")}
              {t("license.graceServerExpected")} <strong style={{ color: "var(--accent)" }}>monstersuite.de</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Status-Banner */}
      <div style={{ padding: "20px 24px", background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: sc.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={sc.icon} size={24} style={{ color: sc.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: sc.color }}>{t(sc.label)}</div>
            <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: modeBadge.bg, color: modeBadge.color, border: `1px solid ${modeBadge.bg}`,
              textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t(modeBadge.labelKey)}
            </div>
          </div>
          {hasFull && (
            <div style={{ fontSize: 13, color: sc.color === "var(--green)" ? "#4a8a60" : "var(--text-3)", lineHeight: "20px" }}>
              {t("license.plan")}: <strong style={{ color: sc.color }}>{license.plan}</strong>
              {license.email && <> · {license.email}</>}
              {license.valid_until && <> · {t("license.validUntil")} <strong style={{ color: sc.color }}>{license.valid_until}</strong></>}
              {!license.valid_until && <> · {t("license.unlimited")}</>}
            </div>
          )}
          {license.status === "free" && (
            <div style={{ fontSize: 13, color: "var(--text-5)", marginTop: 3 }}>
              {activeSet.size} / {(license.features || []).length} {t("license.featuresActive")} —{" "}
              {t("license.buyAt")} <strong style={{ color: "var(--text-3)" }}> monstersuite.de</strong>
            </div>
          )}
          {license.last_check && (
            <div style={{ fontSize: 11, color: "var(--text-6)", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="clock" size={11} />
              {t("license.lastChecked")}: {license.last_check.replace("T", " ")}
            </div>
          )}
          {license.machine_id && (
            <div style={{ fontSize: 10, color: "var(--text-7)", marginTop: 3, fontFamily: "monospace" }}>
              Machine-ID: {license.machine_id}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {hasFull && (
            <button onClick={refresh} disabled={refreshing}
              style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 7, color: sc.color, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name={refreshing ? "loader" : "refresh"} size={12} />
              {refreshing ? t("license.checking") : t("license.checkNow")}
            </button>
          )}
          {hasFull ? (
            <>
              <button onClick={() => setShowForm(f => !f)}
                style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 7, color: sc.color, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="edit" size={12} />{t("license.change")}
              </button>
              <button onClick={deactivate}
                style={{ padding: "6px 12px", background: "transparent", border: "1px solid var(--red-bg)", borderRadius: 7, color: "var(--red-s)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="trash" size={12} />{t("license.remove")}
              </button>
            </>
          ) : (
            <button onClick={() => setShowForm(true)}
              style={{ padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="key" size={14} />{t("license.activate")}
            </button>
          )}
        </div>
      </div>

      {/* Aktivierungsformular */}
      {showForm && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--accent-bd)", borderRadius: 12, padding: "20px 22px", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{t("license.activate")}</div>
          <div style={{ fontSize: 12, color: "var(--text-5)", marginBottom: 16 }}>
            {t("license.manageAt")} <strong style={{ color: "var(--text-3)" }}>monstersuite.de</strong>.{" "}
            {t("license.activationOnline")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>{t("license.emailLabel")}</label>
              <input
                style={{ width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--text-3)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de"
              />
            </div>
            <div />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>{t("license.keyLabel")}</label>
            <textarea rows={3}
              style={{ width: "100%", padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 8, color: "var(--green)", fontSize: 11, outline: "none", boxSizing: "border-box", fontFamily: "monospace", resize: "vertical" }}
              value={key} onChange={e => setKey(e.target.value)} placeholder={t("license.keyPlaceholder")}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={activate} disabled={saving}
              style={{ padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
              <Icon name="key" size={14} />{saving ? t("license.activating") : t("license.activate")}
            </button>
            <button onClick={() => { setShowForm(false); setKey(""); }}
              style={{ padding: "9px 18px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Feature-Übersicht */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="layout-grid" size={16} style={{ color: "var(--accent)" }} />
        {t("license.featureOverview")}
        <span style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 400 }}>
          {activeSet.size} / {(license.features || []).length} {t("license.active")}
        </span>
      </div>

      {CATEGORY_ORDER.map(cat => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>{cat}</div>
          {(grouped[cat] || []).map(f => (
            <FeatureRow key={f.id} feature={f} active={activeSet.has(f.id)} />
          ))}
        </div>
      ))}

      {/* Info */}
      <div style={{ marginTop: 8, padding: "14px 18px", background: "var(--bg-input)", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 12, color: "var(--text-5)", lineHeight: "19px" }}>
        <Icon name="info-circle" size={13} style={{ color: "var(--accent)", marginRight: 6 }} />
        {t("license.infoText")} <strong style={{ color: "var(--text-3)" }}>monstersuite.de</strong>.{" "}
        {t("license.infoGrace")}
      </div>
    </div>
  );
}
