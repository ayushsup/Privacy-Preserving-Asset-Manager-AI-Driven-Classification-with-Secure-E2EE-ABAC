import { useEffect, useState } from "react";
import { downloadEncryptedBlob, evaluateAccess, listFiles } from "../services/api";
import { decryptBlob, importKeyFromBase64, triggerBrowserDownload } from "../services/crypto";
import UploadForm from "./UploadForm";

export default function Dashboard({ auth, onLogout }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [decryptKey, setDecryptKey] = useState("");
  const [policyMode, setPolicyMode] = useState("abac");
  const [actionStatus, setActionStatus] = useState("");

  async function refreshFiles() {
    try {
      const data = await listFiles(auth.access_token);
      setFiles(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refreshFiles();
  }, []);

  async function handleDownload(file) {
    setActionStatus("");
    
    if (!decryptKey.trim()) {
      setActionStatus("Please enter your decryption key at the top of the dashboard first.");
      return;
    }

    try {
      // 1. Evaluate Access
      const access = await evaluateAccess(
        auth.access_token,
        file.id,
        new Date().getHours(),
        policyMode
      );

      if (!access.allowed) {
        setActionStatus(`Access Denied: ${access.reason}`);
        return;
      }

      // 2. Download & Decrypt
      setActionStatus(`Downloading ${file.original_filename}...`);
      const encBlob = await downloadEncryptedBlob(
        auth.access_token,
        file.id,
        policyMode,
        new Date().getHours()
      );

      const key = await importKeyFromBase64(decryptKey.trim());
      const plainBlob = await decryptBlob(encBlob, key, file.iv_b64, file.mime_type);
      triggerBrowserDownload(plainBlob, file.original_filename);
      
      setActionStatus(""); // Clear status on success
    } catch (err) {
      setActionStatus(`Error: ${err.message}`);
    }
  }

  return (
    <div className="dashboard">
      <div className="topbar card" style={{ padding: "16px 24px" }}>
        <div>
          <h2>Privacy Asset Manager</h2>
          <p className="muted" style={{ margin: 0 }}>
            Logged in as: <strong style={{ color: "white" }}>{auth.user.full_name}</strong> | Role: {auth.user.role} | Dept: {auth.user.department}
          </p>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "1px solid var(--muted)", color: "var(--muted)" }}>
            Sign Out
        </button>
      </div>

      <UploadForm token={auth.access_token} onUploaded={refreshFiles} />

      <div className="card" style={{ background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
        <h3 style={{ color: "var(--accent)" }}>Client-Side Decryption Engine</h3>
        <p className="muted" style={{ fontSize: "14px", marginTop: "-8px" }}>
            Files are downloaded as encrypted blobs. Provide your AES key to decrypt them locally.
        </p>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ flex: 2 }}>
                <input
                    type="password"
                    placeholder="Paste your saved base64 AES key here..."
                    value={decryptKey}
                    onChange={(e) => setDecryptKey(e.target.value)}
                    style={{ margin: 0 }}
                />
            </div>
            <div style={{ flex: 1 }}>
                <select value={policyMode} onChange={(e) => setPolicyMode(e.target.value)} style={{ margin: 0 }}>
                    <option value="abac">Enforce ABAC Rules</option>
                    <option value="rbac">Enforce RBAC Rules</option>
                </select>
            </div>
        </div>
      </div>

      <div className="card">
        <h3>Asset Library</h3>
        {error && <div className="error-text">Failed to load files: {error}</div>}
        {actionStatus && <div className={actionStatus.includes("Error") || actionStatus.includes("Denied") ? "error-text" : "success-text"} style={{ marginBottom: "16px" }}>{actionStatus}</div>}
        
        <div className="file-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card">
              <span className={`badge ${file.sensitivity}`}>
                  {file.sensitivity} Sensitivity
              </span>
              <h4 title={file.original_filename}>{file.original_filename}</h4>
              
              <div className="muted" style={{ fontSize: "13px", marginBottom: "16px", flex: 1 }}>
                  <div><strong>AI Category:</strong> {file.category}</div>
                  <div><strong>Department:</strong> {file.department}</div>
                  <div><strong>Owner:</strong> {file.owner_username}</div>
              </div>

              <button onClick={() => handleDownload(file)}>
                  Evaluate & Download
              </button>
            </div>
          ))}
          {files.length === 0 && !error && (
              <p className="muted">No files found. Upload a secure asset to begin.</p>
          )}
        </div>
      </div>
    </div>
  );
}