import { useState, useRef } from "react";
import { uploadEncryptedFile } from "../services/api";
import { encryptFile, exportKeyBase64, generateKey } from "../services/crypto";

export default function UploadForm({ token, onUploaded }) {
  const [file, setFile] = useState(null);
  const [department, setDepartment] = useState("Finance");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState("abac");
  
  const [keyInfo, setKeyInfo] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
        setStatus({ type: "error", message: "Please select a file first." });
        return;
    }

    setLoading(true);
    setStatus({ type: "success", message: "Encrypting via Web Crypto API..." });
    setKeyInfo("");

    try {
      const key = await generateKey();
      const keyBase64 = await exportKeyBase64(key);
      const { encryptedBlob, ivBase64 } = await encryptFile(file, key);

      const formData = new FormData();
      formData.append("encrypted_file", encryptedBlob, file.name);
      formData.append("iv_b64", ivBase64);
      formData.append("department", department);
      formData.append("upload_summary", summary);
      formData.append("mode", mode);

      setStatus({ type: "success", message: "Transmitting encrypted blob..." });
      await uploadEncryptedFile(token, formData);

      setKeyInfo(keyBase64);
      setStatus({ type: "success", message: "Upload Complete!" });
      setFile(null); setSummary("");
    } catch (err) {
      setStatus({ type: "error", message: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  // If upload succeeded, show the key screen instead of the form
  if (keyInfo) {
      return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px' }}>✓</div>
              <h3 style={{ marginBottom: '12px' }}>Asset Secured</h3>
              <p className="text-muted" style={{ marginBottom: '24px' }}>
                  Your file has been encrypted and stored. The server cannot read it. <strong>You must save the key below to access it later.</strong>
              </p>
              <div style={{ background: '#000', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
                  <p className="mono" style={{ color: 'var(--success)', wordBreak: 'break-all', margin: 0 }}>{keyInfo}</p>
              </div>
              <button className="primary" style={{ width: '100%' }} onClick={onUploaded}>
                  Acknowledge & Close
              </button>
          </div>
      );
  }

  return (
    <form onSubmit={handleUpload}>
      <div 
        className={`dropzone ${isDragging ? "active" : ""}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
        {file ? (
            <div>
                <p style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '4px' }}>{file.name}</p>
                <p className="text-muted">Ready for encryption</p>
            </div>
        ) : (
            <div>
                <div style={{ width: '48px', height: '48px', margin: '0 auto 16px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{color: 'var(--text-secondary)'}}>↑</span>
                </div>
                <p style={{ fontWeight: 500, color: 'white', marginBottom: '4px' }}>Click to browse or drag file here</p>
                <p className="text-muted">Any file type supported</p>
            </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
        <div style={{ flex: 1 }}>
            <label>Department Tag</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option>Finance</option>
                <option>HR</option>
                <option>Healthcare</option>
                <option>Security</option>
            </select>
        </div>
        <div style={{ flex: 1 }}>
            <label>Evaluation Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="abac">ABAC Context</option>
                <option value="rbac">Strict RBAC</option>
            </select>
        </div>
      </div>

      <label>AI Classification Summary</label>
      <textarea
        placeholder="Briefly describe the file for the local NLP model without exposing raw data..."
        value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} required
      />

      {status.message && <div className={`alert ${status.type}`} style={{ marginBottom: '20px' }}>{status.message}</div>}

      <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading || !file}>
        {loading ? "Processing Block..." : "Encrypt & Upload"}
      </button>
    </form>
  );
}