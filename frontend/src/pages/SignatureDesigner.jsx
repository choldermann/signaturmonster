import React, { useState, useEffect, useRef } from "react";
import { ACCENT_COLORS } from "../data/colorPresets.js";
import { SIGNATURE_TEMPLATES } from "../data/signatureTemplates.js";
import { useI18n } from "../AppContext.jsx";
import ImageLibraryModal from "../components/ImageLibraryModal.jsx";

const API = "";

// ─── Block Definitionen ───────────────────────────────────────────────────────
const BLOCK_TYPES = [
  { type: "text",       label: "designer.blockText",       icon: "ti-align-left" },
  { type: "image",      label: "designer.blockImage",      icon: "ti-photo" },
  { type: "banner",     label: "designer.blockBanner",     icon: "ti-ad" },
  { type: "link",       label: "designer.blockLink",       icon: "ti-link" },
  { type: "social",     label: "designer.blockSocial",     icon: "ti-share" },
  { type: "disclaimer", label: "designer.blockDisclaimer", icon: "ti-shield" },
  { type: "divider",    label: "designer.blockDivider",    icon: "ti-minus" },
  { type: "spacer",     label: "designer.blockSpacer",     icon: "ti-space" },
  { type: "columns",    label: "designer.blockColumns",    icon: "ti-layout-columns" },
  { type: "table",      label: "designer.blockTable",      icon: "ti-table" },
];

// No nesting of layout blocks
const COLUMN_ALLOWED_TYPES = BLOCK_TYPES.filter(b => b.type !== "columns" && b.type !== "table");
const TABLE_ALLOWED_TYPES  = BLOCK_TYPES.filter(b => b.type !== "columns" && b.type !== "table");

const DEFAULT_PROPS = {
  text: {
    content: "Text hier eingeben...",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "13px", fontWeight: "normal", fontStyle: "normal",
    color: "#333333", textAlign: "left",
    paddingTop: "4", paddingBottom: "4", paddingLeft: "0", paddingRight: "0",
  },
  image: {
    src: "", alt: "", width: "120", align: "left",
    linkUrl: "", borderRadius: "0",
    paddingTop: "4", paddingBottom: "4", paddingLeft: "0", paddingRight: "0",
  },
  banner: {
    height: "80", bgType: "solid",
    color1: "#fce499", color2: "#f08030",
    gradientDir: "horizontal", outlookColor: "#fce499",
    text: "Jetzt Termin buchen!", textColor: "#333333",
    fontSize: "16", fontWeight: "bold", textAlign: "center",
    subtext: "", subtextColor: "#555555", subtextSize: "12",
    linkUrl: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "",
    borderRadius: "8", padding: "16",
  },
  link: {
    label: "Link-Text", url: "https://",
    color: "#0066cc", fontSize: "13px",
    asButton: false, buttonBg: "#fce499", buttonColor: "#333333",
    borderRadius: "4",
    utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "",
    paddingTop: "4", paddingBottom: "4", paddingLeft: "0", paddingRight: "0",
  },
  social: {
    items: [
      { platform: "web",      url: "https://", label: "Website" },
      { platform: "email",    url: "mailto:",  label: "E-Mail" },
      { platform: "linkedin", url: "https://", label: "LinkedIn" },
    ],
    iconSize: "13", fontSize: "12", gap: "14", iconGap: "6", style: "icon-text",
    direction: "horizontal", align: "left",
    fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal",
    color: "#555555",
    paddingTop: "4", paddingBottom: "4", paddingLeft: "0", paddingRight: "0",
  },
  disclaimer: {
    disclaimer_id: "",
    fontSize: "11px", color: "#888888", textAlign: "left",
    paddingTop: "8", paddingBottom: "8", paddingLeft: "0", paddingRight: "0",
  },
  divider: { color: "#dddddd", thickness: "1", margin: "8", paddingLeft: "0", paddingRight: "0" },
  spacer:  { height: "12", paddingLeft: "0", paddingRight: "0" },
  columns: { leftWidth: "50", leftBlocks: [], rightBlocks: [],
    paddingTop: "0", paddingBottom: "0", paddingLeft: "0", paddingRight: "0" },
  table: {
    borderColor: "#dddddd", borderWidth: "1", cellPadding: "8", tableBg: "",
    paddingTop: "0", paddingBottom: "0", paddingLeft: "0", paddingRight: "0",
    cells: [
      [{ blocks: [], bg: "" }, { blocks: [], bg: "" }, { blocks: [], bg: "" }],
      [{ blocks: [], bg: "" }, { blocks: [], bg: "" }, { blocks: [], bg: "" }],
    ],
  },
};

const SOCIAL_ICONS = {
  web:       { icon: "🌐", label: "Website",   labelKey: "designer.socialPlatformWeb" },
  email:     { icon: "✉️", label: "E-Mail",    labelKey: "designer.socialPlatformEmail" },
  phone:     { icon: "📞", label: "Telefon",   labelKey: "designer.socialPlatformPhone" },
  linkedin:  { icon: "in", label: "LinkedIn",  labelKey: "designer.socialPlatformLinkedIn" },
  xing:      { icon: "X",  label: "Xing",      labelKey: "designer.socialPlatformXing" },
  twitter:   { icon: "𝕏",  label: "Twitter/X", labelKey: "designer.socialPlatformTwitter" },
  facebook:  { icon: "f",  label: "Facebook",  labelKey: "designer.socialPlatformFacebook" },
  instagram: { icon: "📷", label: "Instagram", labelKey: "designer.socialPlatformInstagram" },
  youtube:   { icon: "▶",  label: "YouTube",   labelKey: "designer.socialPlatformYouTube" },
};

const FONTS = [
  "Arial, Helvetica, sans-serif",
  "Verdana, Geneva, sans-serif",
  "Tahoma, Geneva, sans-serif",
  "'Trebuchet MS', sans-serif",
  "'Gill Sans', Calibri, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Palatino Linotype', Palatino, serif",
  "'Courier New', Courier, monospace",
  "Impact, Charcoal, sans-serif",
];

let idCounter = 100;

function buildUrl(url, utm) {
  if (!url || !url.startsWith("http")) return url;
  const params = [];
  if (utm.utm_source)   params.push(`utm_source=${encodeURIComponent(utm.utm_source)}`);
  if (utm.utm_medium)   params.push(`utm_medium=${encodeURIComponent(utm.utm_medium)}`);
  if (utm.utm_campaign) params.push(`utm_campaign=${encodeURIComponent(utm.utm_campaign)}`);
  if (utm.utm_content)  params.push(`utm_content=${encodeURIComponent(utm.utm_content)}`);
  if (!params.length) return url;
  return url + (url.includes("?") ? "&" : "?") + params.join("&");
}

// Assign fresh ids to a block list (and sub-blocks in columns), migrating old column format
function assignIds(bList) {
  return (bList || []).map(b => {
    const id = ++idCounter;
    if (b.type === "columns") {
      // Migrate old format: leftContent/rightContent → text sub-blocks
      if (b.props.leftContent !== undefined || b.props.rightContent !== undefined) {
        const toText = (s) => s?.trim()
          ? [{ id: ++idCounter, type: "text", props: { ...DEFAULT_PROPS.text, content: s } }]
          : [];
        return { ...b, id, props: {
          leftWidth: b.props.leftWidth || "50",
          leftBlocks: toText(b.props.leftContent),
          rightBlocks: toText(b.props.rightContent),
        }};
      }
      return { ...b, id, props: {
        ...b.props,
        leftBlocks: assignIds(b.props.leftBlocks || []),
        rightBlocks: assignIds(b.props.rightBlocks || []),
      }};
    }
    if (b.type === "table") {
      return { ...b, id, props: {
        ...b.props,
        cells: (b.props.cells || []).map(row =>
          row.map(cell => ({ ...cell, blocks: assignIds(cell.blocks || []) }))
        ),
      }};
    }
    return { ...b, id };
  });
}

// ─── HTML Generator ───────────────────────────────────────────────────────────
function gp(p) {
  return `${parseInt(p.paddingTop)||0}px ${parseInt(p.paddingRight)||0}px ${parseInt(p.paddingBottom)||0}px ${parseInt(p.paddingLeft)||0}px`;
}

