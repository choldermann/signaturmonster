import React, { useState, useEffect, useCallback } from "react";

async function api(method, path, body) {
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const Icon = ({ name, size = 16, style = {} }) => <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />;

const STATUS_CONFIG = {
  free:          { color: "#6b7280", bg: "#1a1a1a", border: "#2a2a2a", icon: "lock-open",         label: "Kostenlose Version" },
  active:        { color: "#6ee7b7", bg: "#0a1f14", border: "#064e3b", icon: "shield-check",       label: "Lizenz aktiv" },
  grace:         { color: "#fce499", bg: "#1a1500", border: "#3a2a00", icon: "shield-exclamation", label: "Grace Period — Server nicht erreichbar" },
  grace_expired: { color: "#f87171", bg: "#1f0a0a", border: "#7f1d1d", icon: "shield-x",           label: "Grace Period abgelaufen" },
  expired:       { color: "#f87171", bg: "#1f0a0a", border: "#7f1d1d", icon: "shield-x",           label: "Lizenz abgelaufen" },
  invalid:       { color: "#fca5a5", bg: "#1f0a0a", border: "#7f1d1d", icon: "shield-exclamation", label: "Ungültige Lizenz" },
};

const MODE_BADGE = {
  online:  { label: "Online geprüft",    color: "#6ee7b7", bg: "#064e3b" },
  cached:  { label: "Aus Cache",         color: "#93c5fd", bg: "#1e3a5f" },
  grace:   { label: "Grace Period",      color: "#fce499", bg: "#3a2a00" },
  offline: { label: "Offline-Key (Dev)", color: "#a78bfa", bg: "#2e1065" },
  none:    { label: "Kostenlos",         color: "#6b7280", bg: "#1a1a1a" },
};

const CATEGORY_ORDER = ["Konfiguration", "Signaturen", "Templates"];

function FeatureRow({ feature, active }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 16px",
      background: active ? "#0d1a10" : "#161616",
      border: `1px solid ${active ? "#1a3a22" : "#222"}`,
      borderRadius: 8, marginBottom: 6,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
        background: active ? "#1a3a22" : "#1e1e1e",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={active ? "check" : (feature.free ? "check" : "lock")} size={15}
          style={{ color: active ? "#6ee7b7" : (feature.free ? "#6ee7b7" : "#444") }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#d1fae5" : "#555" }}>
          {feature.name}
        </div>
        <div style={{ fontSize: 11, color: active ? "#4a8a60" : "#333", marginTop: 2 }}>
          {feature.description}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
        background: active ? "#064e3b" : "#1e1e1e",
        color: active ? "#6ee7b7" : "#444",
        border: `1px solid ${active ? "#065f46" : "#2a2a2a"}`,
        textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0,
      }}>
        {active ? (feature.free ? "Kostenlos" : "Aktiv") : "Gesperrt"}
      </div>
    </div>
  );
}

