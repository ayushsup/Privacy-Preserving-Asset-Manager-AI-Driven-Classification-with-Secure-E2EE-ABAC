import { useState } from "react";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [auth, setAuth] = useState(null);

  return (
    <div className="app-shell">
      {!auth ? (
        <LoginForm onLogin={setAuth} />
      ) : (
        <Dashboard auth={auth} onLogout={() => setAuth(null)} />
      )}
    </div>
  );
}