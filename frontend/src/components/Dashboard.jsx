import { useEffect, useState } from "react";
import {
  downloadEncryptedBlob,
  evaluateAccess,
  listFiles,
} from "../services/api";
import {
  decryptBlob,
  importKeyFromBase64,
  triggerBrowserDownload,
} from "../services/crypto";
import UploadForm from "./UploadForm";
import AuditLogView from "./AuditLogView";

// ── Helpers ────────────────────────────────────────────────
function fileIcon(mime = "") {
  if (mime.startsWith("image/")) return "🖼";
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return "📊";
  if (mime.includes("video")) return "🎬";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("rar")) return "📦";
  return "🔒";
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FeedItem({ log }) {
  return (
    <div className="feed-item">
      <div className="feed-item-top">
        <span className={`feed-type ${log.type}`}>{log.type}</span>
        <span className="feed-action">{log.action}</span>
      </div>
      <div className="feed-detail" title={log.detail}>
        {log.detail}
      </div>
      <div className="feed-time">
        {log.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard({ auth, auditLogs, addAuditLog, onLogout }) {
  const [activeView, setActiveView] = useState("vault");
  const [files, setFiles] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState(null);

  // Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);

  // Decrypt modal state
  const [decryptKey, setDecryptKey] = useState("");
  const [policyMode, setPolicyMode] = useState("abac");
  const [actionStatus, setActionStatus] = useState({ type: "", message: "" });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    refreshFiles();
    addAuditLog({
      type: "SYSTEM",
      action: "SESSION_INIT",
      user: auth.user.username,
      detail: "Dashboard loaded, vault indexed",
      status: "info",
    });
  }, []); // eslint-disable-line

  async function refreshFiles() {
    try {
      const data = await listFiles(auth.access_token);
      setFiles(data);
      setFetchError("");
    } catch {
      setFetchError("Unable to connect to the secure vault.");
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function openFile(file) {
    setActiveFile(file);
    setDecryptKey("");
    setActionStatus({ type: "", message: "" });
  }

  async function handleDownload(e) {
    e.preventDefault();
    setActionStatus({ type: "", message: "" });
    if (!decryptKey.trim()) {
      setActionStatus({ type: "error", message: "Decryption key is required." });
      return;
    }

    setProcessing(true);
    const hour = new Date().getHours();

    try {
      setActionStatus({ type: "success", message: "Evaluating policy…" });
      const access = await evaluateAccess(
        auth.access_token,
        activeFile.id,
        hour,
        policyMode
      );

      if (!access.allowed) {
        addAuditLog({
          type: "DENY",
          action: "ACCESS_DENIED",
          user: auth.user.username,
          detail: access.reason,
          resource: activeFile.original_filename,
          status: "error",
        });
        setActionStatus({ type: "error", message: `Access Denied: ${access.reason}` });
        setProcessing(false);
        return;
      }

      addAuditLog({
        type: "ACCESS",
        action: "ACCESS_GRANTED",
        user: auth.user.username,
        detail: `${policyMode.toUpperCase()} policy approved`,
        resource: activeFile.original_filename,
        status: "success",
      });

      setActionStatus({ type: "success", message: "Downloading encrypted blob…" });
      const encBlob = await downloadEncryptedBlob(
        auth.access_token,
        activeFile.id,
        policyMode,
        hour
      );

      setActionStatus({ type: "success", message: "Importing key & decrypting…" });
      const key = await importKeyFromBase64(decryptKey.trim());
      const plainBlob = await decryptBlob(
        encBlob,
        key,
        activeFile.iv_b64,
        activeFile.mime_type
      );

      triggerBrowserDownload(plainBlob, activeFile.original_filename);

      addAuditLog({
        type: "DOWNLOAD",
        action: "FILE_DECRYPTED",
        user: auth.user.username,
        detail: "Client-side AES-GCM decryption successful",
        resource: activeFile.original_filename,
        status: "success",
      });

      setActionStatus({ type: "success", message: "File downloaded successfully!" });
      setTimeout(() => {
        setActiveFile(null);
        setDecryptKey("");
        setActionStatus({ type: "", message: "" });
      }, 1600);
    } catch (err) {
      const msg = err?.message || "Unexpected error during decryption";
      setActionStatus({ type: "error", message: msg });
      addAuditLog({
        type: "DENY",
        action: "DECRYPT_FAILED",
        user: auth.user.username,
        detail: msg,
        resource: activeFile?.original_filename,
        status: "error",
      });
    } finally {
      setProcessing(false);
    }
  }

  // ── Stats ──
  const highCount = files.filter((f) => f.sensitivity === "High").length;
  const medCount = files.filter((f) => f.sensitivity === "Medium").length;
  const denyCount = auditLogs.filter((l) => l.type === "DENY").length;
  const recentFeed = auditLogs.slice(0, 12);

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">🛡</div>
            <div className="brand-text-wrap">
              <div className="brand-name">PAM Vault</div>
              <div className="brand-tagline">Zero-Knowledge Security</div>
            </div>
          </div>
          <div className="sys-status">
            <div className="sys-dot" />
            <span className="sys-label">Systems Nominal</span>
          </div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>

          <div
            className={`nav-item ${activeView === "vault" ? "active" : ""}`}
            onClick={() => setActiveView("vault")}
          >
            <span className="nav-item-icon">🗄</span>
            Asset Vault
            {files.length > 0 && (
              <span className="nav-badge">{files.length}</span>
            )}
          </div>

          <div
            className={`nav-item ${activeView === "audit" ? "active" : ""}`}
            onClick={() => setActiveView("audit")}
          >
            <span className="nav-item-icon">📋</span>
            Audit Log
            {denyCount > 0 && (
              <span className="nav-badge danger">{denyCount} denied</span>
            )}
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="sidebar-feed">
          <div className="feed-header">
            <div className="feed-title">
              <div className="feed-dot" />
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                Live Feed
              </span>
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-tertiary)",
                fontFamily: "'Fira Code', monospace",
              }}
            >
              {auditLogs.length} total
            </span>
          </div>

          <div className="feed-list">
            {recentFeed.length === 0 ? (
              <div className="feed-empty">No events yet.</div>
            ) : (
              recentFeed.map((log) => <FeedItem key={log.id} log={log} />)
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{initials(auth.user.full_name)}</div>
            <div>
              <div className="user-name">{auth.user.full_name}</div>
              <div className="user-meta">
                <span className="user-dept">{auth.user.department}</span>
                <span className={`user-role-badge ${auth.user.role}`}>{auth.user.role}</span>
              </div>
            </div>
          </div>
          <button
            className="secondary"
            style={{ width: "100%", fontSize: "0.8rem", padding: "7px 14px" }}
            onClick={onLogout}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <main className="main-content">
        <div className="main-inner">
          {activeView === "vault" ? (
            <>
              {/* Page header */}
              <div className="page-header">
                <div>
                  <div className="page-eyebrow">Encrypted Asset Vault</div>
                  <h1>Secure Dashboard</h1>
                  <p className="text-muted" style={{ marginTop: 4 }}>
                    Zero-knowledge storage — ABAC & E2EE enforced.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => setUploadOpen(true)}
                  style={{ flexShrink: 0 }}
                >
                  + Encrypt New File
                </button>
              </div>

              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">
                    <span>📁</span> Total Assets
                  </div>
                  <div className="stat-value">{files.length}</div>
                  <div className="stat-sub">Encrypted at rest</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">
                    <span>🔴</span> High Sensitivity
                  </div>
                  <div className="stat-value" style={{ color: "var(--danger)" }}>
                    {highCount}
                  </div>
                  <div className="stat-sub">{medCount} medium risk</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">
                    <span>🚫</span> Access Denials
                  </div>
                  <div className="stat-value" style={{ color: denyCount > 0 ? "var(--warning)" : "var(--success)" }}>
                    {denyCount}
                  </div>
                  <div className="stat-sub">This session</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">
                    <span>⚡</span> Active Policy
                  </div>
                  <div
                    className="stat-value"
                    style={{ fontSize: "1rem", color: "var(--accent-light)", marginTop: 6 }}
                  >
                    ABAC + RBAC
                  </div>
                  <div className="stat-sub">Contextual enforcement</div>
                </div>
              </div>

              {/* File Grid */}
              <div className="section-row">
                <div className="section-heading">
                  <h3>Encrypted Vault</h3>
                  <span className="section-count">{files.length} assets</span>
                </div>
                <button className="ghost" onClick={refreshFiles}>
                  ↻ Refresh
                </button>
              </div>

              {fetchError && (
                <div className="alert error" style={{ marginBottom: 18 }}>
                  {fetchError}
                </div>
              )}

              <div className="file-grid">
                {files.map((file) => (
                  <div key={file.id} className="file-card">
                    <div className="file-card-glow" />
                    <div className="file-card-top">
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                        <div className="file-icon-wrap">{fileIcon(file.mime_type)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            className="file-name-text"
                            title={file.original_filename}
                          >
                            {file.original_filename.length > 32
                              ? file.original_filename.slice(0, 32) + "…"
                              : file.original_filename}
                          </div>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-tertiary)",
                              marginTop: 2,
                              fontFamily: "'Fira Code', monospace",
                            }}
                          >
                            {formatBytes(file.file_size)}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${file.sensitivity}`}>
                        {file.sensitivity}
                      </span>
                    </div>

                    <div className="file-meta">
                      <div className="meta-row">
                        <span className="meta-k">AI Category</span>
                        <span className="meta-v hi">{file.category}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-k">Department</span>
                        <span className="meta-v">{file.department}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-k">Owner</span>
                        <span className="meta-v owner">{file.owner_username}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-k">Uploaded</span>
                        <span className="meta-v">{timeAgo(file.created_at)}</span>
                      </div>
                    </div>

                    <button
                      className="secondary"
                      style={{ width: "100%", fontSize: "0.82rem" }}
                      onClick={() => openFile(file)}
                    >
                      🔓 Request Decryption
                    </button>
                  </div>
                ))}

                {files.length === 0 && !fetchError && (
                  <div className="empty-state">
                    <div className="empty-icon">🔒</div>
                    <p className="empty-text">Vault is empty.</p>
                    <p className="empty-sub">
                      Upload a file to see the encryption engine in action.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Audit Log Page */}
              <div className="page-header">
                <div>
                  <div className="page-eyebrow">Security Intelligence</div>
                  <h1>Audit Log</h1>
                  <p className="text-muted" style={{ marginTop: 4 }}>
                    Full event trail for this session — {auditLogs.length} events recorded.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    addAuditLog({
                      type: "SYSTEM",
                      action: "LOG_EXPORTED",
                      user: auth.user.username,
                      detail: "Audit log viewed manually",
                      status: "info",
                    })
                  }
                >
                  📤 Export Log
                </button>
              </div>

              <AuditLogView logs={auditLogs} />
            </>
          )}
        </div>
      </main>

      {/* ── Toast ─────────────────────────────────── */}
      {toast && (
        <div className="toast">
          <span style={{ color: "var(--accent-light)" }}>ⓘ</span>
          {toast}
        </div>
      )}

      {/* ── Upload Modal ───────────────────────────── */}
      {uploadOpen && (
        <div
          className="modal-overlay"
          onMouseDown={() => setUploadOpen(false)}
        >
          <div className="modal-box" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Secure Upload</h2>
              <button className="modal-close" onClick={() => setUploadOpen(false)}>
                ✕
              </button>
            </div>
            <p className="modal-sub">
              Files are encrypted in your browser with AES-GCM before transmission.
            </p>
            <UploadForm
              token={auth.access_token}
              user={auth.user}
              addAuditLog={addAuditLog}
              onUploaded={() => {
                refreshFiles();
                setUploadOpen(false);
                showToast("File encrypted and stored successfully.");
              }}
            />
          </div>
        </div>
      )}

      {/* ── Decrypt Modal ──────────────────────────── */}
      {activeFile && (
        <div className="modal-overlay" onMouseDown={() => setActiveFile(null)}>
          <div className="modal-box" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Authorize Access</h2>
              <button className="modal-close" onClick={() => setActiveFile(null)}>
                ✕
              </button>
            </div>
            <p className="modal-sub">
              Requesting access to{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {activeFile.original_filename}
              </strong>
              . The selected policy engine will evaluate this request.
            </p>

            <form onSubmit={handleDownload}>
              <label>Policy Evaluator</label>
              <select
                value={policyMode}
                onChange={(e) => setPolicyMode(e.target.value)}
              >
                <option value="abac">ABAC — Contextual (time + network)</option>
                <option value="rbac">RBAC — Standard role check</option>
              </select>

              <label>Client-Side Decryption Key (Base64 AES-GCM)</label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Paste your key…"
                value={decryptKey}
                onChange={(e) => setDecryptKey(e.target.value)}
                style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.8rem" }}
              />

              {actionStatus.message && (
                <div className={`alert ${actionStatus.type}`}>
                  {actionStatus.message}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActiveFile(null)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={processing}>
                  {processing ? "Processing…" : "Evaluate & Decrypt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}