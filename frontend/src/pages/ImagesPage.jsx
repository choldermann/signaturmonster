import React, { useState, useEffect, useCallback, useRef } from "react";

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, ...style }} aria-hidden />
);

const btnPrimary   = { padding: "9px 18px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const btnSecondary = { padding: "7px 12px", background: "transparent", color: "#888", border: "1px solid #2a2a2a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
const btnDanger    = { padding: "7px 10px", background: "transparent", color: "#f87171", border: "1px solid #3a1a1a", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

function formatBytes(b) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function ImagesPage({ toast }) {
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
    if (ok)   toast("ok",  `${ok} Bild${ok > 1 ? "er" : ""} hochgeladen`);
    if (fail) toast("err", `${fail} Upload${fail > 1 ? "s" : ""} fehlgeschlagen`);
    load();
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    uploadFiles([...e.dataTransfer.files]);
  }

  async function del(id) {
    await fetch(`/api/images/${id}`, { method: "DELETE", headers });
    toast("ok", "Bild gelöscht");
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

  if (loading) return <div style={{ color: "#555", padding: 40 }}>Lade...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Bildbibliothek</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            Bilder hochladen, verwalten und in Signaturen oder Bannern verwenden.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }}
            onChange={e => uploadFiles([...e.target.files])} />
          <button style={btnPrimary} onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Icon name={uploading ? "loader" : "upload"} size={15} />
            {uploading ? "Lade hoch…" : "Bilder hochladen"}
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
          border: `2px dashed ${dragging ? "#fce499" : "#2a2a2a"}`,
          borderRadius: 12, padding: "28px 20px", textAlign: "center",
          marginBottom: 24, cursor: "pointer", transition: "border-color .15s",
          background: dragging ? "#1a1800" : "transparent",
        }}
      >
        <Icon name="photo-up" size={28} style={{ color: dragging ? "#fce499" : "#333", display: "block", margin: "0 auto 8px" }} />
        <div style={{ fontSize: 13, color: dragging ? "#fce499" : "#444" }}>
          {dragging ? "Loslassen zum Hochladen" : "Bilder hierher ziehen oder klicken"}
        </div>
        <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>
          JPG, PNG, GIF, WEBP · Automatische Verkleinerung auf max. 1200 px
        </div>
      </div>

      {/* Grid */}
      {images.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
          <Icon name="photo" size={36} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14 }}>Noch keine Bilder</div>
          <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>Lade dein erstes Bild hoch.</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {images.map(img => (
            <div key={img.id} style={{
              background: "#161616", border: "1px solid #222", borderRadius: 10,
              overflow: "hidden", display: "flex", flexDirection: "column",
            }}>
              {/* Thumbnail */}
              <div style={{ height: 130, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
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
                      style={{ flex: 1, padding: "4px 7px", background: "#1a1a1a", border: "1px solid #fce499", borderRadius: 5, color: "#e0e0e0", fontSize: 12, outline: "none" }}
                    />
                    <button onClick={() => saveRename(img.id)} style={{ ...btnPrimary, padding: "4px 8px", fontSize: 11 }}>✓</button>
                  </div>
                ) : (
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                    title={img.name}
                    onDoubleClick={() => { setEditingId(img.id); setEditName(img.name); }}
                  >
                    {img.name}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "#444", marginTop: 4, display: "flex", gap: 8 }}>
                  {img.width ? <span>{img.width}×{img.height}</span> : null}
                  <span>{formatBytes(img.file_size)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "0 10px 10px", display: "flex", gap: 5 }}>
                <button
                  style={{ ...btnSecondary, flex: 1, justifyContent: "center", background: copiedId === img.id ? "#1a3a2a" : undefined, color: copiedId === img.id ? "#6ee7b7" : undefined }}
                  onClick={() => copyUrl(img.id)}
                  title="URL kopieren"
                >
                  <Icon name={copiedId === img.id ? "check" : "link"} size={13} />
                  {copiedId === img.id ? "Kopiert" : "URL"}
                </button>
                <button
                  style={{ ...btnSecondary, padding: "7px 9px" }}
                  onClick={() => { setEditingId(img.id); setEditName(img.name); }}
                  title="Umbenennen"
                >
                  <Icon name="pencil" size={13} />
                </button>
                <button style={btnDanger} onClick={() => del(img.id)} title="Löschen">
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
