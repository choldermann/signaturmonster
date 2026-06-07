import React, { useState } from "react";

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 9, color: "#e0e0e0", fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) { setError("Bitte alle Felder ausfüllen"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.detail || "Fehler beim Anmelden");
      } else {
        localStorage.setItem("sm_token", data.token);
        localStorage.setItem("sm_user", JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch {
      setError("Verbindung zum Server fehlgeschlagen");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d0d",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Arial, Helvetica, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", color: "#fce499", fontWeight: 700 }}>Signatur</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1 }}>Monster</div>
          <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>self-hosted · v0.4.0</div>
        </div>

        {/* Card */}
        <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 14, padding: "28px 28px 24px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Anmelden</div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>
                Benutzername
              </label>
              <input
                style={inputStyle}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="monster"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>
                Passwort
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 42 }}
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", padding: 0 }}
                >
                  <i className={`ti ti-${showPass ? "eye-off" : "eye"}`} style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "9px 12px", background: "#1f0a0a", border: "1px solid #7f1d1d", borderRadius: 8, fontSize: 13, color: "#fca5a5", display: "flex", alignItems: "center", gap: 7 }}>
                <i className="ti ti-circle-x" style={{ fontSize: 15, flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px", background: loading ? "#b8a84a" : "#fce499",
                color: "#1a1a0a", border: "none", borderRadius: 9,
                fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <i className={`ti ti-${loading ? "loader" : "login"}`} style={{ fontSize: 16 }} />
              {loading ? "Bitte warten…" : "Anmelden"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
