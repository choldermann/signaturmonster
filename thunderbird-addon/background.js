/**
 * Signaturmonster Thunderbird Addon — Background Script
 *
 * Holt beim Öffnen eines Compose-Fensters die passende Signatur vom
 * Signaturmonster-Server und bettet sie als Vorschau ein.
 * Beim Versand wird X-SM-Addon: injected als Header ergänzt, damit
 * der SMTP-Proxy die Signatur nicht doppelt injiziert.
 */

const SM_PREVIEW_ID   = "signaturmonster-preview";
const SM_HEADER_NAME  = "X-SM-Addon";
const SM_HEADER_VALUE = "injected";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

async function getSettings() {
  const s = await browser.storage.local.get(["serverUrl", "token"]);
  return { serverUrl: (s.serverUrl || "").replace(/\/$/, ""), token: s.token || "" };
}

function extractEmail(from) {
  if (!from) return "";
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

async function fetchPreview(senderEmail, settings) {
  if (!settings.serverUrl || !settings.token) return null;
  try {
    const url = `${settings.serverUrl}/api/addon/preview?sender=${encodeURIComponent(senderEmail)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${settings.token}` },
    });
    if (resp.status === 401) {
      console.warn("Signaturmonster: Token abgelaufen – bitte in den Einstellungen neu anmelden.");
      return null;
    }
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.error("Signaturmonster: Verbindung zum Server fehlgeschlagen.", e);
    return null;
  }
}

function buildPreviewHtml(sigData) {
  const ciLabel = sigData.has_ci ? " · mit CI-Branding" : "";
  return `<div id="${SM_PREVIEW_ID}" style="border-top:2px solid #fce499;margin-top:16px;padding-top:10px;">
  <div style="font-size:10px;color:#aaa;margin-bottom:8px;font-family:Arial,sans-serif;letter-spacing:0.02em;">
    ✦ Signaturmonster Vorschau&thinsp;·&thinsp;${escapeHtml(sigData.rule_name)}${ciLabel}
  </div>
  ${sigData.html}
</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectSignatureIntoBody(currentBody, sigHtml) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(
    currentBody || "<html><body></body></html>",
    "text/html"
  );

  // Altes SM-Preview entfernen
  const existing = doc.getElementById(SM_PREVIEW_ID);
  if (existing) existing.remove();

  if (sigHtml) {
    const tmp = doc.createElement("div");
    tmp.innerHTML = sigHtml;
    while (tmp.firstChild) {
      doc.body.appendChild(tmp.firstChild);
    }
  }

  return doc.documentElement.outerHTML;
}

// ─── Kern-Logik ──────────────────────────────────────────────────────────────

async function updateSignature(tabId) {
  const settings = await getSettings();
  if (!settings.serverUrl || !settings.token) return;

  let details;
  try {
    details = await browser.compose.getComposeDetails(tabId);
  } catch {
    return; // Tab bereits geschlossen
  }

  if (details.isPlainText) return; // Plain-Text-Mails überspringen

  const senderEmail = extractEmail(details.from);
  if (!senderEmail) return;

  const sigData = await fetchPreview(senderEmail, settings);
  const sigHtml = sigData && sigData.has_rule && sigData.html
    ? buildPreviewHtml(sigData)
    : "";

  const newBody = injectSignatureIntoBody(details.body, sigHtml);

  try {
    await browser.compose.setComposeDetails(tabId, { body: newBody });
  } catch (e) {
    console.error("Signaturmonster: setComposeDetails fehlgeschlagen.", e);
  }
}

// ─── Event-Listener ──────────────────────────────────────────────────────────

// Beim Öffnen eines neuen Compose-Fensters
browser.compose.onOpen.addListener(async (tab) => {
  await updateSignature(tab.id);
});

// Beim Wechseln der Absenderidentität (Von:-Adresse)
browser.compose.onIdentityChanged.addListener(async (tab, _identity) => {
  await updateSignature(tab.id);
});

// Manuelles Aktualisieren via Toolbar-Button
browser.composeAction.onClicked.addListener(async (tab) => {
  const settings = await getSettings();
  if (!settings.serverUrl || !settings.token) {
    browser.notifications.create({
      type: "basic", iconUrl: "icons/icon-48.svg",
      title: "Signaturmonster",
      message: "Bitte zuerst in den Addon-Einstellungen anmelden.",
    });
    return;
  }

  let details;
  try { details = await browser.compose.getComposeDetails(tab.id); } catch { return; }

  if (details.isPlainText) {
    browser.notifications.create({
      type: "basic", iconUrl: "icons/icon-48.svg",
      title: "Signaturmonster",
      message: "Nur in HTML-Mails verfügbar. Bitte auf HTML-Format umstellen.",
    });
    return;
  }

  const senderEmail = extractEmail(details.from);
  const sigData = await fetchPreview(senderEmail, settings);

  if (!sigData) {
    browser.notifications.create({
      type: "basic", iconUrl: "icons/icon-48.svg",
      title: "Signaturmonster",
      message: "Server nicht erreichbar oder Token abgelaufen.",
    });
    return;
  }

  if (!sigData.has_rule || !sigData.html) {
    browser.notifications.create({
      type: "basic", iconUrl: "icons/icon-48.svg",
      title: "Signaturmonster",
      message: `Keine passende Regel für ${senderEmail}. Bitte Regeln in Signaturmonster prüfen (apply_on_new muss aktiv sein).`,
    });
    return;
  }

  await updateSignature(tab.id);

  browser.notifications.create({
    type: "basic", iconUrl: "icons/icon-48.svg",
    title: "Signaturmonster",
    message: `Signatur aktualisiert: ${sigData.rule_name}`,
  });
});

// Vor dem Versand: X-SM-Addon Header hinzufügen damit der Proxy die
// Signatur nicht ein zweites Mal injiziert (aber CI/Branding läuft weiter).
browser.compose.onBeforeSend.addListener(async (tab, details) => {
  const settings = await getSettings();
  // Nur wenn das Addon konfiguriert ist, soll der Header ergänzt werden.
  if (!settings.serverUrl || !settings.token) return;

  const existing = details.additionalHeaders || [];
  if (existing.some((h) => h.name === SM_HEADER_NAME)) return;

  return {
    details: {
      additionalHeaders: [
        ...existing,
        { name: SM_HEADER_NAME, value: SM_HEADER_VALUE },
      ],
    },
  };
});
