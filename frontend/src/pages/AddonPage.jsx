import React from "react";
import { useI18n } from "../AppContext.jsx";

const DOWNLOAD_URL = "/signaturmonster.xpi";

const steps = {
  de: [
    { n: "1", title: "Addon herunterladen", body: 'Auf den Download-Button klicken und die <code>.xpi</code>-Datei speichern.' },
    { n: "2", title: "In Thunderbird installieren", body: 'Thunderbird öffnen → <b>Extras → Add-ons und Themes → Add-on aus Datei installieren</b> → <code>signaturmonster.xpi</code> auswählen und bestätigen.' },
    { n: "3", title: "Verbinden", body: 'Nach der Installation erscheint das Addon in der Liste. Auf <b>Einstellungen</b> klicken, Server-URL eintragen und mit deinen Signaturmonster-Zugangsdaten anmelden.' },
    { n: "4", title: "Loslegen", body: 'Neue Mail verfassen — die Signatur erscheint automatisch als Vorschau. Der ✦-Balken zeigt an, welche Regel greift.' },
  ],
  en: [
    { n: "1", title: "Download the addon", body: 'Click the download button and save the <code>.xpi</code> file.' },
    { n: "2", title: "Install in Thunderbird", body: 'Open Thunderbird → <b>Tools → Add-ons and Themes → Install Add-on From File</b> → select <code>signaturmonster.xpi</code> and confirm.' },
    { n: "3", title: "Connect", body: 'After installation, click <b>Settings</b> in the addon list, enter your server URL and log in with your Signaturmonster credentials.' },
    { n: "4", title: "You\'re ready", body: 'Open a new compose window — the signature appears automatically as a live preview. The ✦ bar shows which rule is matched.' },
  ],
};

const features = {
  de: [
    "Signatur-Vorschau direkt im Compose-Fenster — so siehst du vor dem Versand genau, wie die Mail beim Empfänger aussieht",
    "Automatische Aktualisierung beim Wechsel der Von:-Adresse",
    "Manuelles Aktualisieren per Toolbar-Button",
    "Kein doppelter Signatur-Inject: das Addon informiert den SMTP-Proxy, dass die Signatur bereits eingebettet ist",
    "CI-Branding und Disclaimer werden weiterhin vom Proxy verwaltet",
  ],
  en: [
    "Live signature preview directly in the compose window — see exactly how the email looks before sending",
    "Automatic update when the From address is changed",
    "Manual refresh via toolbar button",
    "No duplicate signature: the addon tells the SMTP proxy that the signature is already embedded",
    "CI branding and disclaimers are still managed by the proxy",
  ],
};

export default function AddonPage() {
  const { t, lang } = useI18n();
  const stepList    = steps[lang] || steps.de;
  const featureList = features[lang] || features.de;

  const card = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-1)",
    borderRadius: 12,
    padding: "28px 32px",
    marginBottom: 24,
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: "#181818", border: "1px solid #333",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, fontWeight: 800, color: "#fce499", flexShrink: 0,
          fontFamily: "Arial, sans-serif",
        }}>S</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.5px" }}>
            Thunderbird Addon
          </div>
          <div style={{ fontSize: 14, color: "var(--text-5)", marginTop: 4 }}>
            {lang === "de"
              ? "Live-Signatur-Vorschau direkt im Compose-Fenster — das Killer-Feature für deine Teams"
              : "Live signature preview directly in the compose window — the killer feature for your teams"}
          </div>
        </div>
      </div>

      {/* Download button */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
            {lang === "de" ? "Addon herunterladen" : "Download Addon"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-5)" }}>
            {lang === "de"
              ? "Thunderbird 91 oder neuer erforderlich · Manifest V2 · ca. 8 KB"
              : "Requires Thunderbird 91 or newer · Manifest V2 · approx. 8 KB"}
          </div>
        </div>
        <a
          href={DOWNLOAD_URL}
          download="signaturmonster.xpi"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 28px", borderRadius: 10,
            background: "#fce499", color: "#181818",
            fontWeight: 800, fontSize: 15, textDecoration: "none",
            boxShadow: "0 2px 12px rgba(252,228,153,0.25)",
            flexShrink: 0,
            transition: "opacity .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {lang === "de" ? "signaturmonster.xpi" : "signaturmonster.xpi"}
        </a>
      </div>

      {/* Features */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>
          {lang === "de" ? "Was das Addon kann" : "What the addon does"}
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {featureList.map((f, i) => (
            <li key={i} style={{ display: "flex", gap: 10, marginBottom: i < featureList.length - 1 ? 10 : 0 }}>
              <span style={{ color: "#fce499", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✦</span>
              <span style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Installation steps */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 }}>
          {lang === "de" ? "Installation" : "Installation"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {stepList.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--accent-bg)", border: "1px solid var(--border-1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "var(--accent)",
                flexShrink: 0, marginTop: 1,
              }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)", marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-4)", lineHeight: 1.55 }}
                  dangerouslySetInnerHTML={{ __html: s.body }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div style={{ ...card, background: "transparent", border: "1px solid var(--border-1)", padding: "14px 20px" }}>
        <div style={{ fontSize: 12, color: "var(--text-5)", lineHeight: 1.6 }}>
          {lang === "de"
            ? "Das Addon ist für den internen Einsatz vorgesehen und muss manuell installiert werden. Eine Veröffentlichung im Mozilla Add-ons Verzeichnis (addons.thunderbird.net) ist für eine spätere Version geplant."
            : "The addon is intended for internal deployment and must be installed manually. Publishing to the Mozilla Add-ons directory (addons.thunderbird.net) is planned for a future release."}
        </div>
      </div>

    </div>
  );
}
