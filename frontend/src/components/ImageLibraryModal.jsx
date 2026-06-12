import React, { useState, useEffect } from "react";
import { useI18n } from "../AppContext.jsx";

export default function ImageLibraryModal({ onSelect, onClose }) {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/images/")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setImages(d); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-2)",
        borderRadius: 14, padding: 24, width: 620, maxHeight: "80vh",
        display: "flex", flexDirection: "column", gap: 16,
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
            <i className="ti ti-photo" style={{ marginRight: 8, color: "var(--accent)" }} />
            {t("images.title")}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-5)", cursor: "pointer", fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ color: "var(--text-5)", padding: 20, textAlign: "center" }}>{t("common.loading")}</div>
          ) : images.length === 0 ? (
            <div style={{ color: "var(--text-5)", padding: 20, textAlign: "center" }}>{t("images.noImages")}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {images.map(img => (
                <button key={img.id} onClick={() => onSelect(`/api/images/${img.id}`)}
                  style={{
                    background: "var(--bg-input)", border: "1px solid var(--border-2)",
                    borderRadius: 8, padding: 6, cursor: "pointer", textAlign: "left",
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-2)"}
                >
                  <img src={`/api/images/${img.id}/thumb`} alt={img.name}
                    style={{ width: "100%", height: 80, objectFit: "contain", borderRadius: 4, display: "block", background: "var(--bg-page)" }} />
                  <div style={{ fontSize: 10, color: "var(--text-5)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {img.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
