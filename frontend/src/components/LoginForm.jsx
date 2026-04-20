import { useState } from "react";
import { loginRequest } from "../services/api";

export default function LoginForm({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "", mfa_code: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await loginRequest(form);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="mesh-blob"></div>
      
      <div className="card glass-panel" style={{ width: '100%', maxWidth: '420px', zIndex: 1, padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="brand" style={{ justifyContent: 'center', marginBottom: '8px' }}>
                <div className="orb"></div> PAM Vault
            </div>
            <p className="text-muted">Zero-Knowledge Asset Security</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input placeholder="Enter system ID" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          
          <label>MFA Authenticator Code</label>
          <input placeholder="6-digit code" value={form.mfa_code} onChange={(e) => setForm({ ...form, mfa_code: e.target.value })} required />

          {error && <div className="alert error" style={{ marginBottom: '20px' }}>{error}</div>}

          <button type="submit" className="primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? "Authenticating..." : "Secure Login"}
          </button>
        </form>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
          <p style={{ color: 'white', fontWeight: 600, marginBottom: '12px' }}>Demo Credentials (MFA: 123456)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: 'var(--text-secondary)' }}>
              <div><strong>Admin:</strong> admin</div>
              <div>admin123</div>
              <div><strong>Finance:</strong> finance_emp</div>
              <div>finance123</div>
              <div><strong>Guest:</strong> guest1</div>
              <div>guest123</div>
          </div>
        </div>
      </div>
    </div>
  );
}