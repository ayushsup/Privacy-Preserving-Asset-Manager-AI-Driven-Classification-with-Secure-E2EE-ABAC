function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function generateKey() {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyBase64(key) {
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(raw);
}

export async function importKeyFromBase64(base64Key) {
  const keyData = base64ToUint8Array(base64Key);
  return window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file, key) {
  const fileBuffer = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBuffer
  );

  return {
    encryptedBlob: new Blob([encrypted], { type: "application/octet-stream" }),
    ivBase64: arrayBufferToBase64(iv),
  };
}

export async function decryptBlob(blob, key, ivBase64, mimeType) {
  const encryptedBuffer = await blob.arrayBuffer();
  const iv = base64ToUint8Array(ivBase64);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBuffer
  );

  return new Blob([decrypted], { type: mimeType || "application/octet-stream" });
}

export function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}