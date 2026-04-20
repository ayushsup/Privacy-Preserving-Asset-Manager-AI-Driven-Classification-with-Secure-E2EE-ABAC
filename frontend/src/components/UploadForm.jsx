import { useState, useRef } from "react";
import { uploadEncryptedFile } from "../services/api";
import { encryptFile, exportKeyBase64, generateKey } from "../services/crypto";

export default function UploadForm({ token, onUploaded }) {
  const [file, setFile] = useState(null);
  const [department, setDepartment] = useState("Finance");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState("abac");
  const [keyInfo, setKeyInfo] = useState("");
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
        setStatus("Please select a file first.");
        return;
    }

    setLoading(true);
    setStatus("Encrypting file in browser...");
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

      setStatus("Uploading encrypted file...");
      await uploadEncryptedFile(token, formData);

      setKeyInfo(`Save this decryption key securely:\n${keyBase64}`);
      setStatus("");
      setFile(null);
      setSummary("");
      onUploaded();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleUpload}>
      <h3>Secure Asset Upload</h3>
      
      {/* Interactive Dropzone */}
      <div 
        className={`dropzone ${isDragging ? "active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            style={{ display: "none" }} 
        />
        {file ? (
            <p className="selected-file">Selected: {file.name}</p>
        ) : (
            <p>Drag and drop a file here, or click to browse</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ flex: 1 }}>
            <label className="muted" style={{ fontSize: "14px" }}>Department Tag</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option>Finance</option>
                <option>HR</option>
                <option>Healthcare</option>
                <option>General</option>
                <option>Security</option>
            </select>
        </div>
        <div style={{ flex: 1 }}>
            <label className="muted" style={{ fontSize: "14px" }}>Policy Evaluator</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="abac">ABAC (Attribute-Based)</option>
                <option value="rbac">RBAC (Role-Based)</option>
            </select>
        </div>
      </div>

      <textarea
        placeholder="Provide a short plaintext summary for the zero-data-retention AI to classify..."
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
      />

      <button type="submit" disabled={loading || !file}>
        {loading ? "Processing..." : "Encrypt & Upload File"}
      </button>

      {status && <div className={status.startsWith("Error") ? "error-text" : "success-text"}>{status}</div>}
      
      {keyInfo && (
          <div style={{ marginTop: "16px" }}>
              <label className="success-text">Upload Successful! Your local decryption key:</label>
              <textarea style={{ background: "#061018", color: "#10b981", borderColor: "#10b981" }} readOnly value={keyInfo} rows={2} />
          </div>
      )}
    </form>
  );
}