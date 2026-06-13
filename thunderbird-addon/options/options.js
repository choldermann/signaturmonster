const $ = (id) => document.getElementById(id);

function showStatus(msg, type) {
  const el = $("status");
  el.textContent  = msg;
  el.className    = `status-box ${type}`;
}

function setConnectedState(serverUrl, username) {
  $("login-section").style.display    = "none";
  $("logout-section").style.display   = "block";
  $("connected-info").style.display   = "block";
  $("connectedServer").textContent    = serverUrl;
  $("connectedUser").textContent      = username;
}

function setDisconnectedState() {
  $("login-section").style.display    = "block";
  $("logout-section").style.display   = "none";
  $("connected-info").style.display   = "none";
  $("status").className               = "status-box";
}

async function init() {
  const s = await browser.storage.local.get(["serverUrl", "token", "username"]);
  if (s.token && s.serverUrl) {
    $("serverUrl").value = s.serverUrl;
    setConnectedState(s.serverUrl, s.username || "");
    showStatus("Verbindung aktiv.", "success");
  }
}

$("btnConnect").addEventListener("click", async () => {
  const serverUrl = $("serverUrl").value.replace(/\/$/, "").trim();
  const username  = $("username").value.trim();
  const password  = $("password").value;

  if (!serverUrl || !username || !password) {
    showStatus("Bitte alle Felder ausfüllen.", "error");
    return;
  }

  showStatus("Verbinde …", "info");
  $("btnConnect").disabled = true;

  try {
    const resp = await fetch(`${serverUrl}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      const detail = Array.isArray(data.detail)
        ? data.detail.map(e => e.msg).join(", ")
        : (data.detail || `Anmeldefehler (${resp.status})`);
      showStatus(detail, "error");
      return;
    }

    const data = await resp.json();
    const token = data.token || data.access_token || "";
    if (!token) {
      showStatus("Server hat keinen Token zurückgegeben.", "error");
      return;
    }

    await browser.storage.local.set({ serverUrl, token, username });
    setConnectedState(serverUrl, username);
    showStatus("Erfolgreich verbunden!", "success");
    $("password").value = "";
  } catch (e) {
    showStatus(`Verbindung fehlgeschlagen: ${e.message}`, "error");
  } finally {
    $("btnConnect").disabled = false;
  }
});

$("btnLogout").addEventListener("click", async () => {
  await browser.storage.local.remove(["token", "username"]);
  setDisconnectedState();
  showStatus("Verbindung getrennt.", "info");
});

init();
