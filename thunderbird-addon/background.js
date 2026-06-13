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

console.log("Signaturmonster background script geladen.");

// Thunderbird: messenger ist der primäre Namespace, browser ist ein Alias
const tbAPI = (typeof messenger !== "undefined") ? messenger : browser;

// Beim Öffnen eines neuen Compose-Fensters
tbAPI.compose.onOpen.addListener(async (tab) => {
  console.log("Signaturmonster: compose.onOpen, tab", tab.id);
  await updateSignature(tab.id);
});

// Beim Wechseln der Absenderidentität (Von:-Adresse)
tbAPI.compose.onIdentityChanged.addListener(async (tab, _identity) => {
  console.log("Signaturmonster: onIdentityChanged, tab", tab.id);
  await updateSignature(tab.id);
});

function showStatusInCompose(tabId, message, color) {
  const html = `<div id="sm-status-banner" style="font-family:Arial,sans-serif;font-size:12px;padding:6px 12px;background:${color};color:#fff;border-radius:4px;margin:8px 0;">${message}</div>`;
  browser.compose.getComposeDetails(tabId).then(details => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(details.body || "<html><body></body></html>", "text/html");
    const old = doc.getElementById("sm-status-banner");
    if (old) old.remove();
    const tmp = doc.createElement("div");
    tmp.innerHTML = html;
    doc.body.insertBefore(tmp.firstChild, doc.body.firstChild);
    browser.compose.setComposeDetails(tabId, { body: doc.documentElement.outerHTML });
    // Banner nach 4 Sekunden wieder entfernen
    setTimeout(async () => {
      try {
        const d = await browser.compose.getComposeDetails(tabId);
        const d2 = parser.parseFromString(d.body || "", "text/html");
        const b = d2.getElementById("sm-status-banner");
        if (b) { b.remove(); browser.compose.setComposeDetails(tabId, { body: d2.documentElement.outerHTML }); }
      } catch {}
    }, 4000);
  }).catch(() => {});
}

// Manuelles Aktualisieren via Toolbar-Button
tbAPI.composeAction.onClicked.addListener(async (tab) => {
  console.log("Signaturmonster: composeAction.onClicked, tab", tab.id);
  const settings = await getSettings();
  if (!settings.serverUrl || !settings.token) {
    showStatusInCompose(tab.id, "⚠ Signaturmonster: Bitte zuerst in den Addon-Einstellungen anmelden.", "#c0392b");
    return;
  }

  let details;
  try { details = await browser.compose.getComposeDetails(tab.id); } catch { return; }

  if (details.isPlainText) {
    showStatusInCompose(tab.id, "⚠ Signaturmonster: Nur in HTML-Mails verfügbar.", "#c0392b");
    return;
  }

  const senderEmail = extractEmail(details.from);
  const sigData = await fetchPreview(senderEmail, settings);

  if (!sigData) {
    showStatusInCompose(tab.id, "⚠ Signaturmonster: Server nicht erreichbar oder Token abgelaufen.", "#c0392b");
    return;
  }

  if (!sigData.has_rule || !sigData.html) {
    showStatusInCompose(tab.id, `⚠ Signaturmonster: Keine passende Regel für ${senderEmail}.`, "#e67e22");
    return;
  }

  await updateSignature(tab.id);
  showStatusInCompose(tab.id, `✓ Signaturmonster: Signatur aktualisiert (${sigData.rule_name})`, "#27ae60");
});

// Vor dem Versand: X-SM-Addon Header hinzufügen damit der Proxy die
// Signatur nicht ein zweites Mal injiziert (aber CI/Branding läuft weiter).
tbAPI.compose.onBeforeSend.addListener(async (tab, details) => {
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
