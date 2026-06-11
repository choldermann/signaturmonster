import React, { useState } from "react";
import { useI18n } from "../AppContext.jsx";

export default function LoginPage({ onLogin }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) { setError(t("login.error.required")); return; }
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
        setError(data.detail || t("login.error.loginFailed"));
      } else {
        localStorage.setItem("sm_token", data.token);
        localStorage.setItem("sm_user", JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch {
      setError(t("login.error.connection"));
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-page)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "inherit",
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>Signatur</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-1px", lineHeight: 1.1 }}>Monster</div>
          <div style={{ fontSize: 11, color: "var(--text-7)", marginTop: 4 }}>{t("login.version")}</div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 14, padding: "28px 28px 24px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 20 }}>{t("login.title")}</div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>
                {t("login.username")}
              </label>
              <input
                style={{ width: "100%", padding: "11px 14px", background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 9, color: "var(--text-2)", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="monster"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>
                {t("login.password")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ width: "100%", padding: "11px 14px", paddingRight: 42, background: "var(--bg-input)", border: "1px solid var(--border-3)", borderRadius: 9, color: "var(--text-2)", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-5)", cursor: "pointer", padding: 0 }}
                >
                  <i className={`ti ti-${showPass ? "eye-off" : "eye"}`} style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: "9px 12px", background: "var(--red-bg)", border: "1px solid var(--red-bd)", borderRadius: 8, fontSize: 13, color: "var(--red)", display: "flex", alignItems: "center", gap: 7 }}>
                <i className="ti ti-circle-x" style={{ fontSize: 15, flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px", background: "var(--accent)",
                color: "var(--accent-fg)", border: "none", borderRadius: 9,
                fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <i className={`ti ti-${loading ? "loader" : "login"}`} style={{ fontSize: 16 }} />
              {loading ? t("login.btnLoading") : t("login.btnLogin")}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
