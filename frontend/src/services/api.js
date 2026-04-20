const API_BASE = "http://localhost:8000";

export async function loginRequest(payload) {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Login failed");
    } catch (e) {
      throw new Error("Login failed: " + (e.message || res.statusText));
    }
  }
  return res.json();
}

export async function uploadEncryptedFile(token, formData) {
  const res = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Upload failed");
    } catch (e) {
      throw new Error("Upload failed: " + (e.message || res.statusText));
    }
  }
  return res.json();
}

export async function listFiles(token) {
  const res = await fetch(`${API_BASE}/files/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Could not fetch files");
    } catch (e) {
      throw new Error("Could not fetch files: " + (e.message || res.statusText));
    }
  }
  return res.json();
}

export async function evaluateAccess(token, fileId, currentHour, mode = "abac") {
  const fd = new FormData();
  fd.append("current_hour", currentHour);
  fd.append("mode", mode);

  const res = await fetch(`${API_BASE}/files/${fileId}/evaluate-access`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Access evaluation failed");
    } catch (e) {
      throw new Error("Access evaluation failed: " + (e.message || res.statusText));
    }
  }
  return res.json();
}

export async function downloadEncryptedBlob(token, fileId, mode = "abac", currentHour = 12) {
  const res = await fetch(`${API_BASE}/files/${fileId}/download?mode=${mode}&current_hour=${currentHour}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Download failed");
    } catch (e) {
      throw new Error("Download failed: " + (e.message || res.statusText));
    }
  }
  return res.blob();
}