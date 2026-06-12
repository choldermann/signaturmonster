import React, { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../AppContext.jsx";

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const btnPrimary   = { padding: "9px 18px", background: "var(--accent)", color: "var(--accent-fg)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "7px 12px", background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-3)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnDanger    = { padding: "7px 10px", background: "transparent", color: "var(--red-s)", border: "1px solid var(--red-bg)", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function ImagesPage({ toast }) {
  const { t } = useI18n();
  const [images, setImages]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");
  const [copiedId, setCopiedId]   = useState(null);
  const fileRef = useRef(null);
  const token   = localStorage.getItem("sm_token");

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/images/", { headers });
      setImages(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function uploadFiles(files) {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0, fail = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      const r = await fetch("/api/images/upload", { method: "POST", headers, body: fd });
      if (r.ok) ok++; else fail++;
    }
    setUploading(false);
    if (ok)   toast("ok",  `${ok} ${t(ok > 1 ? "images.imagesUploaded" : "images.imageUploaded")}`);
    if (fail) toast("err", `${fail} ${t(fail > 1 ? "images.uploadsFailed" : "images.uploadFailed")}`);
    load();
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    uploadFiles([...e.dataTransfer.files]);
  }

  async function del(id) {
    await fetch(`/api/images/${id}`, { method: "DELETE", headers });
    toast("ok", t("images.imageDeleted"));
    load();
  }

  async function saveRename(id) {
    await fetch(`/api/images/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    load();
  }

  function copyUrl(id) {
    const url = `${window.location.origin}/api/images/${id}/serve`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return <div style={{ color: "var(--text-5)", padding: 40 }}>{t("common.loading")}</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>{t("images.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-5)", marginTop: 6 }}>
            {t("images.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }}
            onChange={e => uploadFiles([...e.target.files])} />
          <button style={btnPrimary} onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Icon name={uploading ? "loader" : "upload"} size={15} />
            {uploading ? t("images.uploading") : t("images.uploadImages")}
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-3)"}`,
          borderRadius: 12, padding: "28px 20px", textAlign: "center",
          marginBottom: 24, cursor: "pointer", transition: "border-color .15s",
          background: dragging ? "var(--accent-bg2)" : "transparent",
        }}
      >
        <Icon name="photo-up" size={28} style={{ color: dragging ? "var(--accent)" : "var(--text-7)", display: "block", margin: "0 auto 8px" }} />
        <div style={{ fontSize: 13, color: dragging ? "var(--accent)" : "var(--text-6)" }}>
          {dragging ? t("images.dropToUpload") : t("images.dragOrClick")}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-7)", marginTop: 4 }}>
          {t("images.formatHint")}
        </div>
      </div>

      {/* Grid */}
      {images.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-6)" }}>
          <Icon name="photo" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>{t("images.noImages")}</div>
          <div style={{ fontSize: 12, color: "var(--text-7)", marginTop: 6 }}>{t("images.noImagesHint")}</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {images.map(img => (
            <div key={img.id} style={{
              background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 10,
              overflow: "hidden", display: "flex", flexDirection: "column",
            }}>
              {/* Thumbnail */}
              <div style={{ height: 130, background: "var(--bg-nav)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                <img
                  src={`/api/images/${img.id}/thumb`}
                  alt={img.name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              </div>

              {/* Info */}
              <div style={{ padding: "10px 12px", flex: 1 }}>
                {editingId === img.id ? (
                  <div style={{ display: "flex", gap: 5 }}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveRename(img.id); if (e.key === "Escape") setEditingId(null); }}
                      style={{ flex: 1, padding: "4px 7px", background: "var(--bg-input)", border: "1px solid var(--accent)", borderRadius: 5, color: "var(--text-2)", fontSize: 12, outline: "none" }}
                    />
                    <button onClick={() => saveRename(img.id)} style={{ ...btnPrimary, padding: "4px 8px", fontSize: 11 }}>✓</button>
                  </div>
                ) : (
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                    title={img.name}
                    onDoubleClick={() => { setEditingId(img.id); setEditName(img.name); }}
                  >
                    {img.name}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--text-6)", marginTop: 4, display: "flex", gap: 8 }}>
                  {img.width ? <span>{img.width}×{img.height}</span> : null}
                  <span>{formatBytes(img.file_size)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "0 10px 10px", display: "flex", gap: 5 }}>
                <button
                  style={{ ...btnSecondary, flex: 1, justifyContent: "center", background: copiedId === img.id ? "var(--green-bg)" : undefined, color: copiedId === img.id ? "var(--green)" : undefined }}
                  onClick={() => copyUrl(img.id)}
                  title={t("images.copyUrl")}
                >
                  <Icon name={copiedId === img.id ? "check" : "link"} size={13} />
                  {copiedId === img.id ? t("images.copied") : "URL"}
                </button>
                <button
                  style={{ ...btnSecondary, padding: "7px 9px" }}
                  onClick={() => { setEditingId(img.id); setEditName(img.name); }}
                  title={t("images.rename")}
                >
                  <Icon name="pencil" size={13} />
                </button>
                <button style={btnDanger} onClick={() => del(img.id)} title={t("common.delete")}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
