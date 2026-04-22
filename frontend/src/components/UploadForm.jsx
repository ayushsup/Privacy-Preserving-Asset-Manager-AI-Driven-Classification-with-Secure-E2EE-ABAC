import { useState, useRef } from "react";
import { uploadEncryptedFile } from "../services/api";
import { encryptFile, exportKeyBase64, generateKey } from "../services/crypto";

const DEPARTMENTS = ["Finance", "HR", "Healthcare", "Security", "Engineering", "Legal"];

export default function UploadForm({ token, user, addAuditLog, onUploaded }) {
  const [file, setFile] = useState(null);
  const [department, setDepartment] = useState("Finance");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState("abac");
  const [keyInfo, setKeyInfo] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragging(true);
    else setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setStatus({ type: "error", message: "Please select a file first." });
      return;
    }

    setLoading(true);
    setStatus({ type: "success", message: "Generating AES-GCM key…" });
    setKeyInfo("");

    try {
      const key = await generateKey();
      const keyBase64 = await exportKeyBase64(key);

      setStatus({ type: "success", message: "Encrypting file in browser…" });
      const { encryptedBlob, ivBase64 } = await encryptFile(file, key);

      const formData = new FormData();
      formData.append("encrypted_file", encryptedBlob, file.name);
      formData.append("iv_b64", ivBase64);
      formData.append("department", department);
      formData.append("upload_summary", summary);
      formData.append("mode", mode);

      setStatus({ type: "success", message: "Transmitting encrypted blob…" });
      await uploadEncryptedFile(token, formData);

      addAuditLog?.({
        type: "UPLOAD",
        action: "FILE_UPLOADED",
        user: user?.username ?? "unknown",
        detail: `${department} dept · ${mode.toUpperCase()} policy`,
        resource: file.name,
        status: "success",
      });

      setKeyInfo(keyBase64);
      setStatus({ type: "success", message: "Upload complete." });
      setFile(null);
      setSummary("");
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Upload failed" });
      addAuditLog?.({
        type: "UPLOAD",
        action: "UPLOAD_FAILED",
        user: user?.username ?? "unknown",
        detail: err.message || "Upload error",
        resource: file?.name,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    await navigator.clipboard.writeText(keyInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  // ── Key reveal screen ───────────────────────────────────
  if (keyInfo) {
    return (
      <div className="success-screen">
        <div className="success-icon">✓</div>
        <h3 style={{ marginBottom: 10 }}>Asset Secured</h3>
        <p className="text-muted" style={{ marginBottom: 18, lineHeight: 1.6 }}>
          Your file is encrypted. The server{" "}
          <strong style={{ color: "var(--text-primary)" }}>cannot read it</strong>. Save
          the key below — without it the file is irrecoverable.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <label style={{ margin: 0, flex: 1 }}>🔑 AES-256-GCM Decryption Key</label>
          <button
            type="button"
            className="ghost"
            style={{ padding: "3px 10px", fontSize: "0.75rem" }}
            onClick={copyKey}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div className="key-box">{keyInfo}</div>

        <button className="primary" style={{ width: "100%" }} onClick={onUploaded}>
          Acknowledge & Close
        </button>
      </div>
    );
  }

  // ── Upload form ─────────────────────────────────────────
  return (
    <form onSubmit={handleUpload}>
      {/* Dropzone */}
      <div
        className={`dropzone ${dragging ? "on" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          type="file"
          ref={fileRef}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ display: "none" }}
        />
        {file ? (
          <div>
            <p
              style={{
                color: "var(--accent-light)",
                fontWeight: 600,
                marginBottom: 3,
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.85rem",
              }}
            >
              {file.name}
            </p>
            <p className="text-muted" style={{ fontSize: "0.78rem" }}>
              {(file.size / 1024).toFixed(1)} KB · Ready for encryption
            </p>
          </div>
        ) : (
          <div>
            <div className="dz-icon">↑</div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
              Click to browse or drag file here
            </p>
            <p className="text-muted" style={{ fontSize: "0.8rem" }}>
              Any file type · Encrypted before upload
            </p>
          </div>
        )}
      </div>

      {/* Department + Mode */}
      <div className="form-row" style={{ marginTop: 18 }}>
        <div>
          <label>Department Tag</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Evaluation Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="abac">ABAC Context</option>
            <option value="rbac">Strict RBAC</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <label>AI Classification Summary</label>
      <textarea
        placeholder="Describe the file contents (used by local NLP classifier)…"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        required
      />

      {status.message && (
        <div className={`alert ${status.type}`}>{status.message}</div>
      )}

      <button
        type="submit"
        className="primary"
        style={{ width: "100%", marginTop: 16 }}
        disabled={loading || !file}
      >
        {loading ? "Processing…" : "🔒 Encrypt & Upload"}
      </button>
    </form>
  );
}