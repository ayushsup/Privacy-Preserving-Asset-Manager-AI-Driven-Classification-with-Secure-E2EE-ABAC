import { useState } from "react";
import { loginRequest } from "../services/api";

const DEMO_CREDS = [
  { role: "Admin", user: "admin", pass: "admin123" },
  { role: "Finance", user: "finance_emp", pass: "finance123" },
  { role: "Guest", user: "guest1", pass: "guest123" },
];

export default function LoginForm({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "", mfa_code: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  function fillCred(cred) {
    setForm({ username: cred.user, password: cred.pass, mfa_code: "123456" });
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginRequest(form);
      onLogin(data);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell" style={{ width: "100%", flex: 1, flexDirection: "column" }}>
      {/* Animated background */}
      <div className="login-bg">
        <div className="lg-grid" />
        <div className="lg-glow lg-glow-1" />
        <div className="lg-glow lg-glow-2" />
      </div>

      {/* Panel */}
      <div className="login-panel">
        {/* Logo */}
        <div className="lp-icon-wrap">
          <div className="lp-icon">🛡</div>
          <div className="lp-title">PAM Vault</div>
          <div className="lp-sub">Privacy-Preserving Asset Manager</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input
            placeholder="Enter system ID"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            required
            autoComplete="username"
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••••"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            autoComplete="current-password"
          />

          <label>MFA Authenticator Code</label>
          <input
            placeholder="6-digit code"
            value={form.mfa_code}
            onChange={(e) => set("mfa_code", e.target.value)}
            required
            maxLength={6}
            style={{ fontFamily: "'Fira Code', monospace", letterSpacing: "0.2em" }}
          />

          {error && (
            <div className="alert error" style={{ marginBottom: 16, marginTop: 0 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary"
            style={{ width: "100%", padding: "11px" }}
            disabled={loading}
          >
            {loading ? "Authenticating…" : "Secure Login"}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="demo-creds">
          <div className="demo-creds-hdr">Demo Credentials · MFA: 123456</div>
          {DEMO_CREDS.map((c) => (
            <div
              key={c.user}
              className="cred-row"
              style={{ cursor: "pointer" }}
              onClick={() => fillCred(c)}
              title={`Click to fill ${c.role} credentials`}
            >
              <span className="cred-role">{c.role}</span>
              <span className="cred-user">{c.user}</span>
              <span className="cred-sep">/</span>
              <span className="cred-pass">{c.pass}</span>
            </div>
          ))}
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--text-tertiary)",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            Click any row to auto-fill credentials
          </p>
        </div>
      </div>
    </div>
  );
}