export default function LicensePage({ toast }) {
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
    if (!key.trim() || !email.trim()) { toast("err", "Bitte E-Mail und Lizenzschlüssel eingeben"); return; }
    setSaving(true);
    const r = await api("POST", "/api/license/activate", { key: key.trim(), email: email.trim() });
    if (r.ok) {
      toast("ok", `Lizenz aktiviert — Plan: ${r.plan}${r.mode === "offline" ? " (Offline-Key)" : ""}`);
      setShowForm(false);
      setKey("");
      load();
    } else {
      toast("err", r.error || "Aktivierung fehlgeschlagen");
    }
    setSaving(false);
  }

  async function refresh() {
    setRefreshing(true);
    const r = await api("POST", "/api/license/refresh");
    if (r.ok) { toast("ok", "Lizenz erfolgreich aktualisiert"); load(); }
    else       { toast("err", r.error || "Server nicht erreichbar"); }
    setRefreshing(false);
  }

  async function deactivate() {
    const r = await api("DELETE", "/api/license/");
    if (r.ok) { toast("ok", "Lizenz entfernt"); load(); }
  }

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade…</div>;

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
        <div style={{ padding: "12px 18px", background: "#1a1500", border: "1px solid #3a2a00", borderRadius: 10, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon name="alert-triangle" size={16} style={{ color: "#fce499", marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fce499" }}>Lizenzserver nicht erreichbar</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 3, lineHeight: "18px" }}>
              Signaturmonster läuft im Grace-Period-Modus. Die zwischengespeicherte Lizenz bleibt noch
              {license.grace_remaining != null
                ? <strong style={{ color: "#fce499" }}> {license.grace_remaining} Tage</strong>
                : " einige Tage"} gültig.
              Der Server wird unter <strong style={{ color: "#fce499" }}>monstersuite.de</strong> erwartet.
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
            <div style={{ fontSize: 16, fontWeight: 700, color: sc.color }}>{sc.label}</div>
            <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: modeBadge.bg, color: modeBadge.color, border: `1px solid ${modeBadge.bg}`,
              textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {modeBadge.label}
            </div>
          </div>
          {hasFull && (
            <div style={{ fontSize: 13, color: sc.color === "#6ee7b7" ? "#4a8a60" : "#888", lineHeight: "20px" }}>
              Plan: <strong style={{ color: sc.color }}>{license.plan}</strong>
              {license.email && <> · {license.email}</>}
              {license.valid_until && <> · Gültig bis <strong style={{ color: sc.color }}>{license.valid_until}</strong></>}
              {!license.valid_until && <> · Unbegrenzte Laufzeit</>}
            </div>
          )}
          {license.status === "free" && (
            <div style={{ fontSize: 13, color: "#555", marginTop: 3 }}>
              {activeSet.size} / {(license.features || []).length} Features aktiv — Lizenz über
              <strong style={{ color: "#888" }}> monstersuite.de</strong> erwerben
            </div>
          )}
          {license.last_check && (
            <div style={{ fontSize: 11, color: "#444", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="clock" size={11} />
              Zuletzt geprüft: {license.last_check.replace("T", " ")}
            </div>
          )}
          {license.machine_id && (
            <div style={{ fontSize: 10, color: "#333", marginTop: 3, fontFamily: "monospace" }}>
              Machine-ID: {license.machine_id}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {hasFull && (
            <button onClick={refresh} disabled={refreshing}
              style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 7, color: sc.color, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name={refreshing ? "loader" : "refresh"} size={12} />
              {refreshing ? "Prüfe…" : "Jetzt prüfen"}
            </button>
          )}
          {hasFull ? (
            <>
              <button onClick={() => setShowForm(f => !f)}
                style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${sc.border}`, borderRadius: 7, color: sc.color, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="edit" size={12} />Ändern
              </button>
              <button onClick={deactivate}
                style={{ padding: "6px 12px", background: "transparent", border: "1px solid #3a1a1a", borderRadius: 7, color: "#f87171", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="trash" size={12} />Entfernen
              </button>
            </>
          ) : (
            <button onClick={() => setShowForm(true)}
              style={{ padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="key" size={14} />Lizenz aktivieren
            </button>
          )}
        </div>
      </div>

      {/* Aktivierungsformular */}
      {showForm && (
        <div style={{ background: "#161616", border: "1px solid #fce49944", borderRadius: 12, padding: "20px 22px", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fce499", marginBottom: 4 }}>Lizenz aktivieren</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
            Schlüssel und Konto unter <strong style={{ color: "#888" }}>monstersuite.de</strong> verwalten.
            Aktivierung wird online gegen den Lizenzserver geprüft.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>E-Mail-Adresse (monstersuite.de Konto)</label>
              <input
                style={{ width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#e0e0e0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de"
              />
            </div>
            <div />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 5 }}>Lizenzschlüssel</label>
            <textarea rows={3}
              style={{ width: "100%", padding: "9px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, color: "#6ee7b7", fontSize: 11, outline: "none", boxSizing: "border-box", fontFamily: "monospace", resize: "vertical" }}
              value={key} onChange={e => setKey(e.target.value)} placeholder="Schlüssel aus monstersuite.de einfügen…"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={activate} disabled={saving}
              style={{ padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
              <Icon name="key" size={14} />{saving ? "Aktiviere…" : "Aktivieren"}
            </button>
            <button onClick={() => { setShowForm(false); setKey(""); }}
              style={{ padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Feature-Übersicht */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#ccc", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="layout-grid" size={16} style={{ color: "#fce499" }} />
        Feature-Übersicht
        <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>
          {activeSet.size} / {(license.features || []).length} aktiv
        </span>
      </div>

      {CATEGORY_ORDER.map(cat => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>{cat}</div>
          {(grouped[cat] || []).map(f => (
            <FeatureRow key={f.id} feature={f} active={activeSet.has(f.id)} />
          ))}
        </div>
      ))}

      {/* Info */}
      <div style={{ marginTop: 8, padding: "14px 18px", background: "#1a1a1a", border: "1px solid #222", borderRadius: 10, fontSize: 12, color: "#555", lineHeight: "19px" }}>
        <Icon name="info-circle" size={13} style={{ color: "#fce499", marginRight: 6 }} />
        Lizenzen werden auf <strong style={{ color: "#888" }}>monstersuite.de</strong> verwaltet.
        Signaturmonster prüft die Lizenz alle 24h online und läuft bei Serverausfall bis zu 14 Tage im Grace-Period-Modus weiter.
      </div>
    </div>
  );
}
