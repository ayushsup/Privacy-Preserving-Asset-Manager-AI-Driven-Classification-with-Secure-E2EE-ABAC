import { useState } from "react";

const FILTERS = ["ALL", "AUTH", "UPLOAD", "ACCESS", "DOWNLOAD", "DENY"];

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function TypeChip({ type }) {
  return <span className={`type-chip ${type}`}>{type}</span>;
}

function StatusPill({ status }) {
  const labels = { success: "Granted", error: "Denied", info: "Info", warning: "Warning" };
  return (
    <span className={`status-pill ${status}`}>
      <span className={`status-pill-dot ${status}`} />
      {labels[status] ?? status}
    </span>
  );
}

export default function AuditLogView({ logs }) {
  const [filter, setFilter] = useState("ALL");

  const visible = filter === "ALL" ? logs : logs.filter((l) => l.type === filter);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "ALL" ? logs.length : logs.filter((l) => l.type === f).length;
    return acc;
  }, {});

  return (
    <div className="audit-page">
      {/* Toolbar */}
      <div className="audit-toolbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "on" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {counts[f] > 0 && (
              <span style={{ marginLeft: 5, opacity: 0.65 }}>({counts[f]})</span>
            )}
          </button>
        ))}
        <span className="audit-count-chip">
          {visible.length} event{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="audit-table-wrap">
        {visible.length === 0 ? (
          <div className="audit-empty-state">
            <div className="audit-empty-icon">🔍</div>
            <p className="audit-empty-text">No events recorded yet.</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: 6 }}>
              Events appear here as you interact with the vault.
            </p>
          </div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Action</th>
                <th>User</th>
                <th>Detail</th>
                <th>Resource</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="audit-ts">{formatTime(log.timestamp)}</span>
                  </td>
                  <td>
                    <TypeChip type={log.type} />
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: "0.83rem" }}>{log.action}</span>
                  </td>
                  <td>
                    <span className="audit-user">{log.user ?? "—"}</span>
                  </td>
                  <td>
                    <span className="audit-detail" title={log.detail}>
                      {log.detail ?? "—"}
                    </span>
                  </td>
                  <td>
                    {log.resource ? (
                      <span className="audit-resource" title={log.resource}>
                        {log.resource}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <StatusPill status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}