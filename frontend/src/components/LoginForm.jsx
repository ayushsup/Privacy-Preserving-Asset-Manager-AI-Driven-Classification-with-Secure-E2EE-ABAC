import { useState } from "react";
import { loginRequest } from "../services/api";

export default function LoginForm({ onLogin }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    mfa_code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
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
    <form className="card auth-card" onSubmit={handleSubmit}>
      <h2>Secure Login</h2>
      <p className="muted">Demo MFA code: 123456</p>

      <input
        placeholder="Username"
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
        required
      />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />
      <input
        placeholder="MFA Code"
        value={form.mfa_code}
        onChange={(e) => setForm({ ...form, mfa_code: e.target.value })}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Login"}
      </button>

      {error && <div className="error">{error}</div>}

      <div className="demo-users">
        <strong>Demo users:</strong>
        <div>admin / admin123</div>
        <div>finance_emp / finance123</div>
        <div>guest1 / guest123</div>
      </div>
    </form>
  );
}