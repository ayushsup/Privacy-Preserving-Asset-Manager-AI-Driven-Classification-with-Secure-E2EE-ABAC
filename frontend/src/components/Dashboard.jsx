import { useEffect, useState } from "react";
import { downloadEncryptedBlob, evaluateAccess, listFiles } from "../services/api";
import { decryptBlob, importKeyFromBase64, triggerBrowserDownload } from "../services/crypto";
import UploadForm from "./UploadForm";

export default function Dashboard({ auth, onLogout }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  
  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  
  // Evaluation State
  const [decryptKey, setDecryptKey] = useState("");
  const [policyMode, setPolicyMode] = useState("abac");
  const [actionStatus, setActionStatus] = useState({ type: "", message: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { refreshFiles(); }, []);

  async function refreshFiles() {
    try {
      const data = await listFiles(auth.access_token);
      setFiles(data);
    } catch (err) {
      setError("Unable to connect to the secure vault.");
    }
  }

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function handleDownload(e) {
    e.preventDefault();
    setActionStatus({ type: "", message: "" });
    if (!decryptKey.trim()) {
      setActionStatus({ type: "error", message: "Decryption key is required." });
      return;
    }

    setIsProcessing(true);
    try {
      setActionStatus({ type: "success", message: "Evaluating ABAC context..." });
      const access = await evaluateAccess(auth.access_token, activeFile.id, new Date().getHours(), policyMode);

      if (!access.allowed) {
        setActionStatus({ type: "error", message: `Access Denied: ${access.reason}` });
        setIsProcessing(false);
        return;
      }

      setActionStatus({ type: "success", message: "Downloading encrypted file..." });
      const encBlob = await downloadEncryptedBlob(auth.access_token, activeFile.id, policyMode, new Date().getHours());
      
      setActionStatus({ type: "success", message: "Importing decryption key..." });
      const key = await importKeyFromBase64(decryptKey.trim());
      
      setActionStatus({ type: "success", message: "Decrypting locally..." });
      const plainBlob = await decryptBlob(encBlob, key, activeFile.iv_b64, activeFile.mime_type);
      
      setActionStatus({ type: "success", message: "Preparing download..." });
      triggerBrowserDownload(plainBlob, activeFile.original_filename);
      setActionStatus({ type: "success", message: "File downloaded successfully!" });
      setTimeout(() => { setActiveFile(null); setDecryptKey(""); setActionStatus({ type: "", message: "" }); }, 1500);
    } catch (err) {
      const errorMsg = err?.message || String(err) || "An unexpected error occurred";
      console.error("Decryption error:", err, "Stack:", err?.stack);
      setActionStatus({ type: "error", message: errorMsg });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="orb"></div>
          PAM Vault
        </div>
        
        <div style={{ flex: 1 }}>
            <p className="stat-label" style={{marginBottom: '12px'}}>Navigation</p>
            <div className="nav-item active">Asset Library</div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{auth.user.full_name}</p>
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '16px' }}>{auth.user.department} • {auth.user.role}</p>
          <button className="secondary" style={{ width: '100%' }} onClick={onLogout}>Sign Out</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1>Secure Asset Dashboard</h1>
            <p className="text-muted" style={{marginTop: '4px'}}>Zero-knowledge storage protected by ABAC & E2EE.</p>
          </div>
          <button className="primary" onClick={() => setIsUploadOpen(true)}>
            + Encrypt New File
          </button>
        </div>

        {/* Analytics Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value">{files.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">High Risk Data</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {files.filter(f => f.sensitivity === 'High').length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Policies</div>
            <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', height: '100%' }}>ABAC Enforced</div>
          </div>
        </div>

        {/* Asset Grid */}
        <h3 style={{ marginBottom: '24px' }}>Encrypted Vault</h3>
        {error && <div className="alert error">{error}</div>}
        
        <div className="file-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h4 title={file.original_filename} style={{ paddingRight: '12px', wordBreak: 'break-all' }}>
                  {file.original_filename.length > 35 ? file.original_filename.substring(0,35) + '...' : file.original_filename}
                </h4>
                <span className={`badge ${file.sensitivity}`}>{file.sensitivity}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                      <span className="text-muted" style={{ fontSize: '13px' }}>AI Classification</span>
                      <span className="mono" style={{ color: 'var(--accent-primary)' }}>{file.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                      <span className="text-muted" style={{ fontSize: '13px' }}>Department</span>
                      <strong style={{ fontSize: '13px' }}>{file.department}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-muted" style={{ fontSize: '13px' }}>Owner</span>
                      <span style={{ fontSize: '13px' }}>{file.owner_username}</span>
                  </div>
              </div>
              
              <button className="secondary" style={{ width: '100%' }} onClick={() => {setActiveFile(file); setActionStatus({type:"", message:""});}}>
                 Request Decryption
              </button>
            </div>
          ))}
          {files.length === 0 && !error && (
              <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '16px' }}>
                  <p className="text-muted">Vault is empty. Upload a file to see the encryption engine in action.</p>
              </div>
          )}
        </div>
      </main>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
            <span style={{ color: 'var(--accent-primary)' }}>ⓘ</span>
            {toastMessage}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="modal-overlay" onMouseDown={() => setIsUploadOpen(false)}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2>Secure Upload</h2>
              <button style={{ background: 'transparent', color: 'var(--text-secondary)', padding: 0 }} onClick={() => setIsUploadOpen(false)}>✕</button>
            </div>
            <UploadForm token={auth.access_token} onUploaded={() => { refreshFiles(); setIsUploadOpen(false); }} />
          </div>
        </div>
      )}

      {/* Decryption Request Modal */}
      {activeFile && (
        <div className="modal-overlay" onMouseDown={() => setActiveFile(null)}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2>Authorize Access</h2>
              <button style={{ background: 'transparent', color: 'var(--text-secondary)', padding: 0 }} onClick={() => setActiveFile(null)}>✕</button>
            </div>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              Attempting to access <strong style={{color: 'white'}}>{activeFile.original_filename}</strong>. This request will be evaluated by the policy engine.
            </p>
            
            <form onSubmit={handleDownload}>
              <label>Policy Evaluator</label>
              <select value={policyMode} onChange={(e) => setPolicyMode(e.target.value)}>
                <option value="abac">ABAC (Contextual Verification)</option>
                <option value="rbac">RBAC (Standard Role Check)</option>
              </select>

              <label>Client-Side Decryption Key (Base64)</label>
              <input 
                type="password" required autoFocus
                placeholder="Paste your AES-GCM key..." 
                value={decryptKey} 
                onChange={(e) => setDecryptKey(e.target.value)} 
                style={{ fontFamily: 'monospace' }}
              />
              
              {actionStatus.message && (
                  <div className={`alert ${actionStatus.type}`}>
                      {actionStatus.message}
                  </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => setActiveFile(null)} disabled={isProcessing}>Cancel</button>
                <button type="submit" className="primary" style={{ flex: 2 }} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Evaluate & Decrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}