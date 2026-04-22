import { useState, useCallback } from "react";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const addAuditLog = useCallback((entry) => {
    setAuditLogs((prev) => [
      {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        ...entry,
      },
      ...prev,
    ].slice(0, 200));
  }, []);

  const handleLogin = (data) => {
    setAuth(data);
    addAuditLog({
      type: "AUTH",
      action: "LOGIN",
      user: data.user.username,
      detail: `${data.user.role} authenticated via MFA`,
      status: "success",
    });
  };

  const handleLogout = () => {
    addAuditLog({
      type: "AUTH",
      action: "LOGOUT",
      user: auth.user.username,
      detail: "Session terminated by user",
      status: "info",
    });
    setAuth(null);
  };

  return (
    <div className="app-shell">
      {!auth ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <Dashboard
          auth={auth}
          auditLogs={auditLogs}
          addAuditLog={addAuditLog}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}