function blockToHTML(block) {
  const p = block.props;
  if (block.type === "text") {
    const html = p.content.replace(/\t/g, "&emsp;").replace(/\n/g, "<br>");
    const ff = p.fontFamily || "Arial, Helvetica, sans-serif";
    const pl = parseInt(p.paddingLeft)  || 0;
    const pr = parseInt(p.paddingRight) || 0;
    return `<p style="margin:${p.paddingTop}px 0 ${p.paddingBottom}px;padding:0 ${pr}px 0 ${pl}px;font-size:${p.fontSize};font-weight:${p.fontWeight};font-style:${p.fontStyle};color:${p.color};text-align:${p.textAlign};font-family:${ff};line-height:1.5;">${html}</p>`;
  }
  if (block.type === "image") {
    const img = `<img src="${p.src}" alt="${p.alt}" width="${p.width}" style="display:inline-block;border:0;border-radius:${p.borderRadius}px;max-width:100%;" />`;
    const wrapped = p.linkUrl ? `<a href="${p.linkUrl}" style="text-decoration:none;">${img}</a>` : img;
    return `<div style="text-align:${p.align};padding:${gp(p)};">${wrapped}</div>`;
  }
  if (block.type === "link") {
    const href = buildUrl(p.url, p);
    if (p.asButton) {
      return `<div style="padding:${gp(p)};"><a href="${href}" style="display:inline-block;background:${p.buttonBg};color:${p.buttonColor};padding:6px 14px;border-radius:${p.borderRadius}px;text-decoration:none;font-size:${p.fontSize};font-family:Arial,sans-serif;">${p.label}</a></div>`;
    }
    return `<div style="padding:${gp(p)};"><a href="${href}" style="color:${p.color};font-size:${p.fontSize};font-family:Arial,sans-serif;">${p.label}</a></div>`;
  }
  if (block.type === "social") {
    const isVertical = p.direction === "vertical";
    const sz      = parseInt(p.iconSize) || 13;
    const lsz     = parseInt(p.fontSize) || 12;
    const gap     = parseInt(p.gap)      || 10;
    const iconGap = parseInt(p.iconGap)  ?? 6;
    const ff      = p.fontFamily || "Arial,sans-serif";
    const fw      = p.fontWeight || "normal";
    const fs      = p.fontStyle  || "normal";
    const textAlign  = p.align === "center" ? "center" : p.align === "right" ? "right" : "left";
    const showIcon   = p.style !== "text-only";
    const showLabel  = p.style !== "icon-only";
    const labelCss   = `color:${p.color};text-decoration:none;font-size:${lsz}px;font-family:${ff};font-weight:${fw};font-style:${fs};`;

    if (isVertical) {
      const iconColW   = showIcon ? sz + iconGap + 2 : 0;
      const tableAlign = p.align === "center" ? ' align="center"' : p.align === "right" ? ' align="right"' : '';
      const rows = p.items.map((item, i) => {
        const icon = SOCIAL_ICONS[item.platform] || { icon: "🔗" };
        const href = buildUrl(item.url, { ...p, ...item });
        const pb   = i < p.items.length - 1 ? gap : 0;
        const iconTd  = showIcon  ? `<td width="${iconColW}" style="text-align:center;padding-right:${iconGap}px;padding-bottom:${pb}px;vertical-align:middle;font-size:${sz}px;color:${p.color};">${icon.icon}</td>` : "";
        const labelTd = showLabel ? `<td style="padding-bottom:${pb}px;vertical-align:middle;white-space:nowrap;"><a href="${href}" style="${labelCss}">${item.label || icon.label}</a></td>` : "";
        return `<tr>${iconTd}${labelTd}</tr>`;
      }).join("");
      return `<div style="padding:${gp(p)};text-align:${textAlign};"><table cellpadding="0" cellspacing="0" border="0"${tableAlign}><tbody>${rows}</tbody></table></div>`;
    }

    const links = p.items.map((item, i) => {
      const icon = SOCIAL_ICONS[item.platform] || { icon: "🔗" };
      const href = buildUrl(item.url, { ...p, ...item });
      const mr   = i < p.items.length - 1 ? `margin-right:${gap}px;` : "";
      if (!showIcon)  return `<a href="${href}" style="${labelCss}${mr}">${item.label || icon.label}</a>`;
      if (!showLabel) return `<a href="${href}" style="color:${p.color};text-decoration:none;font-size:${sz}px;${mr}">${icon.icon}</a>`;
      return `<a href="${href}" style="color:${p.color};text-decoration:none;font-size:${sz}px;${mr}">${icon.icon}<span style="margin-left:${iconGap}px;${labelCss}">${item.label || icon.label}</span></a>`;
    }).join(" ");
    return `<div style="padding:${gp(p)};text-align:${textAlign};">${links}</div>`;
  }
  if (block.type === "banner") {
    const href = p.linkUrl ? buildUrl(p.linkUrl, p) : null;
    const r    = parseInt(p.borderRadius) || 0;

    // ── Animated GIF mode (universal email compatibility) ──
    if (p.gif_data) {
      const img = `<img src="data:image/gif;base64,${p.gif_data}" width="600" alt="${p.text.replace(/"/g, "&quot;")}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:${r}px;" />`;
      return href ? `<a href="${href}" style="display:block;text-decoration:none;">${img}</a>` : img;
    }

    // ── Static HTML banner (CSS gradient + VML Outlook fallback) ──
    const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
    const vmlAngle  = { horizontal: 90, vertical: 0, diagonal: 45 }[p.gradientDir] ?? 90;
    const bg        = p.bgType === "gradient"
      ? `linear-gradient(${cssDirMap[p.gradientDir] || "to right"},${p.color1},${p.color2})`
      : p.color1;
    const fallback  = p.outlookColor || p.color1;
    const pad       = parseInt(p.padding) || 16;
    const h         = parseInt(p.height)  || 80;
    const textP     = `margin:0;color:${p.textColor};font-size:${p.fontSize}px;font-weight:${p.fontWeight};text-align:${p.textAlign};font-family:Arial,sans-serif;line-height:1.4;`;
    const subP      = p.subtext ? `<p style="margin:6px 0 0;color:${p.subtextColor};font-size:${p.subtextSize}px;text-align:${p.textAlign};font-family:Arial,sans-serif;line-height:1.4;">${p.subtext}</p>` : "";
    const inner     = `<p style="${textP}">${p.text}</p>${subP}`;
    const linked    = href ? `<a href="${href}" style="text-decoration:none;display:block;">${inner}</a>` : inner;
    const vmlFill   = p.bgType === "gradient"
      ? `<v:fill type="gradient" color="${p.color1}" color2="${p.color2}" angle="${vmlAngle}"/>`
      : `<v:fill type="solid" color="${fallback}"/>`;
    const td = `<td align="${p.textAlign}" valign="middle" bgcolor="${fallback}" style="background:${bg};padding:${pad}px;height:${h}px;border-radius:${r}px;">${linked}</td>`;
    return `<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="mso-width-percent:1000;height:${h}px;">${vmlFill}<v:textbox inset="0,0,0,0"><![endif]--><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-radius:${r}px;overflow:hidden;"><tr>${td}</tr></table><!--[if gte mso 9]></v:textbox></v:rect><![endif]-->`;
  }

  if (block.type === "disclaimer") {
    return `<div class="sm-disclaimer" style="font-size:${p.fontSize};color:${p.color};text-align:${p.textAlign};padding:${gp(p)};">{{disclaimer_html}}</div>`;
  }
  if (block.type === "divider") {
    const pl = parseInt(p.paddingLeft) || 0;
    const pr = parseInt(p.paddingRight) || 0;
    return `<div style="padding:${p.margin}px ${pr}px ${p.margin}px ${pl}px;"><hr style="border:none;border-top:${p.thickness}px solid ${p.color};margin:0;" /></div>`;
  }
  if (block.type === "spacer") {
    const pl = parseInt(p.paddingLeft) || 0;
    const pr = parseInt(p.paddingRight) || 0;
    const style = pl || pr ? `height:${p.height}px;padding:0 ${pr}px 0 ${pl}px;font-size:0;` : `height:${p.height}px;font-size:0;`;
    return `<div style="${style}">&nbsp;</div>`;
  }
  if (block.type === "columns") {
    const leftHtml  = (p.leftBlocks  || []).map(blockToHTML).join("");
    const rightHtml = (p.rightBlocks || []).map(blockToHTML).join("");
    const inner = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;"><tr><td width="${p.leftWidth}%" style="vertical-align:top;padding-right:8px;">${leftHtml}</td><td style="vertical-align:top;">${rightHtml}</td></tr></table>`;
    const pad = gp(p);
    return pad !== "0px 0px 0px 0px" ? `<div style="padding:${pad};">${inner}</div>` : inner;
  }
  if (block.type === "table") {
    const bw = parseInt(p.borderWidth) || 1;
    const bc = p.borderColor || "#dddddd";
    const bAttr = bw > 0 ? `border:${bw}px solid ${bc};` : "";
    const cp = parseInt(p.cellPadding) || 8;
    const nCols = (p.cells[0] || []).length || 1;
    const colW = Math.floor(100 / nCols);
    const rows = (p.cells || []).map(row => {
      const tds = row.map(cell => {
        const inner = (cell.blocks || []).map(blockToHTML).join("") || "&nbsp;";
        const cellBg = cell.bg || p.tableBg || "";
        const bgAttr = cellBg ? `background:${cellBg};` : "";
        return `<td width="${colW}%" style="${bAttr}padding:${cp}px;vertical-align:top;word-break:break-word;${bgAttr}">${inner}</td>`;
      }).join("");
      return `<tr>${tds}</tr>`;
    }).join("\n");
    const tbl = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;">\n${rows}\n</table>`;
    const pad = gp(p);
    return pad !== "0px 0px 0px 0px" ? `<div style="padding:${pad};">${tbl}</div>` : tbl;
  }
  return "";
}

function blocksToHTML(blocks, maxWidth = 600, bgColor = "") {
  const inner = blocks.map(blockToHTML).join("\n");
  const bg = bgColor ? `background:${bgColor};` : "";
  return `<div style="max-width:${maxWidth}px;${bg}">\n${inner}\n</div>`;
}

// ─── Block Preview ────────────────────────────────────────────────────────────
function BlockPreview({ block }) {
  const { t } = useI18n();
  const p = block.props;

  const op = (p) => ({ paddingTop: `${parseInt(p.paddingTop)||0}px`, paddingRight: `${parseInt(p.paddingRight)||0}px`, paddingBottom: `${parseInt(p.paddingBottom)||0}px`, paddingLeft: `${parseInt(p.paddingLeft)||0}px` });

  if (block.type === "text") return (
    <p style={{ margin: `${p.paddingTop}px 0 ${p.paddingBottom}px`, paddingLeft: `${parseInt(p.paddingLeft)||0}px`, paddingRight: `${parseInt(p.paddingRight)||0}px`, fontSize: p.fontSize, fontWeight: p.fontWeight, fontStyle: p.fontStyle, color: p.color, textAlign: p.textAlign, fontFamily: p.fontFamily || "Arial, Helvetica, sans-serif", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
      {p.content}
    </p>
  );

  if (block.type === "image") return (
    <div style={{ textAlign: p.align, ...op(p) }}>
      {p.src
        ? <img src={p.src} alt={p.alt} width={p.width} style={{ borderRadius: `${p.borderRadius}px`, display: "inline-block", maxWidth: "100%" }} />
        : <div style={{ width: p.width, height: 60, background: "#f0f0f0", border: "1px dashed #ccc", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#999", borderRadius: `${p.borderRadius}px` }}>{t("designer.imageEnterUrl")}</div>
      }
    </div>
  );

  if (block.type === "link") {
    const href = buildUrl(p.url, p);
    return (
      <div style={op(p)}>
        {p.asButton
          ? <a href={href} style={{ display: "inline-block", background: p.buttonBg, color: p.buttonColor, padding: "6px 14px", borderRadius: `${p.borderRadius}px`, textDecoration: "none", fontSize: p.fontSize, fontFamily: "Arial, sans-serif" }}>{p.label}</a>
          : <a href={href} style={{ color: p.color, fontSize: p.fontSize, fontFamily: "Arial, sans-serif" }}>{p.label}</a>
        }
      </div>
    );
  }

  if (block.type === "social") {
    const isVertical = p.direction === "vertical";
    const sz       = parseInt(p.iconSize) || 13;
    const lsz      = parseInt(p.fontSize) || 12;
    const gap      = parseInt(p.gap)      || 10;
    const iconGap  = parseInt(p.iconGap)  ?? 6;
    const ff       = p.fontFamily || "Arial, Helvetica, sans-serif";
    const fw       = p.fontWeight || "normal";
    const fs       = p.fontStyle  || "normal";
    const alignSelf  = p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start";
    const showIcon   = p.style !== "text-only";
    const showLabel  = p.style !== "icon-only";
    const labelStyle = { color: p.color, textDecoration: "none", fontSize: lsz, fontFamily: ff, fontWeight: fw, fontStyle: fs };

    if (isVertical) {
      const iconColW = showIcon ? sz + iconGap + 2 : 0;
      return (
        <div style={{ ...op(p), display: "flex", flexDirection: "column", alignItems: alignSelf }}>
          <table cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
            <tbody>
              {p.items.map((item, i) => {
                const icon = SOCIAL_ICONS[item.platform] || { icon: "🔗", label: item.platform };
                const href = buildUrl(item.url, { ...p, ...item });
                const pb   = i < p.items.length - 1 ? gap : 0;
                return (
                  <tr key={i}>
                    {showIcon && (
                      <td style={{ width: iconColW, textAlign: "center", paddingRight: iconGap, paddingBottom: pb, verticalAlign: "middle" }}>
                        <span style={{ fontSize: sz, color: p.color }}>{icon.icon}</span>
                      </td>
                    )}
                    {showLabel && (
                      <td style={{ paddingBottom: pb, verticalAlign: "middle" }}>
                        <a href={href} style={labelStyle}>{item.label || t(icon.labelKey)}</a>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    const justifyMap = { left: "flex-start", center: "center", right: "flex-end" };
    return (
      <div style={{ ...op(p), display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: justifyMap[p.align] || "flex-start", gap }}>
        {p.items.map((item, i) => {
          const icon = SOCIAL_ICONS[item.platform] || { icon: "🔗", label: item.platform };
          const href = buildUrl(item.url, { ...p, ...item });
          return (
            <a key={i} href={href} style={{ ...labelStyle, display: "inline-flex", alignItems: "center", gap: iconGap, fontSize: sz }}>
              {showIcon  && <span style={{ fontSize: sz }}>{icon.icon}</span>}
              {showLabel && <span style={{ fontSize: lsz, fontFamily: ff, fontWeight: fw, fontStyle: fs }}>{item.label || t(icon.labelKey)}</span>}
            </a>
          );
        })}
      </div>
    );
  }

  if (block.type === "banner") {
    const href = p.linkUrl ? buildUrl(p.linkUrl, p) : null;
    const r    = parseInt(p.borderRadius) || 0;

    // ── GIF mode: show the actual animated GIF ──
    if (p.gif_data) {
      const img = <img src={`data:image/gif;base64,${p.gif_data}`} alt={p.text} style={{ display: "block", width: "100%", borderRadius: r }} />;
      return href ? <a href={href} style={{ display: "block", textDecoration: "none" }}>{img}</a> : img;
    }

    // ── Scene mode without GIF: show first scene as static preview ──
    const sp = (Array.isArray(p.scenes) && p.scenes.length > 0) ? { ...p, ...p.scenes[0] } : p;
    const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
    const bg = sp.bgType === "gradient"
      ? `linear-gradient(${cssDirMap[sp.gradientDir] || "to right"}, ${sp.color1}, ${sp.color2})`
      : sp.color1;
    const pad     = parseInt(sp.padding) || 16;
    const h       = parseInt(p.height)   || 80;
    const justify = sp.textAlign === "center" ? "center" : sp.textAlign === "right" ? "flex-end" : "flex-start";
    const content = (
      <div style={{ textAlign: sp.textAlign }}>
        <p style={{ margin: 0, color: sp.textColor, fontSize: `${sp.fontSize}px`, fontWeight: sp.fontWeight, fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{sp.text}</p>
        {sp.subtext && <p style={{ margin: "6px 0 0", color: sp.subtextColor, fontSize: `${sp.subtextSize}px`, fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{sp.subtext}</p>}
      </div>
    );
    const wrapper = (
      <div style={{ background: bg, padding: pad, borderRadius: r, minHeight: h, display: "flex", alignItems: "center", justifyContent: justify }}>
        {content}
      </div>
    );
    return href ? <a href={href} style={{ textDecoration: "none", display: "block" }}>{wrapper}</a> : wrapper;
  }

  if (block.type === "disclaimer") return (
    <div style={{ fontSize: p.fontSize, color: p.color, textAlign: p.textAlign, padding: `${parseInt(p.paddingTop)||0}px ${parseInt(p.paddingRight)||0}px ${parseInt(p.paddingBottom)||0}px ${parseInt(p.paddingLeft)||0}px`, fontStyle: "italic", opacity: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
      <i className="ti ti-shield" style={{ fontSize: 12, flexShrink: 0 }} />
      <span>{t("designer.disclaimerPlaceholder")}</span>
    </div>
  );

  if (block.type === "divider") return (
    <div style={{ padding: `${p.margin}px ${parseInt(p.paddingRight)||0}px ${p.margin}px ${parseInt(p.paddingLeft)||0}px` }}>
      <hr style={{ border: "none", borderTop: `${p.thickness}px solid ${p.color}`, margin: 0 }} />
    </div>
  );

  if (block.type === "spacer") return (
    <div style={{ height: `${p.height}px`, paddingLeft: `${parseInt(p.paddingLeft)||0}px`, paddingRight: `${parseInt(p.paddingRight)||0}px`, fontSize: 0 }}>&nbsp;</div>
  );

  if (block.type === "columns") return (
    <div style={op(p)}>
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ fontFamily: "Arial, sans-serif" }}>
        <tbody><tr>
          <td width={`${p.leftWidth}%`} style={{ verticalAlign: "top", paddingRight: 8 }}>
            {(p.leftBlocks || []).map(b => <BlockPreview key={b.id} block={b} />)}
            {!(p.leftBlocks || []).length && <div style={{ fontSize: 11, color: "#aaa", padding: "4px 0" }}>—</div>}
          </td>
          <td style={{ verticalAlign: "top" }}>
            {(p.rightBlocks || []).map(b => <BlockPreview key={b.id} block={b} />)}
            {!(p.rightBlocks || []).length && <div style={{ fontSize: 11, color: "#aaa", padding: "4px 0" }}>—</div>}
          </td>
        </tr></tbody>
      </table>
    </div>
  );

  if (block.type === "table") {
    const bw = parseInt(p.borderWidth) || 1;
    const bc = p.borderColor || "#dddddd";
    const cp = parseInt(p.cellPadding) || 8;
    const bStyle = bw > 0 ? `${bw}px solid ${bc}` : "none";
    const nCols = (p.cells[0] || []).length || 1;
    return (
      <div style={op(p)}>
        <table width="100%" style={{ borderCollapse: "collapse", tableLayout: "fixed", fontFamily: "Arial,sans-serif" }}>
          <tbody>
            {(p.cells || []).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: bStyle, padding: cp, verticalAlign: "top", width: `${Math.floor(100/nCols)}%`, wordBreak: "break-word", background: cell.bg || p.tableBg || "transparent" }}>
                    {(cell.blocks || []).map(b => <BlockPreview key={b.id} block={b} />)}
                    {!(cell.blocks || []).length && <span style={{ fontSize: 10, color: "#aaa" }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

// ─── Prop Editors ─────────────────────────────────────────────────────────────
const iStyle = { width: "100%", padding: "7px 10px", background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ddd", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" };
const F = ({ label, children, hint }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{hint}</div>}
  </div>
);

function ColorInput({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 30, height: 28, padding: 2, border: "1px solid #2a2a2a", borderRadius: 4, cursor: "pointer", background: "#111" }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} style={{ ...iStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {ACCENT_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            style={{ width: 16, height: 16, borderRadius: 3, background: c, border: value === c ? "2px solid #fce499" : "1px solid #333", cursor: "pointer", padding: 0, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

function UTMEditor({ props, onChange }) {
  const { t } = useI18n();
  const hasUTM = props.utm_source || props.utm_medium || props.utm_campaign;
  const [open, setOpen] = useState(hasUTM);
  const preview = buildUrl(props.url || props.items?.[0]?.url || "", props);

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", padding: "6px 10px", background: open ? "#1a2a1a" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: open ? "#6ee7b7" : "#666", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ti ti-chart-bar" />
        {t("designer.utmTracking")} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: "10px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 6 }}>
          <F label="utm_source">
            <input style={iStyle} value={props.utm_source || ""} onChange={e => onChange({ utm_source: e.target.value })} placeholder={t("designer.utmSourcePlaceholder")} />
          </F>
          <F label="utm_medium">
            <input style={iStyle} value={props.utm_medium || ""} onChange={e => onChange({ utm_medium: e.target.value })} placeholder={t("designer.utmMediumPlaceholder")} />
          </F>
          <F label="utm_campaign">
            <input style={iStyle} value={props.utm_campaign || ""} onChange={e => onChange({ utm_campaign: e.target.value })} placeholder={t("designer.utmCampaignPlaceholder")} />
          </F>
          <F label="utm_content" hint={t("designer.utmContentHint")}>
            <input style={iStyle} value={props.utm_content || ""} onChange={e => onChange({ utm_content: e.target.value })} placeholder={t("designer.utmContentPlaceholder")} />
          </F>
          {(props.utm_source || props.utm_campaign) && (
            <div style={{ marginTop: 6, padding: "6px 8px", background: "#0a1a0a", borderRadius: 4, fontSize: 10, color: "#6ee7b7", wordBreak: "break-all", lineHeight: "16px" }}>
              {preview}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpacingEditor({ p, onUpdate, mode = "all" }) {
  const { t } = useI18n();
  const s = (k, v) => onUpdate({ ...p, [k]: v });
  const n = (k) => p[k] ?? "0";
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e" }}>
      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7 }}>{t("designer.spacingPx")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {mode === "all" && <>
          <F label={t("designer.spacingTop")}><input style={iStyle} type="number" min="0" value={n("paddingTop")} onChange={e => s("paddingTop", e.target.value)} /></F>
          <F label={t("designer.spacingBottom")}><input style={iStyle} type="number" min="0" value={n("paddingBottom")} onChange={e => s("paddingBottom", e.target.value)} /></F>
        </>}
        <F label={t("designer.spacingLeft")}><input style={iStyle} type="number" min="0" value={n("paddingLeft")} onChange={e => s("paddingLeft", e.target.value)} /></F>
        <F label={t("designer.spacingRight")}><input style={iStyle} type="number" min="0" value={n("paddingRight")} onChange={e => s("paddingRight", e.target.value)} /></F>
      </div>
    </div>
  );
}

function InsertBtn({ label, title, char, taRef, onInsert }) {
  const insert = () => {
    const el = taRef?.current;
    if (!el) { onInsert(char); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = el.value.slice(0, start) + char + el.value.slice(end);
    onInsert(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + char.length;
      el.focus();
    });
  };
  return (
    <button type="button" onClick={insert} title={title}
      style={{ padding: "2px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: "#888", fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
    </button>
  );
}

// ─── Disclaimer Prop Editor ───────────────────────────────────────────────────
function DisclaimerPropEditor({ p, onChange }) {
  const { t } = useI18n();
  const [disclaimers, setDisclaimers] = useState([]);
  const u = (k, v) => onChange({ ...p, [k]: v });

  useEffect(() => {
    fetch("/api/disclaimers/").then(r => r.json()).then(d => setDisclaimers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const selected = disclaimers.find(d => String(d.id) === String(p.disclaimer_id));

  return (
    <div>
      <F label={t("designer.disclaimerLabel")} hint={t("designer.disclaimerHint")}>
        <select style={iStyle} value={p.disclaimer_id || ""} onChange={e => u("disclaimer_id", e.target.value)}>
          <option value="">{t("designer.disclaimerNone")}</option>
          {disclaimers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </F>
      {selected && (
        <div style={{ marginBottom: 10, padding: "8px 10px", background: "#0a1a0a", border: "1px solid #1e2a1e", borderRadius: 6, fontSize: 11, color: "#6ee7b7", lineHeight: "17px" }}>
          <div style={{ fontWeight: 600, marginBottom: 3 }}>{selected.name}</div>
          <div style={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            dangerouslySetInnerHTML={{ __html: selected.html_content?.replace(/<[^>]+>/g, " ").trim().substring(0, 80) + "…" || "—" }} />
        </div>
      )}
      {disclaimers.length === 0 && (
        <div style={{ fontSize: 10, color: "#555", padding: "6px 8px", background: "#111", borderRadius: 5, marginBottom: 10 }}>
          {t("designer.disclaimerEmpty")}
        </div>
      )}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7 }}>{t("designer.styleLabel")}</div>
        <F label={t("designer.fontSize")}><input style={iStyle} value={p.fontSize} onChange={e => u("fontSize", e.target.value)} placeholder="11px" /></F>
        <F label={t("designer.color")}><ColorInput value={p.color} onChange={v => u("color", v)} /></F>
        <F label={t("designer.alignment")}>
          <select style={iStyle} value={p.textAlign} onChange={e => u("textAlign", e.target.value)}>
            {["left","center","right"].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
        <SpacingEditor p={p} onUpdate={onChange} />
      </div>
    </div>
  );
}

// ─── Banner Library Picker ────────────────────────────────────────────────────
function BannerLibraryPicker({ onInsert }) {
  const { t } = useI18n();
  const [open, setOpen]       = useState(false);
  const [banners, setBanners] = useState([]);

  function load() {
    fetch("/api/banners/").then(r => r.json()).then(d => setBanners(Array.isArray(d) ? d : [])).catch(() => {});
  }

  useEffect(() => { if (open) load(); }, [open]);

  const DEFAULT_BANNER = {
    height: "80", bgType: "solid", color1: "#fce499", color2: "#f08030",
    gradientDir: "horizontal", outlookColor: "#fce499",
    text: "Jetzt Termin buchen!", textColor: "#333333",
    fontSize: "16", fontWeight: "bold", textAlign: "center",
    subtext: "", subtextColor: "#555555", subtextSize: "12",
    linkUrl: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "",
    borderRadius: "8", padding: "16",
  };

  function renderPreview(propsJson) {
    let p = DEFAULT_BANNER;
    try { p = { ...DEFAULT_BANNER, ...JSON.parse(propsJson) }; } catch {}

    // GIF mode
    if (p.gif_data) {
      return <img src={`data:image/gif;base64,${p.gif_data}`} alt={p.text}
               style={{ display: "block", width: "100%", borderRadius: parseInt(p.borderRadius) || 0 }} />;
    }

    // Scene mode without GIF: use first scene's props
    const sp = (Array.isArray(p.scenes) && p.scenes.length > 0) ? { ...p, ...p.scenes[0] } : p;
    const cssDirMap = { horizontal: "to right", vertical: "to bottom", diagonal: "to bottom right" };
    const bg = sp.bgType === "gradient"
      ? `linear-gradient(${cssDirMap[sp.gradientDir] || "to right"}, ${sp.color1}, ${sp.color2})`
      : sp.color1;
    const h       = parseInt(p.height)       || 80;
    const r       = parseInt(p.borderRadius) || 0;
    const pad     = parseInt(sp.padding)     || 16;
    const justify = { center: "center", right: "flex-end", left: "flex-start" }[sp.textAlign] || "flex-start";
    return (
      <div style={{ background: bg, padding: pad, borderRadius: r, minHeight: h, display: "flex", alignItems: "center", justifyContent: justify }}>
        <p style={{ margin: 0, color: sp.textColor, fontSize: `${sp.fontSize}px`, fontWeight: sp.fontWeight, fontFamily: "Arial,sans-serif" }}>{sp.text}</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "6px 10px", background: open ? "#1a1a2a" : "#161616", border: "1px solid #2a2a2a", borderRadius: 7, color: open ? "#93c5fd" : "#555", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
        <i className="ti ti-library" style={{ fontSize: 12 }} />
        {t("designer.bannerLibraryLoad")} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 5, padding: 10, background: "#111", border: "1px solid #1e1e2e", borderRadius: 7 }}>
          {banners.length === 0 ? (
            <div style={{ fontSize: 11, color: "#444", textAlign: "center", padding: "10px 0" }}>
              {t("designer.bannerEmpty")}
            </div>
          ) : banners.map(b => {
            let bProps = DEFAULT_BANNER;
            try { bProps = { ...DEFAULT_BANNER, ...JSON.parse(b.props_json) }; } catch {}
            const isScene = Array.isArray(bProps.scenes) && bProps.scenes.length >= 1;
            return (
            <div key={b.id}
              onClick={() => { onInsert(bProps); setOpen(false); }}
              style={{ marginBottom: 8, cursor: "pointer", borderRadius: 6, overflow: "hidden", border: "1px solid #2a2a2a", transition: "border-color .1s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#fce499"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}>
              <div style={{ pointerEvents: "none" }}>{renderPreview(b.props_json)}</div>
              <div style={{ padding: "5px 8px", background: "#161616", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, flexShrink: 0,
                  background: isScene ? "#1a0f3a" : "#1a1500",
                  color:      isScene ? "#c4b5fd" : "#fce499",
                  border:     `1px solid ${isScene ? "#c4b5fd44" : "#fce49944"}`,
                  letterSpacing: ".3px",
                }}>{isScene ? "S" : "E"}</span>
                <span style={{ fontSize: 10, color: "#888", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{b.name}</span>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function resizeToMaxWidth(file, maxW) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxW) { resolve(ev.target.result); return; }
        const scale = maxW / img.width;
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = maxW; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, maxW, h);
        resolve(canvas.toDataURL(file.type || "image/png"));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImageSrcField({ value, onChange, iStyle }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const isData = value && value.startsWith("data:");
  const [showLibrary, setShowLibrary] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizeToMaxWidth(file, 600);
    onChange(resized);
    e.target.value = "";
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {showLibrary && (
        <ImageLibraryModal
          onSelect={url => { onChange(url); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
        />
      )}
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{t("designer.imageLabel")}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button onClick={() => fileRef.current.click()}
          style={{ flex: "0 0 auto", padding: "7px 10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#fce499", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <i className="ti ti-upload" style={{ fontSize: 13 }} /> {t("designer.imageUpload")}
        </button>
        <button onClick={() => setShowLibrary(true)}
          style={{ flex: "0 0 auto", padding: "7px 10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#fce499", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <i className="ti ti-photo-library" style={{ fontSize: 13 }} /> {t("images.title")}
        </button>
        <input style={{ ...iStyle, flex: 1, fontSize: 11 }} value={isData ? t("designer.imageEmbedded") : (value || "")}
          readOnly={isData}
          onChange={isData ? undefined : e => onChange(e.target.value)}
          placeholder="https://..." />
        {isData && (
          <button onClick={() => onChange("")}
            style={{ flex: "0 0 auto", padding: "7px 8px", background: "transparent", border: "1px solid #3a1a1a", borderRadius: 7, color: "#f87171", fontSize: 12, cursor: "pointer" }}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        )}
      </div>
      {isData && <div style={{ fontSize: 10, color: "#4ade80" }}>{t("designer.imageBase64Info")}</div>}
      {value && !isData && <div style={{ fontSize: 10, color: "#f87171" }}>{t("designer.imageExternalWarning")}</div>}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

function PropEditor({ block, onChange, selectedCell, onCellPropChange, varTarget }) {
  const { t } = useI18n();
  const p = block.props;
  const u = (key, val) => onChange({ ...p, [key]: val });
  const um = (updates) => onChange({ ...p, ...updates });
  const taRef = useRef(null);

  const trackFocus = (el, setValue) => {
    if (varTarget) varTarget.current = { el, setValue };
  };

  if (block.type === "text") return (
    <div>
      <F label={t("designer.content")}>
        <textarea ref={taRef} value={p.content} onChange={e => u("content", e.target.value)} rows={4} style={{ ...iStyle, resize: "vertical" }}
          onFocus={e => trackFocus(e.target, v => u("content", v))} />
        <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
          <InsertBtn label={`↵ ${t("designer.insertLinebreak")}`} title={t("designer.insertLinebreakTitle")} char={"\n"} taRef={taRef} onInsert={v => u("content", v)} />
          <InsertBtn label={`⇥ ${t("designer.insertTab")}`} title={t("designer.insertTabTitle")} char={"\t"} taRef={taRef} onInsert={v => u("content", v)} />
          <InsertBtn label={`· ${t("designer.insertMiddot")}`} title={t("designer.insertMiddotTitle")} char={"·"} taRef={taRef} onInsert={v => u("content", v)} />
          <InsertBtn label="©" title={t("designer.insertCopyrightTitle")} char={"©"} taRef={taRef} onInsert={v => u("content", v)} />
          <InsertBtn label="®" title={t("designer.insertRegisteredTitle")} char={"®"} taRef={taRef} onInsert={v => u("content", v)} />
          <InsertBtn label="™" title={t("designer.insertTrademarkTitle")} char={"™"} taRef={taRef} onInsert={v => u("content", v)} />
        </div>
      </F>
      <F label={t("designer.fontFamily")}>
        <select style={iStyle} value={p.fontFamily || "Arial, Helvetica, sans-serif"} onChange={e => u("fontFamily", e.target.value)}>
          {FONTS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f.split(",")[0].replace(/'/g, "")}
            </option>
          ))}
        </select>
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label={t("designer.fontSize")}><input style={iStyle} value={p.fontSize} onChange={e => u("fontSize", e.target.value)} placeholder="13px" /></F>
        <F label={t("designer.alignment")}>
          <select style={iStyle} value={p.textAlign} onChange={e => u("textAlign", e.target.value)}>
            {["left","center","right"].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
      </div>
      <F label={t("designer.color")}><ColorInput value={p.color} onChange={v => u("color", v)} /></F>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[["bold","B","fontWeight"],["italic","I","fontStyle"]].map(([val, label, key]) => (
          <button key={key} onClick={() => u(key, p[key] === val ? "normal" : val)}
            style={{ flex: 1, padding: "5px", background: p[key] === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p[key] === val ? "#1a1a0a" : "#888", fontWeight: key === "fontWeight" ? "bold" : "normal", fontStyle: key === "fontStyle" ? "italic" : "normal", cursor: "pointer", fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>
      <SpacingEditor p={p} onUpdate={onChange} />
    </div>
  );

  if (block.type === "image") return (
    <div>
      <ImageSrcField value={p.src} onChange={v => u("src", v)} iStyle={iStyle} />
      <F label={t("designer.altText")}><input style={iStyle} value={p.alt} onChange={e => u("alt", e.target.value)} placeholder={t("designer.altTextPlaceholder")} /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label={t("designer.widthPx")}><input style={iStyle} value={p.width} onChange={e => u("width", e.target.value)} /></F>
        <F label={t("designer.alignment")}>
          <select style={iStyle} value={p.align} onChange={e => u("align", e.target.value)}>
            {["left","center","right"].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </F>
      </div>
      <F label={t("designer.borderRadiusPx")}><input style={iStyle} type="number" value={p.borderRadius} onChange={e => u("borderRadius", e.target.value)} /></F>
      <F label={t("designer.linkUrlOptional")}><input style={iStyle} value={p.linkUrl} onChange={e => u("linkUrl", e.target.value)} placeholder="https://..." /></F>
      <SpacingEditor p={p} onUpdate={onChange} />
    </div>
  );

  if (block.type === "link") return (
    <div>
      <F label={t("designer.linkText")}><input style={iStyle} value={p.label} onChange={e => u("label", e.target.value)} /></F>
      <F label="URL"><input style={iStyle} value={p.url} onChange={e => u("url", e.target.value)} placeholder="https://..." /></F>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#888", cursor: "pointer", marginBottom: 10 }}>
        <input type="checkbox" checked={p.asButton} onChange={e => u("asButton", e.target.checked)} />
        {t("designer.asButton")}
      </label>
      {p.asButton ? (
        <>
          <F label={t("designer.buttonColor")}><ColorInput value={p.buttonBg} onChange={v => u("buttonBg", v)} /></F>
          <F label={t("designer.textColor")}><ColorInput value={p.buttonColor} onChange={v => u("buttonColor", v)} /></F>
          <F label={t("designer.borderRadius")}><input style={iStyle} value={p.borderRadius} onChange={e => u("borderRadius", e.target.value)} /></F>
        </>
      ) : (
        <F label={t("designer.linkColor")}><ColorInput value={p.color} onChange={v => u("color", v)} /></F>
      )}
      <F label={t("designer.fontSize")}><input style={iStyle} value={p.fontSize} onChange={e => u("fontSize", e.target.value)} /></F>
      <UTMEditor props={p} onChange={um} />
      <SpacingEditor p={p} onUpdate={onChange} />
    </div>
  );

  if (block.type === "social") return <SocialPropEditor p={p} onChange={onChange} varTarget={varTarget} />;

  if (block.type === "banner") return (
    <div>
      <BannerLibraryPicker onInsert={newProps => onChange(newProps)} />
    </div>
  );

  if (block.type === "divider") return (
    <div>
      <F label={t("designer.color")}><ColorInput value={p.color} onChange={v => u("color", v)} /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label={t("designer.thicknessPx")}><input style={iStyle} type="number" value={p.thickness} onChange={e => u("thickness", e.target.value)} /></F>
        <F label={t("designer.marginTopBottomPx")}><input style={iStyle} type="number" value={p.margin} onChange={e => u("margin", e.target.value)} /></F>
      </div>
      <SpacingEditor p={p} onUpdate={onChange} mode="lr" />
    </div>
  );

  if (block.type === "spacer") return (
    <div>
      <F label={t("designer.heightPx")}><input style={iStyle} type="number" value={p.height} onChange={e => u("height", e.target.value)} /></F>
      <SpacingEditor p={p} onUpdate={onChange} mode="lr" />
    </div>
  );

  if (block.type === "disclaimer") return <DisclaimerPropEditor p={p} onChange={onChange} />;

  if (block.type === "columns") return (
    <div>
      <F label={t("designer.leftColWidthPct")}>
        <input style={iStyle} type="number" value={p.leftWidth} onChange={e => u("leftWidth", e.target.value)} min={10} max={90} />
      </F>
      <div style={{ marginTop: 4, padding: "8px 10px", background: "#111", borderRadius: 6, fontSize: 11, color: "#555", lineHeight: "16px" }}>
        <i className="ti ti-drag-drop" style={{ marginRight: 4 }} />
        {t("designer.dragToColumns")}
      </div>
      <SpacingEditor p={p} onUpdate={onChange} />
    </div>
  );

  if (block.type === "table") {
    const sc = selectedCell;
    const scCell = sc ? (p.cells?.[sc.ri]?.[sc.ci]) : null;
    const BgRow = ({ label, value, onSet, onClear, clearLabel }) => (
      <F label={label}>
        <div style={{ display: "flex", gap: 6, height: 32 }}>
          <input type="color" value={value || "#ffffff"} onChange={e => onSet(e.target.value)}
            style={{ width: 32, height: "100%", padding: 2, border: "1px solid #2a2a2a", borderRadius: 5, cursor: "pointer", background: "#1a1a1a", flexShrink: 0 }} />
          <button onClick={onClear}
            style={{ flex: 1, padding: "4px 8px", background: value ? "#1a1a1a" : "#2a2a2a", border: "1px solid #2a2a2a", borderRadius: 5, color: value ? "#555" : "#aaa", fontSize: 11, cursor: "pointer" }}>
            {value || clearLabel}
          </button>
        </div>
      </F>
    );
    return (
      <div>
        <F label={t("designer.borderColor")}><ColorInput value={p.borderColor || "#dddddd"} onChange={v => u("borderColor", v)} /></F>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <F label={t("designer.borderWidthPx")}><input style={iStyle} type="number" value={p.borderWidth || "1"} onChange={e => u("borderWidth", e.target.value)} min={0} max={10} /></F>
          <F label={t("designer.cellPaddingPx")}><input style={iStyle} type="number" value={p.cellPadding || "8"} onChange={e => u("cellPadding", e.target.value)} min={0} max={40} /></F>
        </div>
        <BgRow label={t("designer.bgAllCells")} value={p.tableBg} onSet={v => u("tableBg", v)} onClear={() => u("tableBg", "")} clearLabel={t("designer.transparent")} />
        {scCell && (
          <div style={{ marginTop: 6, padding: "8px 10px", background: "#111", border: "1px solid #2a2a00", borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: "#fce499", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>
              Zelle [{sc.ri + 1},{sc.ci + 1}]
            </div>
            <BgRow label={t("designer.cellBgOverride")} value={scCell.bg}
              onSet={v => onCellPropChange(sc.ri, sc.ci, "bg", v)}
              onClear={() => onCellPropChange(sc.ri, sc.ci, "bg", "")}
              clearLabel={t("designer.likeTable")} />
          </div>
        )}
        {!scCell && (
          <div style={{ marginTop: 4, padding: "8px 10px", background: "#111", borderRadius: 6, fontSize: 11, color: "#555", lineHeight: "16px" }}>
            <i className="ti ti-click" style={{ marginRight: 4 }} />
            {t("designer.clickCellForColor")}
          </div>
        )}
        <SpacingEditor p={p} onUpdate={onChange} />
      </div>
    );
  }

  return null;
}

// ─── Social Prop Editor ───────────────────────────────────────────────────────
function SocialPropEditor({ p, onChange, varTarget }) {
  const { t } = useI18n();
  const [activeIdx, setActiveIdx] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const activeLabelRef = useRef(null);

  const u = (key, val) => onChange({ ...p, [key]: val });
  const updateItem = (i, updates) => {
    const items = p.items.map((it, j) => j === i ? { ...it, ...updates } : it);
    u("items", items);
  };
  const removeItem = (i) => {
    u("items", p.items.filter((_, j) => j !== i));
    setActiveIdx(prev => prev === i ? null : prev > i ? prev - 1 : prev);
  };
  const addItem = (platform) => {
    const newItem = {
      platform, label: "",
      url: platform === "email" ? "mailto:" : platform === "phone" ? "tel:" : "https://",
      utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "",
    };
    const items = [...p.items, newItem];
    u("items", items);
    setActiveIdx(items.length - 1);
    setShowAdd(false);
  };

  const activeItem = activeIdx !== null && activeIdx < p.items.length ? p.items[activeIdx] : null;

  return (
    <div>
      {/* Stil */}
      <F label={t("designer.socialStyle")}>
        <select style={iStyle} value={p.style} onChange={e => u("style", e.target.value)}>
          <option value="icon-text">{t("designer.socialStyleIconText")}</option>
          <option value="icon-only">{t("designer.socialStyleIconOnly")}</option>
          <option value="text-only">{t("designer.socialStyleTextOnly")}</option>
        </select>
      </F>

      <F label={t("designer.iconSizePx")}>
        <input style={iStyle} type="number" value={p.iconSize} onChange={e => u("iconSize", e.target.value)} />
      </F>
      <F label={t("designer.labelSizePx")}>
        <input style={iStyle} type="number" value={p.fontSize ?? "12"} onChange={e => u("fontSize", e.target.value)} />
      </F>
      <F label={t("designer.iconLabelGapPx")}>
        <input style={iStyle} type="number" value={p.iconGap ?? "6"} onChange={e => u("iconGap", e.target.value)} />
      </F>
      <F label={t("designer.itemGapPx")}>
        <input style={iStyle} type="number" value={p.gap} onChange={e => u("gap", e.target.value)} />
      </F>

      {/* Font */}
      <F label={t("designer.fontFamily")}>
        <select style={iStyle} value={p.fontFamily || "Arial, Helvetica, sans-serif"} onChange={e => u("fontFamily", e.target.value)}>
          {FONTS.map(f => <option key={f} value={f}>{f.split(",")[0].replace(/'/g, "")}</option>)}
        </select>
      </F>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[["bold","B","fontWeight","bold"],["italic","I","fontStyle","italic"]].map(([val, label, key, activeVal]) => (
          <button key={key} onClick={() => u(key, p[key] === activeVal ? "normal" : activeVal)}
            style={{ flex: 1, padding: "5px", background: p[key] === activeVal ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p[key] === activeVal ? "#1a1a0a" : "#888", fontWeight: key === "fontWeight" ? "bold" : "normal", fontStyle: key === "fontStyle" ? "italic" : "normal", cursor: "pointer", fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>
      {/* Direction + Align */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t("designer.direction")}</label>
          <div style={{ display: "flex", gap: 3 }}>
            {[["horizontal","ti-layout-columns",t("designer.dirHorizontal")],["vertical","ti-layout-rows",t("designer.dirVertical")]].map(([val, icon, title]) => (
              <button key={val} title={title} onClick={() => u("direction", val)}
                style={{ flex: 1, padding: "5px", background: p.direction === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.direction === val ? "#1a1a0a" : "#666", cursor: "pointer", fontSize: 13 }}>
                <i className={`ti ${icon}`} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t("designer.alignment")}</label>
          <div style={{ display: "flex", gap: 3 }}>
            {[["left","ti-align-left",t("designer.alignLeft")],["center","ti-align-center",t("designer.alignCenter")],["right","ti-align-right",t("designer.alignRight")]].map(([val, icon, title]) => (
              <button key={val} title={title} onClick={() => u("align", val)}
                style={{ flex: 1, padding: "5px", background: p.align === val ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, color: p.align === val ? "#1a1a0a" : "#666", cursor: "pointer", fontSize: 13 }}>
                <i className={`ti ${icon}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <F label={t("designer.color")}><ColorInput value={p.color} onChange={v => u("color", v)} /></F>

      {/* Items list */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <label style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: ".5px" }}>{t("designer.socialLinks")}</label>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAdd(o => !o)}
              style={{ padding: "2px 8px", background: showAdd ? "#2a3a2a" : "#1a1a1a", border: "1px solid #2a3a2a", borderRadius: 4, color: "#6ee7b7", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-plus" style={{ fontSize: 10 }} /> {t("designer.add")}
            </button>
            {showAdd && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 3px)", background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, zIndex: 200, padding: 4, minWidth: 150, boxShadow: "0 4px 16px rgba(0,0,0,.5)" }}>
                {Object.entries(SOCIAL_ICONS).map(([k, v]) => (
                  <button key={k} onClick={() => addItem(k)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", background: "none", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer", borderRadius: 5, textAlign: "left" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#222"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <span style={{ fontSize: 13, width: 16, textAlign: "center" }}>{v.icon}</span>{t(v.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 6, overflow: "hidden" }}>
          {p.items.length === 0 && (
            <div style={{ padding: "12px 10px", fontSize: 11, color: "#444", textAlign: "center" }}>{t("designer.socialNoLinks")}</div>
          )}
          {p.items.map((item, i) => {
            const icon = SOCIAL_ICONS[item.platform] || { icon: "🔗", label: item.platform };
            const isActive = activeIdx === i;
            return (
              <div key={i} onClick={() => setActiveIdx(isActive ? null : i)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "7px 8px",
                  background: isActive ? "#1e1e0a" : "transparent",
                  borderLeft: `2px solid ${isActive ? "#fce499" : "transparent"}`,
                  borderBottom: i < p.items.length - 1 ? "1px solid #1a1a1a" : "none",
                  cursor: "pointer", userSelect: "none",
                }}>
                <span style={{ fontSize: 13, width: 16, textAlign: "center", flexShrink: 0 }}>{icon.icon}</span>
                <span style={{ fontSize: 11, color: isActive ? "#fce499" : "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label || t(icon.labelKey)}
                </span>
                <span style={{ fontSize: 10, color: "#444", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(item.url || "").replace(/^https?:\/\//, "").replace(/^mailto:/, "").replace(/^tel:/, "")}
                </span>
                {(item.utm_campaign || item.utm_source) && (
                  <i className="ti ti-chart-bar" style={{ fontSize: 9, color: "#6ee7b7", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected item editor */}
      {activeItem && (
        <div style={{ padding: "10px 10px 4px", background: "#111", border: "1px solid #fce49933", borderRadius: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{SOCIAL_ICONS[activeItem.platform]?.icon || "🔗"}</span>
            <select style={{ ...iStyle, flex: 1 }} value={activeItem.platform}
              onChange={e => updateItem(activeIdx, { platform: e.target.value })}>
              {Object.entries(SOCIAL_ICONS).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
            </select>
            <button onClick={() => removeItem(activeIdx)}
              style={{ padding: "4px 7px", background: "#3a1a1a", border: "none", borderRadius: 5, color: "#f87171", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
          </div>
          <F label="URL">
            <input style={iStyle} value={activeItem.url}
              onChange={e => updateItem(activeIdx, { url: e.target.value })}
              onFocus={e => { if (varTarget) varTarget.current = { el: e.target, setValue: v => updateItem(activeIdx, { url: v }) }; }}
              placeholder="https://..." />
          </F>
          <F label={t("designer.label")}>
            <input style={{ ...iStyle, marginBottom: 5 }} value={activeItem.label || ""}
              ref={activeLabelRef}
              onChange={e => updateItem(activeIdx, { label: e.target.value })}
              onFocus={e => {
                activeLabelRef.current = e.target;
                if (varTarget) varTarget.current = { el: e.target, setValue: v => updateItem(activeIdx, { label: v }) };
              }}
              placeholder={SOCIAL_ICONS[activeItem.platform]?.label || ""} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {[["·",t("designer.insertMiddotTitle")],["©",t("designer.insertCopyrightTitle")],["®",t("designer.insertRegisteredTitle")],["™",t("designer.insertTrademarkTitle")]].map(([char, title]) => (
                <InsertBtn key={char} label={char} title={title} char={char}
                  taRef={activeLabelRef}
                  onInsert={v => updateItem(activeIdx, { label: v })} />
              ))}
            </div>
          </F>
          <UTMEditor props={activeItem} onChange={updates => updateItem(activeIdx, updates)} />
        </div>
      )}
      <SpacingEditor p={p} onUpdate={onChange} />
    </div>
  );
}

// ─── Icon Picker ─────────────────────────────────────────────────────────────
const ICON_SETS = {
  "contact":  ["📞","📱","✉️","📠","💬","🌐","📍","🏠","🏢","📧"],
  "business": ["💼","📋","📄","📝","✅","❌","⭐","🔑","💡","📊","📈","🔔","📅","🕐"],
  "people":   ["👤","👥","🤝","👨‍💼","👩‍💼","🎓","👋"],
  "arrows":   ["→","←","↑","↓","↗","↙","↔","➜","➝","▶","◀","▸","◂","»","«","›","‹"],
  "signs":    ["✓","✗","★","☆","●","○","■","□","◆","◇","▲","▼","•","◉","❖"],
  "symbols":  ["©","®","™","°","±","×","÷","€","$","£","¥","#","@","&","§","–","—"],
};

const ICON_SET_LABEL_KEYS = {
  "contact":  "designer.iconCatContact",
  "business": "designer.iconCatBusiness",
  "people":   "designer.iconCatPeople",
  "arrows":   "designer.iconCatArrows",
  "signs":    "designer.iconCatSigns",
  "symbols":  "designer.iconCatSymbols",
};

function IconPicker({ varTarget }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("contact");

  function insertIcon(e, icon) {
    e.preventDefault();
    const vt = varTarget.current;
    if (!vt?.el) return;
    const el = vt.el;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const newVal = el.value.slice(0, start) + icon + el.value.slice(end);
    vt.setValue(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + [...icon].length;
      el.focus();
    });
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "6px 10px", background: open ? "#1a1a2a" : "#161616", border: "1px solid #2a2a2a", borderRadius: 7, color: open ? "#93c5fd" : "#555", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
        <i className="ti ti-mood-smile" style={{ fontSize: 12 }} />
        {t("designer.iconPickerInsert")} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 5, padding: "10px", background: "#111", border: "1px solid #1e1e2e", borderRadius: 7 }}>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 7, lineHeight: "15px" }}>
            {t("designer.iconPickerHint")}
          </div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
            {Object.keys(ICON_SETS).map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: "2px 8px", background: cat === c ? "#fce499" : "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, color: cat === c ? "#1a1a0a" : "#666", fontSize: 10, cursor: "pointer", fontWeight: cat === c ? 700 : 400 }}>
                {t(ICON_SET_LABEL_KEYS[c])}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {ICON_SETS[cat].map((icon, i) => (
              <button key={i} title={icon} onMouseDown={e => insertIcon(e, icon)}
                style={{ width: 30, height: 30, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Variable Picker ──────────────────────────────────────────────────────────
const SENDER_VARS = [
  { key: "vorname",          labelKey: "designer.varFirstName" },
  { key: "nachname",         labelKey: "designer.varLastName" },
  { key: "name",             labelKey: "designer.varFullName" },
  { key: "email",            labelKey: "designer.varEmail" },
  { key: "berufsbezeichnung",labelKey: "designer.varJobTitle" },
  { key: "firma",            labelKey: "designer.varCompany" },
  { key: "telefon",          labelKey: "designer.varPhone" },
  { key: "mobil",            labelKey: "designer.varMobile" },
  { key: "strasse",          labelKey: "designer.varStreet" },
  { key: "plz",              labelKey: "designer.varZip" },
  { key: "ort",              labelKey: "designer.varCity" },
  { key: "land",             labelKey: "designer.varCountry" },
  { key: "adresse",          labelKey: "designer.varFullAddress" },
  { key: "foto",             labelKey: "designer.varPhotoUrl" },
];

function VarPicker({ varTarget }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function insertVar(e, key) {
    e.preventDefault();
    const vt = varTarget.current;
    if (!vt?.el) return;
    const el = vt.el;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? el.value.length;
    const token = `{{${key}}}`;
    const newVal = el.value.slice(0, start) + token + el.value.slice(end);
    vt.setValue(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + token.length;
      el.focus();
    });
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "6px 10px", background: open ? "#1a2a1a" : "#161616", border: "1px solid #2a2a2a", borderRadius: 7, color: open ? "#6ee7b7" : "#555", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
        <i className="ti ti-variable" style={{ fontSize: 12 }} />
        {t("designer.varPickerInsert")} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 5, padding: "10px", background: "#111", border: "1px solid #1e2a1e", borderRadius: 7 }}>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 7, lineHeight: "15px" }}>
            {t("designer.varPickerHint")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {SENDER_VARS.map(({ key, labelKey }) => (
              <button key={key} title={t(labelKey)}
                onMouseDown={e => insertVar(e, key)}
                style={{ padding: "3px 7px", background: "#1a2a1a", border: "1px solid #2a3a2a", borderRadius: 5, color: "#6ee7b7", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                {`{{${key}}}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({ onDrop, isActive }) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(); }}
      style={{
        height: over ? 36 : isActive ? 20 : 4,
        margin: "2px 0",
        borderRadius: 6,
        border: over ? "2px dashed #fce499" : isActive ? "1px dashed #444" : "1px dashed transparent",
        background: over ? "#2a2000" : "transparent",
        transition: "all .15s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      {over && <span style={{ fontSize: 11, color: "#fce499" }}>{t("designer.dropHere")}</span>}
    </div>
  );
}

// ─── Inline Canvas Content ────────────────────────────────────────────────────
function InlineCanvasContent({ block, isSelected, onUpdate, selectedSubId, onSelectSub, draggingType, onDropToColumn, onRemoveSubBlock, onUpdateSub, onDropToCell, onRemoveFromCell, onAddRow, onRemoveRow, onAddCol, onRemoveCol, selectedCellPos, onSelectCell, onSelectParentBlock, varTarget }) {
  const { t } = useI18n();
  const p = block.props;
  const containerRef = useRef(null);
  const inlineTextRef = useRef(null);
  const [handleHover, setHandleHover] = useState(false);

  const ta = {
    width: "100%", resize: "vertical", boxSizing: "border-box",
    background: "#0d0d0d", border: "1px solid #fce49966", borderRadius: 4,
    padding: "4px 6px", fontFamily: "Arial, Helvetica, sans-serif",
    lineHeight: "1.5", outline: "none",
  };

  const startColResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startLeft = parseFloat(p.leftWidth) || 50;
    setHandleHover(true);
    const onMove = (ev) => {
      if (!containerRef.current) return;
      const w = containerRef.current.getBoundingClientRect().width;
      const delta = ((ev.clientX - startX) / w) * 100;
      const next = Math.max(10, Math.min(90, startLeft + delta));
      onUpdate({ ...p, leftWidth: String(Math.round(next * 10) / 10) });
    };
    const onUp = () => {
      setHandleHover(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (isSelected && block.type === "text") return (
    <div onClick={e => e.stopPropagation()}>
      <textarea
        ref={inlineTextRef}
        value={p.content}
        onChange={e => onUpdate({ ...p, content: e.target.value })}
        onFocus={() => { if (varTarget) varTarget.current = { el: inlineTextRef.current, setValue: v => onUpdate({ ...p, content: v }) }; }}
        rows={Math.max(2, (p.content.match(/\n/g) || []).length + 1)}
        style={{ ...ta, margin: `${p.paddingTop}px 0 ${p.paddingBottom}px`, fontFamily: p.fontFamily || "Arial, Helvetica, sans-serif", fontSize: p.fontSize, fontWeight: p.fontWeight, fontStyle: p.fontStyle, color: p.color, textAlign: p.textAlign }}
      />
      <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
        <InsertBtn label="↵" title={t("designer.insertLinebreakTitle")} char={"\n"} taRef={inlineTextRef} onInsert={v => onUpdate({ ...p, content: v })} />
        <InsertBtn label="⇥" title={t("designer.insertTabTitle")} char={"\t"} taRef={inlineTextRef} onInsert={v => onUpdate({ ...p, content: v })} />
        <InsertBtn label="·" title={t("designer.insertMiddotTitle")} char={"·"} taRef={inlineTextRef} onInsert={v => onUpdate({ ...p, content: v })} />
        <InsertBtn label="©" title={t("designer.insertCopyrightTitle")} char={"©"} taRef={inlineTextRef} onInsert={v => onUpdate({ ...p, content: v })} />
        <InsertBtn label="®" title={t("designer.insertRegisteredTitle")} char={"®"} taRef={inlineTextRef} onInsert={v => onUpdate({ ...p, content: v })} />
        <InsertBtn label="™" title={t("designer.insertTrademarkTitle")} char={"™"} taRef={inlineTextRef} onInsert={v => onUpdate({ ...p, content: v })} />
      </div>
    </div>
  );

  if (isSelected && block.type === "image") {
    const w = parseInt(p.width) || 120;
    const startImgResize = (e) => {
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX;
      const onMove = (ev) => {
        const newW = Math.max(20, w + (ev.clientX - startX));
        onUpdate({ ...p, width: String(Math.round(newW)) });
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    return (
      <div style={{ textAlign: p.align, padding: "4px 0" }}>
        <div style={{ display: "inline-block", position: "relative" }}>
          {p.src
            ? <img src={p.src} alt={p.alt} width={w} style={{ borderRadius: `${p.borderRadius}px`, display: "block", maxWidth: "100%" }} />
            : <div style={{ width: w, height: 60, background: "#1a1a1a", border: "1px dashed #444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#555", borderRadius: `${p.borderRadius}px` }}>{t("designer.imageEnterUrl")}</div>
          }
          {/* Right-edge resize handle */}
          <div
            onMouseDown={startImgResize}
            onClick={e => e.stopPropagation()}
            title={t("designer.resizeWidth")}
            style={{
              position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)",
              width: 14, height: 32, cursor: "ew-resize",
              background: "#fce499", borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ display: "flex", gap: 2 }}>
              <div style={{ width: 1.5, height: 12, background: "#1a1a0a", borderRadius: 1 }} />
              <div style={{ width: 1.5, height: 12, background: "#1a1a0a", borderRadius: 1 }} />
            </div>
          </div>
          {/* Width label */}
          <div style={{ position: "absolute", bottom: -17, left: 0, fontSize: 9, color: "#666", whiteSpace: "nowrap", pointerEvents: "none" }}>
            {w}px
          </div>
        </div>
      </div>
    );
  }

  if (isSelected && block.type === "link") return (
    <div style={{ padding: "4px 0" }}>
      {p.asButton
        ? <span style={{ display: "inline-block", background: p.buttonBg, padding: `6px 14px`, borderRadius: `${p.borderRadius}px` }}>
            <input value={p.label} onChange={e => onUpdate({ ...p, label: e.target.value })}
              onClick={e => e.stopPropagation()}
              style={{ background: "transparent", border: "1px solid #fce49966", borderRadius: 3, outline: "none", padding: "1px 4px", color: p.buttonColor, fontSize: p.fontSize, fontFamily: "Arial,sans-serif" }} />
          </span>
        : <input value={p.label} onChange={e => onUpdate({ ...p, label: e.target.value })}
            onClick={e => e.stopPropagation()}
            style={{ background: "transparent", border: "1px solid #fce49966", borderRadius: 3, outline: "none", padding: "1px 4px", color: p.color, fontSize: p.fontSize, fontFamily: "Arial,sans-serif" }} />
      }
    </div>
  );

  if (block.type === "columns") {
    const canDrop = !!draggingType && draggingType !== "columns";
    const leftPct = parseFloat(p.leftWidth) || 50;

    const renderCol = (side, subBlocks) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 600, marginBottom: 4, paddingLeft: 2 }}>
          {side === "left" ? `← ${t("designer.colLeft")} (${Math.round(leftPct)}%)` : `${t("designer.colRight")} (${Math.round(100 - leftPct)}%) →`}
        </div>
        <div
          style={{
            minHeight: 52, borderRadius: 6, padding: "4px 4px 2px",
            border: `1px dashed ${canDrop ? "#fce499" : "#2a2a2a"}`,
            background: canDrop ? "#1e1e0a" : "#131313",
            transition: "border-color .15s, background .15s",
          }}
          onDragOver={e => { if (canDrop) { e.preventDefault(); e.stopPropagation(); }}}
          onDrop={e => { if (canDrop) { e.preventDefault(); e.stopPropagation(); onDropToColumn(side); }}}
        >
          {subBlocks.map(sb => (
            <div key={sb.id}
              style={{
                position: "relative", borderRadius: 4, marginBottom: 3, cursor: "pointer", padding: "2px 4px",
                outline: selectedSubId === sb.id ? "1px solid #fce49966" : "none",
                outlineOffset: 1,
                background: selectedSubId === sb.id ? "#1e1e0a" : "transparent",
              }}
              onClick={e => { e.stopPropagation(); onSelectSub(sb.id === selectedSubId ? null : sb.id); }}
            >
              {selectedSubId === sb.id
                ? <InlineCanvasContent block={sb} isSelected={true} onUpdate={np => onUpdateSub(sb.id, np)} varTarget={varTarget} />
                : <BlockPreview block={sb} />
              }
              {selectedSubId === sb.id && (
                <button onClick={e => { e.stopPropagation(); onRemoveSubBlock(side, sb.id); }}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, border: "none", borderRadius: 3, background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-trash" />
                </button>
              )}
            </div>
          ))}
          {canDrop && (
            <div style={{ padding: "5px 0", fontSize: 10, color: "#fce499", textAlign: "center", borderRadius: 4, border: "1px dashed #fce49966", marginTop: subBlocks.length ? 3 : 0 }}>
              {t("designer.dropHere")}
            </div>
          )}
          {!canDrop && subBlocks.length === 0 && (
            <div style={{ padding: "10px 0", fontSize: 10, color: "#444", textAlign: "center" }}>
              {t("designer.dragElementHere")}
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div ref={containerRef} style={{ display: "flex", alignItems: "stretch", gap: 0, userSelect: "none" }}>
        <div style={{ width: `${leftPct}%`, minWidth: 0, paddingRight: 4 }}>
          {renderCol("left", p.leftBlocks || [])}
        </div>

        {/* Drag-Resize-Handle */}
        <div
          onMouseDown={startColResize}
          onMouseEnter={() => setHandleHover(true)}
          onMouseLeave={() => setHandleHover(false)}
          onClick={e => e.stopPropagation()}
          title={t("designer.resizeColumnWidth")}
          style={{ width: 12, flexShrink: 0, cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}
        >
          <div style={{
            width: 2, borderRadius: 2, height: "100%", minHeight: 40,
            background: handleHover ? "#fce499" : "#2a2a2a",
            boxShadow: handleHover ? "0 0 6px #fce49966" : "none",
            transition: "background .15s, box-shadow .15s",
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
          {renderCol("right", p.rightBlocks || [])}
        </div>
      </div>
    );
  }

  if (block.type === "table") {
    const cells = p.cells || [];
    const nRows = cells.length;
    const nCols = (cells[0] || []).length;
    const canDrop = !!draggingType && draggingType !== "columns" && draggingType !== "table";
    const bw = parseInt(p.borderWidth) || 1;
    const bc = p.borderColor || "#444";
    const bStyle = bw > 0 ? `${bw}px solid ${bc}` : "none";
    const cp = parseInt(p.cellPadding) || 8;
    const btnSm = { border: "none", borderRadius: 3, cursor: "pointer", padding: "1px 6px", lineHeight: "16px", fontSize: 10 };

    return (
      <div>
        {/* Titelleiste — immer klickbar, selektiert die Tabelle */}
        <div
          onClick={e => { e.stopPropagation(); onSelectParentBlock?.(); }}
          title={t("designer.selectTable")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 6px 3px", marginBottom: 4, cursor: "pointer", borderRadius: "4px 4px 0 0", background: isSelected ? "#1e1e0a" : "#161616", border: `1px solid ${isSelected ? "#fce49944" : "#222"}`, borderBottom: "none" }}
        >
          <i className="ti ti-table" style={{ fontSize: 11, color: isSelected ? "#fce499" : "#555" }} />
          <span style={{ fontSize: 9, color: isSelected ? "#fce499" : "#555", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>{t("designer.blockTable")}</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#444" }}>{nRows} × {nCols}</span>
        </div>

        {/* Column-delete header row */}
        <div style={{ display: "flex", marginBottom: 3, paddingLeft: 26 }}>
          {Array.from({ length: nCols }).map((_, ci) => (
            <div key={ci} style={{ flex: 1, textAlign: "center" }}>
              {nCols > 1 && (
                <button onClick={e => { e.stopPropagation(); onRemoveCol(ci); }} style={{ ...btnSm, background: "#2a1212", color: "#f87171" }}>
                  × {t("designer.tableCol")}{ci + 1}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {/* Row-delete buttons */}
          <div style={{ width: 24, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            {cells.map((_, ri) => (
              <div key={ri} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: cp * 2 + 36, marginRight: 2 }}>
                {nRows > 1 && (
                  <button onClick={e => { e.stopPropagation(); onRemoveRow(ri); }} style={{ ...btnSm, background: "#2a1212", color: "#f87171", padding: "2px 3px" }}>×</button>
                )}
              </div>
            ))}
          </div>

          {/* Table */}
          <table style={{ flex: 1, borderCollapse: "collapse", tableLayout: "fixed", width: "100%", minWidth: 0 }}>
            <tbody>
              {cells.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isCellSelected = selectedCellPos?.ri === ri && selectedCellPos?.ci === ci;
                    const cellBg = cell.bg || p.tableBg || "";
                    return (
                      <td key={ci}
                        onClick={e => { e.stopPropagation(); onSelectCell(ri, ci); }}
                        style={{
                          border: bStyle, padding: cp, verticalAlign: "top", cursor: "default",
                          background: canDrop ? "#1e1e0a" : (cellBg || "transparent"),
                          outline: isCellSelected ? "2px solid #fce49988" : "none",
                          outlineOffset: -2, transition: "background .1s",
                        }}
                        onDragOver={e => { if (canDrop) { e.preventDefault(); e.stopPropagation(); }}}
                        onDrop={e => { if (canDrop) { e.preventDefault(); e.stopPropagation(); onDropToCell(ri, ci, draggingType); }}}
                      >
                        {(cell.blocks || []).map(sub => (
                          <div key={sub.id}
                            style={{ position: "relative", cursor: "pointer", borderRadius: 3, marginBottom: 2,
                              outline: selectedSubId === sub.id ? "1px solid #fce49966" : "none", outlineOffset: 1,
                              background: selectedSubId === sub.id ? "#1e1e0a" : "transparent" }}
                            onClick={e => { e.stopPropagation(); onSelectSub(sub.id === selectedSubId ? null : sub.id); }}
                          >
                            {selectedSubId === sub.id
                              ? <InlineCanvasContent block={sub} isSelected={true} onUpdate={np => onUpdateSub(sub.id, np)} varTarget={varTarget} />
                              : <BlockPreview block={sub} />
                            }
                            {selectedSubId === sub.id && (
                              <button onClick={e => { e.stopPropagation(); onRemoveFromCell(ri, ci, sub.id); }}
                                style={{ position: "absolute", top: 1, right: 1, width: 16, height: 16, border: "none", borderRadius: 2, background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {!(cell.blocks || []).length && !canDrop && (
                          <div style={{ fontSize: 9, color: "#444", textAlign: "center", padding: "8px 0" }}>—</div>
                        )}
                        {canDrop && (
                          <div style={{ fontSize: 9, color: "#fce499", textAlign: "center", padding: "3px 0", border: "1px dashed #fce49966", borderRadius: 2, marginTop: (cell.blocks || []).length ? 2 : 0 }}>↓</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row / col */}
        <div style={{ display: "flex", gap: 6, marginTop: 6, paddingLeft: 26 }}>
          <button onClick={e => { e.stopPropagation(); onAddRow(); }} style={{ padding: "3px 10px", background: "#1a1a1a", border: "1px dashed #333", borderRadius: 4, color: "#666", cursor: "pointer", fontSize: 11 }}>+ {t("designer.tableRow")}</button>
          <button onClick={e => { e.stopPropagation(); onAddCol(); }} style={{ padding: "3px 10px", background: "#1a1a1a", border: "1px dashed #333", borderRadius: 4, color: "#666", cursor: "pointer", fontSize: 11 }}>+ {t("designer.tableColAdd")}</button>
        </div>
      </div>
    );
  }

  return <BlockPreview block={block} />;
}

// ─── Main Designer ────────────────────────────────────────────────────────────
export default function SignatureDesigner({ signature, onSave, onCancel, toast }) {
  const { t } = useI18n();
  const [name, setName] = useState(signature?.name || "");
  const [isDefault, setIsDefault] = useState(signature?.is_default || false);

  const [blocks, setBlocks] = useState(() => {
    if (signature?.designer_json) {
      try {
        const parsed = JSON.parse(signature.designer_json);
        const raw = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        return assignIds(raw);
      } catch {}
    }
    return [
      { id: 1, type: "divider",  props: { ...DEFAULT_PROPS.divider } },
      { id: 2, type: "columns",  props: { leftWidth: "50", leftBlocks: [], rightBlocks: [] } },
      { id: 3, type: "spacer",   props: { height: "8" } },
      { id: 4, type: "text",     props: { ...DEFAULT_PROPS.text, content: t("designer.defaultFirmName"), fontWeight: "bold", fontSize: "13px" } },
      { id: 5, type: "social",   props: { ...DEFAULT_PROPS.social } },
    ];
  });

  const [maxWidth, setMaxWidth] = useState(() => {
    if (signature?.designer_json) {
      try {
        const parsed = JSON.parse(signature.designer_json);
        if (!Array.isArray(parsed)) return parsed.maxWidth || 600;
      } catch {}
    }
    return 600;
  });
  const [bgColor, setBgColor] = useState(() => {
    if (signature?.designer_json) {
      try {
        const parsed = JSON.parse(signature.designer_json);
        if (!Array.isArray(parsed)) return parsed.bgColor || "";
      } catch {}
    }
    return "";
  });

  const [selected, setSelected] = useState(null);
  const [draggingType, setDraggingType] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [showDropZones, setShowDropZones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("editor");
  const [htmlEdit, setHtmlEdit] = useState(null); // null = auto-generated
  const [selectedCell, setSelectedCell] = useState(null); // { tableId, ri, ci }
  const [showTemplates, setShowTemplates] = useState(false);
  // Tracks last focused text input for variable insertion
  const varTarget = useRef(null); // { el: HTMLElement, setValue: (newVal: string) => void }

  // Find selected block — searches top-level, columns sub-blocks, and table cells
  const selBlock = (() => {
    if (!selected) return null;
    const top = blocks.find(b => b.id === selected);
    if (top) return top;
    for (const b of blocks) {
      if (b.type === "columns") {
        const inL = (b.props.leftBlocks  || []).find(s => s.id === selected);
        if (inL) return inL;
        const inR = (b.props.rightBlocks || []).find(s => s.id === selected);
        if (inR) return inR;
      }
      if (b.type === "table") {
        for (const row of b.props.cells || [])
          for (const cell of row) {
            const found = (cell.blocks || []).find(s => s.id === selected);
            if (found) return found;
          }
      }
    }
    return null;
  })();

  function addBlockAt(type, insertIndex) {
    const id = ++idCounter;
    setBlocks(prev => {
      const arr = [...prev];
      arr.splice(insertIndex, 0, { id, type, props: { ...DEFAULT_PROPS[type] } });
      return arr;
    });
    setSelected(id);
    setDraggingType(null);
    setShowDropZones(false);
  }

  function moveBlockTo(fromId, toIndex) {
    setBlocks(prev => {
      const arr = [...prev];
      const fi = arr.findIndex(b => b.id === fromId);
      if (fi < 0) return prev;
      const [item] = arr.splice(fi, 1);
      arr.splice(Math.min(toIndex, arr.length), 0, item);
      return arr;
    });
    setDraggingId(null);
    setShowDropZones(false);
  }

  function removeBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selected === id) setSelected(null);
  }

  // Updates props for top-level blocks, columns sub-blocks, and table cell sub-blocks
  function updateProps(id, newProps) {
    setBlocks(prev => prev.map(b => {
      if (b.id === id) return { ...b, props: newProps };
      if (b.type === "columns") {
        return { ...b, props: {
          ...b.props,
          leftBlocks:  (b.props.leftBlocks  || []).map(s => s.id === id ? { ...s, props: newProps } : s),
          rightBlocks: (b.props.rightBlocks || []).map(s => s.id === id ? { ...s, props: newProps } : s),
        }};
      }
      if (b.type === "table") {
        return { ...b, props: { ...b.props, cells: b.props.cells.map(row =>
          row.map(cell => ({ ...cell, blocks: cell.blocks.map(s => s.id === id ? { ...s, props: newProps } : s) }))
        )}};
      }
      return b;
    }));
  }

  function addToColumn(columnId, side, type) {
    const id = ++idCounter;
    const key = side === "left" ? "leftBlocks" : "rightBlocks";
    setBlocks(prev => prev.map(b => {
      if (b.id !== columnId) return b;
      return { ...b, props: { ...b.props, [key]: [...(b.props[key] || []), { id, type, props: { ...DEFAULT_PROPS[type] } }] } };
    }));
    setSelected(id);
    setDraggingType(null);
    setShowDropZones(false);
  }

  function removeSubBlock(columnId, side, subId) {
    const key = side === "left" ? "leftBlocks" : "rightBlocks";
    setBlocks(prev => prev.map(b => {
      if (b.id !== columnId) return b;
      return { ...b, props: { ...b.props, [key]: b.props[key].filter(s => s.id !== subId) } };
    }));
    if (selected === subId) setSelected(null);
  }

  function updateCellProp(tableId, ri, ci, key, val) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId) return b;
      return { ...b, props: { ...b.props, cells: b.props.cells.map((row, r) =>
        row.map((cell, c) => r === ri && c === ci ? { ...cell, [key]: val } : cell)
      )}};
    }));
  }

  function addToTableCell(tableId, ri, ci, type) {
    const id = ++idCounter;
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId) return b;
      return { ...b, props: { ...b.props, cells: b.props.cells.map((row, r) =>
        row.map((cell, c) => r === ri && c === ci
          ? { ...cell, blocks: [...cell.blocks, { id, type, props: { ...DEFAULT_PROPS[type] } }] }
          : cell)
      )}};
    }));
    setSelected(id);
    setDraggingType(null);
    setShowDropZones(false);
  }

  function removeFromTableCell(tableId, ri, ci, subId) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId) return b;
      return { ...b, props: { ...b.props, cells: b.props.cells.map((row, r) =>
        row.map((cell, c) => r === ri && c === ci
          ? { ...cell, blocks: cell.blocks.filter(s => s.id !== subId) }
          : cell)
      )}};
    }));
    if (selected === subId) setSelected(null);
  }

  function addTableRow(tableId) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId) return b;
      const nCols = (b.props.cells[0] || []).length || 2;
      return { ...b, props: { ...b.props, cells: [...b.props.cells, Array.from({ length: nCols }, () => ({ blocks: [] }))] } };
    }));
  }

  function removeTableRow(tableId, ri) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId || b.props.cells.length <= 1) return b;
      return { ...b, props: { ...b.props, cells: b.props.cells.filter((_, r) => r !== ri) } };
    }));
  }

  function addTableCol(tableId) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId) return b;
      return { ...b, props: { ...b.props, cells: b.props.cells.map(row => [...row, { blocks: [] }]) } };
    }));
  }

  function removeTableCol(tableId, ci) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== tableId || (b.props.cells[0] || []).length <= 1) return b;
      return { ...b, props: { ...b.props, cells: b.props.cells.map(row => row.filter((_, c) => c !== ci)) } };
    }));
  }

  async function save() {
    if (!name.trim()) { toast("err", t("designer.toastNameRequired")); return; }
    setSaving(true);
    const html = htmlEdit ?? blocksToHTML(blocks, maxWidth, bgColor);
    const designerJson = JSON.stringify({ blocks: blocks.map(({ id, ...b }) => b), maxWidth, bgColor });
    const text_content = blocks.flatMap(b => {
      if (b.type === "text") return [b.props.content];
      if (b.type === "columns") return [
        ...(b.props.leftBlocks  || []).filter(s => s.type === "text").map(s => s.props.content),
        ...(b.props.rightBlocks || []).filter(s => s.type === "text").map(s => s.props.content),
      ];
      if (b.type === "table") return (b.props.cells || []).flatMap(row =>
        row.flatMap(cell => (cell.blocks || []).filter(s => s.type === "text").map(s => s.props.content))
      );
      return [];
    }).join("\n");
    const payload = { name: name.trim(), html_content: html, text_content, is_default: isDefault, designer_json: designerJson };
    try {
      if (signature?.id) {
        const r = await fetch(API + `/api/signatures/${signature.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(await r.text());
        toast("ok", t("designer.toastSaved"));
      } else {
        const r = await fetch(API + "/api/signatures/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(await r.text());
        toast("ok", t("designer.toastCreated"));
      }
      onSave();
    } catch (e) { toast("err", t("designer.toastError") + e.message); }
    setSaving(false);
  }

  const btnTab = (tabKey) => ({
    padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
    border: "none", cursor: "pointer", textTransform: "uppercase",
    background: tab === tabKey ? "#fce499" : "#222",
    color: tab === tabKey ? "#1a1a0a" : "#666",
  });

  const isDragging = draggingType !== null || draggingId !== null;

  return (
    <div style={{ fontFamily: "var(--font-sans, Arial)" }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={onCancel} style={{ padding: "7px 12px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 7, color: "#888", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-arrow-left" /> {t("designer.back")}
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", flex: 1 }}>{t("designer.title")}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["editor", "preview", "html"].map(tabKey => <button key={tabKey} style={btnTab(tabKey)} onClick={() => setTab(tabKey)}>{tabKey === "html" ? "HTML" : tabKey === "preview" ? t("designer.tabPreview") : t("designer.tabEditor")}</button>)}
          </div>
          <button onClick={save} disabled={saving}
            style={{ padding: "8px 16px", background: "#fce499", color: "#1a1a0a", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-device-floppy" />{saving ? t("designer.saving") : t("designer.save")}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 130px auto", gap: 12, paddingBottom: 14, borderBottom: "1px solid #222" }}>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t("designer.signatureName")}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t("designer.signatureNamePlaceholder")}
              style={{ width: "100%", padding: "8px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t("designer.maxWidthPx")}</label>
            <input type="number" value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value) || 600)} min={300} max={1200} step={10}
              style={{ width: "100%", padding: "8px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{t("designer.background")}</label>
            <div style={{ display: "flex", gap: 6, height: 37 }}>
              <input type="color" value={bgColor || "#ffffff"} onChange={e => setBgColor(e.target.value)}
                style={{ width: 36, height: "100%", padding: 2, border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", background: "#1a1a1a", flexShrink: 0 }} />
              <button onClick={() => setBgColor(bgColor ? "" : "#ffffff")}
                style={{ flex: 1, padding: "4px 8px", background: bgColor ? "#1a1a1a" : "#2a2a2a", border: "1px solid #2a2a2a", borderRadius: 6, color: bgColor ? "#555" : "#aaa", fontSize: 11, cursor: "pointer" }}>
                {bgColor ? bgColor : t("designer.transparent")}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#777", cursor: "pointer", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
              {t("designer.defaultSignature")}
            </label>
          </div>
        </div>
      </div>

      {/* Preview Tab */}
      {tab === "preview" && (
        <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 10 }}>
          <div style={{ background: bgColor || "#fff", maxWidth: maxWidth, margin: "0 auto", padding: "16px 20px", fontFamily: "Arial, sans-serif", border: "1px solid #eee", borderRadius: 8 }}>
            {blocks.map(b => <BlockPreview key={b.id} block={b} />)}
          </div>
        </div>
      )}

      {/* HTML Tab */}
      {tab === "html" && (
        <div>
          {htmlEdit !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "6px 12px", background: "#1a1500", border: "1px solid #3a2a00", borderRadius: 7 }}>
              <i className="ti ti-pencil" style={{ color: "#fce499", fontSize: 13, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#888", flex: 1 }}>{t("designer.htmlManuallyEdited")}</span>
              <button onClick={() => setHtmlEdit(null)} style={{ padding: "3px 10px", background: "transparent", border: "1px solid #444", borderRadius: 5, color: "#888", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                {t("designer.htmlReset")}
              </button>
            </div>
          )}
          <textarea
            value={htmlEdit ?? blocksToHTML(blocks, maxWidth, bgColor)}
            onChange={e => setHtmlEdit(e.target.value)}
            style={{ width: "100%", minHeight: 300, background: "#111", color: "#6ee7b7", border: "1px solid #222", borderRadius: 8, padding: 14, fontFamily: "monospace", fontSize: 12, boxSizing: "border-box", resize: "vertical" }}
          />
        </div>
      )}

      {/* Editor Tab */}
      {tab === "editor" && (
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 260px", gap: 16 }}>

          {/* Palette */}
          <div>
            <button onClick={() => setShowTemplates(true)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", fontSize: 12, border: "1px solid #fce49933", borderRadius: 6, background: "#1e1e0a", cursor: "pointer", color: "#fce499", marginBottom: 10, fontWeight: 600 }}>
              <i className="ti ti-template" style={{ fontSize: 13 }} />
              {t("designer.templateLoad")}
            </button>
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8, fontWeight: 600 }}>{t("designer.elements")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type}
                  draggable
                  onDragStart={() => { setDraggingType(bt.type); setShowDropZones(true); }}
                  onDragEnd={() => { setDraggingType(null); setShowDropZones(false); }}
                  onClick={() => addBlockAt(bt.type, blocks.length)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", fontSize: 12, border: "1px solid #222", borderRadius: 6, background: "#161616", cursor: "grab", textAlign: "left", color: "#aaa", width: "100%" }}>
                  <i className={`ti ${bt.icon}`} style={{ fontSize: 13, color: "#555" }} />
                  {t(bt.label)}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#333", lineHeight: "15px" }}>{t("designer.paletteHint")}</div>
          </div>

          {/* Template picker modal */}
          {showTemplates && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, overflow: "auto", padding: "32px 20px" }}
              onClick={() => setShowTemplates(false)}>
              <div style={{ maxWidth: 860, margin: "0 auto", background: "#161616", border: "1px solid #2a2a2a", borderRadius: 16, padding: 24 }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{t("designer.templatePickerTitle")}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>{t("designer.templatePickerSubtitle")}</div>
                  </div>
                  <button onClick={() => setShowTemplates(false)}
                    style={{ width: 32, height: 32, border: "1px solid #2a2a2a", borderRadius: 7, background: "transparent", color: "#888", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                  {SIGNATURE_TEMPLATES.map(tpl => (
                    <div key={tpl.id} onClick={() => { setBlocks(assignIds(tpl.blocks)); setMaxWidth(tpl.maxWidth || 600); setBgColor(tpl.bgColor || ""); setShowTemplates(false); }}
                      style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "border-color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = tpl.accent}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#222"}>
                      <div style={{ borderTop: `3px solid ${tpl.accent}`, borderRadius: 2, marginBottom: 8 }} />
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: tpl.accent, fontWeight: 700, marginBottom: 3 }}>{tpl.style}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#ddd", marginBottom: 4 }}>{tpl.name}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>{tpl.preview}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div style={{ border: "1px solid #222", borderRadius: 10, background: "#1a1a1a", minHeight: 300, padding: "8px 12px", overflowX: "auto" }}
            onClickCapture={e => { if (e.target.closest?.("a")) e.preventDefault(); }}>
            <div style={{ maxWidth: maxWidth, margin: "0 auto", background: bgColor || "transparent", borderRadius: 4, padding: bgColor ? "4px 6px" : 0 }}>
              {blocks.length === 0 && !isDragging && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150, color: "#444", fontSize: 13, flexDirection: "column", gap: 8 }}>
                  <i className="ti ti-drag-drop" style={{ fontSize: 28 }} />
                  {t("designer.canvasEmpty")}
                </div>
              )}

              {isDragging && (
                <DropZone isActive={true} onDrop={() => {
                  if (draggingType) addBlockAt(draggingType, 0);
                  else if (draggingId) moveBlockTo(draggingId, 0);
                }} />
              )}

              {blocks.map((block, idx) => (
                <div key={block.id}>
                  <div
                    draggable={selected !== block.id}
                    onDragStart={() => { setDraggingId(block.id); setShowDropZones(true); }}
                    onDragEnd={() => { setDraggingId(null); setShowDropZones(false); }}
                    onClick={() => setSelected(block.id === selected ? null : block.id)}
                    style={{
                      position: "relative", cursor: "pointer",
                      outline: selected === block.id ? "2px solid #fce499" : "none",
                      outlineOffset: 2, borderRadius: 6,
                      opacity: draggingId === block.id ? 0.4 : 1,
                      padding: "4px 6px",
                      background: selected === block.id ? "#1e1e0a" : "transparent",
                    }}>
                    <InlineCanvasContent
                      block={block}
                      isSelected={selected === block.id}
                      onUpdate={np => updateProps(block.id, np)}
                      selectedSubId={selected}
                      draggingType={draggingType}
                      onDropToColumn={(side) => addToColumn(block.id, side, draggingType)}
                      onRemoveSubBlock={(side, subId) => removeSubBlock(block.id, side, subId)}
                      onUpdateSub={(subId, np) => updateProps(subId, np)}
                      onDropToCell={(ri, ci, type) => addToTableCell(block.id, ri, ci, type)}
                      onRemoveFromCell={(ri, ci, subId) => removeFromTableCell(block.id, ri, ci, subId)}
                      onAddRow={() => addTableRow(block.id)}
                      onRemoveRow={ri => removeTableRow(block.id, ri)}
                      onAddCol={() => addTableCol(block.id)}
                      onRemoveCol={ci => removeTableCol(block.id, ci)}
                      selectedCellPos={selectedCell?.tableId === block.id ? selectedCell : null}
                      onSelectCell={(ri, ci) => { setSelectedCell({ tableId: block.id, ri, ci }); setSelected(block.id); }}
                      onSelectSub={(id) => { setSelectedCell(null); setSelected(id); }}
                      onSelectParentBlock={() => { setSelectedCell(null); setSelected(block.id); }}
                      varTarget={varTarget}
                    />
                    {selected === block.id && (
                      <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { const i = blocks.findIndex(b => b.id === block.id); if (i > 0) { const a = [...blocks]; [a[i-1],a[i]]=[a[i],a[i-1]]; setBlocks(a); }}}
                          style={{ width: 20, height: 20, border: "none", borderRadius: 3, background: "#333", color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="ti ti-arrow-up" />
                        </button>
                        <button onClick={() => { const i = blocks.findIndex(b => b.id === block.id); if (i < blocks.length-1) { const a = [...blocks]; [a[i],a[i+1]]=[a[i+1],a[i]]; setBlocks(a); }}}
                          style={{ width: 20, height: 20, border: "none", borderRadius: 3, background: "#333", color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="ti ti-arrow-down" />
                        </button>
                        <button onClick={() => removeBlock(block.id)}
                          style={{ width: 20, height: 20, border: "none", borderRadius: 3, background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isDragging && draggingId !== block.id && (
                    <DropZone isActive={true} onDrop={() => {
                      if (draggingType) addBlockAt(draggingType, idx + 1);
                      else if (draggingId) moveBlockTo(draggingId, idx + 1);
                    }} />
                  )}
                </div>
              ))}

              {isDragging && blocks.length === 0 && (
                <DropZone isActive={true} onDrop={() => {
                  if (draggingType) addBlockAt(draggingType, 0);
                }} />
              )}
            </div>
          </div>

          {/* Props Panel */}
          <div>
            {/* Pickers */}
            <VarPicker varTarget={varTarget} />
            <IconPicker varTarget={varTarget} />

            {selBlock ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <i className={`ti ${BLOCK_TYPES.find(b => b.type === selBlock.type)?.icon}`} style={{ fontSize: 14, color: "#666" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>{t(BLOCK_TYPES.find(b => b.type === selBlock.type)?.label)}</span>
                </div>
                <div style={{ background: "#161616", border: "1px solid #222", borderRadius: 8, padding: 12 }}>
                  <PropEditor block={selBlock} onChange={np => updateProps(selBlock.id, np)}
                    selectedCell={selectedCell}
                    onCellPropChange={(ri, ci, key, val) => updateCellProp(selBlock.id, ri, ci, key, val)}
                    varTarget={varTarget} />
                </div>
              </div>
            ) : (
              <div style={{ padding: "24px 10px", textAlign: "center", color: "#444", fontSize: 12 }}>
                <i className="ti ti-click" style={{ fontSize: 24, display: "block", marginBottom: 6 }} />
                {t("designer.selectElement")}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: "8px 12px", background: "#161616", borderRadius: 8, display: "flex", gap: 14, fontSize: 11, color: "#444" }}>
        <span><i className="ti ti-layout-columns" style={{ marginRight: 3 }} />{blocks.length} {t("designer.statusElements")}</span>
        <span><i className="ti ti-arrows-left-right" style={{ marginRight: 3 }} />{t("designer.statusMaxWidth")}: {maxWidth}px</span>
        <span><i className="ti ti-chart-bar" style={{ marginRight: 3 }} />{t("designer.statusUtm")}</span>
      </div>
    </div>
  );
}
