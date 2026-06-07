// Signature templates for the designer — blocks have no ids (assigned on load by assignIds)
export const SIGNATURE_TEMPLATES = [
  // ─── 1. Minimalistisch ───────────────────────────────────────────────────────
  {
    id: "minimal",
    name: "Minimal",
    style: "Minimalistisch",
    icon: "ti-minus",
    preview: "Schlicht · Text · Social",
    accent: "#888888",
    maxWidth: 500,
    bgColor: "",
    blocks: [
      { type: "divider", props: { color: "#e0e0e0", thickness: "1", margin: "6" } },
      { type: "text", props: { content: "Max Mustermann", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "14px", fontWeight: "bold", fontStyle: "normal", color: "#1a1a1a", textAlign: "left", paddingTop: "2", paddingBottom: "1" } },
      { type: "text", props: { content: "Geschäftsführer · Musterfirma GmbH", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#888888", textAlign: "left", paddingTop: "0", paddingBottom: "4" } },
      { type: "social", props: { items: [
        { platform: "phone", url: "tel:+4915112345678", label: "+49 151 123 456 78", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "email", url: "mailto:max@musterfirma.de", label: "max@musterfirma.de", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "web", url: "https://www.musterfirma.de", label: "musterfirma.de", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
      ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "14", style: "icon-text", direction: "horizontal", align: "left", color: "#888888", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal" } },
    ],
  },

  // ─── 2. Corporate / Professionell ────────────────────────────────────────────
  {
    id: "corporate",
    name: "Corporate Professional",
    style: "Corporate",
    icon: "ti-building",
    preview: "Logo · Spalten · Akzent-Blau",
    accent: "#003366",
    maxWidth: 580,
    bgColor: "",
    blocks: [
      { type: "divider", props: { color: "#003366", thickness: "3", margin: "0" } },
      { type: "spacer", props: { height: "12" } },
      { type: "columns", props: { leftWidth: "28",
        leftBlocks: [
          { type: "image", props: { src: "", alt: "Logo", width: "80", align: "center", linkUrl: "", borderRadius: "4" } },
        ],
        rightBlocks: [
          { type: "text", props: { content: "Maria Schmidt", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px", fontWeight: "bold", fontStyle: "normal", color: "#003366", textAlign: "left", paddingTop: "0", paddingBottom: "1" } },
          { type: "text", props: { content: "Senior Projektmanagerin", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#555555", textAlign: "left", paddingTop: "0", paddingBottom: "1" } },
          { type: "text", props: { content: "Muster AG  ·  Musterstraße 1  ·  12345 Berlin", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: "normal", fontStyle: "normal", color: "#999999", textAlign: "left", paddingTop: "0", paddingBottom: "0" } },
        ],
      }},
      { type: "spacer", props: { height: "10" } },
      { type: "divider", props: { color: "#e8e8e8", thickness: "1", margin: "0" } },
      { type: "spacer", props: { height: "8" } },
      { type: "social", props: { items: [
        { platform: "phone", url: "tel:+493012345678", label: "+49 30 123 456-78", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "email", url: "mailto:m.schmidt@muster-ag.de", label: "m.schmidt@muster-ag.de", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "web", url: "https://www.muster-ag.de", label: "www.muster-ag.de", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "linkedin", url: "https://linkedin.com/in/mariaschmidt", label: "LinkedIn", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
      ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "14", style: "icon-text", direction: "horizontal", align: "left", color: "#555555", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal" } },
    ],
  },

  // ─── 3. Kreativ / Agentur ────────────────────────────────────────────────────
  {
    id: "creative",
    name: "Kreativ & Agentur",
    style: "Kreativ",
    icon: "ti-brush",
    preview: "Bold · Orange · Portfolio",
    accent: "#f59e0b",
    maxWidth: 560,
    bgColor: "",
    blocks: [
      { type: "divider", props: { color: "#f59e0b", thickness: "4", margin: "0" } },
      { type: "spacer", props: { height: "10" } },
      { type: "columns", props: { leftWidth: "62",
        leftBlocks: [
          { type: "text", props: { content: "Lisa Weber", fontFamily: "'Trebuchet MS', sans-serif", fontSize: "20px", fontWeight: "bold", fontStyle: "normal", color: "#1a1a1a", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
          { type: "text", props: { content: "Creative Director & Brand Strategist", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#f59e0b", textAlign: "left", paddingTop: "0", paddingBottom: "6" } },
          { type: "social", props: { items: [
            { platform: "web", url: "https://lisaweber.design", label: "lisaweber.design", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
            { platform: "instagram", url: "https://instagram.com/lisaweberstudio", label: "@lisaweberstudio", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
            { platform: "linkedin", url: "https://linkedin.com/in/lisaweber", label: "LinkedIn", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
          ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "10", style: "icon-text", direction: "horizontal", align: "left", color: "#777777", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal" } },
        ],
        rightBlocks: [
          { type: "spacer", props: { height: "14" } },
          { type: "link", props: { label: "Portfolio →", url: "https://lisaweber.design/portfolio", color: "#1a1a1a", fontSize: "12px", asButton: true, buttonBg: "#f59e0b", buttonColor: "#1a1a1a", borderRadius: "4", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" } },
        ],
      }},
    ],
  },

  // ─── 4. Technologie / IT ─────────────────────────────────────────────────────
  {
    id: "tech",
    name: "Technologie & IT",
    style: "Tech",
    icon: "ti-code",
    preview: "Monospace · Teal · GitHub",
    accent: "#10b981",
    maxWidth: 540,
    bgColor: "",
    blocks: [
      { type: "divider", props: { color: "#10b981", thickness: "2", margin: "0" } },
      { type: "spacer", props: { height: "10" } },
      { type: "text", props: { content: "Thomas Becker", fontFamily: "'Courier New', Courier, monospace", fontSize: "16px", fontWeight: "bold", fontStyle: "normal", color: "#111827", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
      { type: "text", props: { content: "Senior Software Engineer  //  TechCorp GmbH", fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#10b981", textAlign: "left", paddingTop: "0", paddingBottom: "6" } },
      { type: "columns", props: { leftWidth: "52",
        leftBlocks: [
          { type: "text", props: { content: "📧  t.becker@techcorp.de\n📞  +49 89 123 456 78", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#6b7280", textAlign: "left", paddingTop: "0", paddingBottom: "0" } },
        ],
        rightBlocks: [
          { type: "social", props: { items: [
            { platform: "web", url: "https://github.com/tbecker", label: "GitHub", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
            { platform: "linkedin", url: "https://linkedin.com/in/thomasbecker", label: "LinkedIn", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
          ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "10", style: "icon-text", direction: "vertical", align: "left", color: "#6b7280", fontFamily: "'Courier New', Courier, monospace", fontWeight: "normal", fontStyle: "normal" } },
        ],
      }},
      { type: "spacer", props: { height: "4" } },
      { type: "divider", props: { color: "#e5e7eb", thickness: "1", margin: "0" } },
    ],
  },

  // ─── 5. Handwerk / Gewerbe ───────────────────────────────────────────────────
  {
    id: "craft",
    name: "Handwerk & Gewerbe",
    style: "Gewerbe",
    icon: "ti-tools",
    preview: "Logo · Adresse · Angebot-Button",
    accent: "#d97706",
    maxWidth: 560,
    bgColor: "",
    blocks: [
      { type: "columns", props: { leftWidth: "30",
        leftBlocks: [
          { type: "image", props: { src: "", alt: "Firmenlogo", width: "90", align: "center", linkUrl: "", borderRadius: "6" } },
          { type: "text", props: { content: "Musterbau GmbH", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10px", fontWeight: "bold", fontStyle: "normal", color: "#aaaaaa", textAlign: "center", paddingTop: "4", paddingBottom: "0" } },
        ],
        rightBlocks: [
          { type: "text", props: { content: "Thomas Müller", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "15px", fontWeight: "bold", fontStyle: "normal", color: "#1a1a1a", textAlign: "left", paddingTop: "0", paddingBottom: "1" } },
          { type: "text", props: { content: "Meister & Inhaber", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#555555", textAlign: "left", paddingTop: "0", paddingBottom: "4" } },
          { type: "text", props: { content: "Musterweg 5  ·  12345 Musterstadt", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#777777", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
          { type: "text", props: { content: "📞  01234 56789   ·   📱  0171 234 567 89", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#555555", textAlign: "left", paddingTop: "0", paddingBottom: "0" } },
        ],
      }},
      { type: "divider", props: { color: "#d97706", thickness: "2", margin: "10" } },
      { type: "link", props: { label: "Jetzt Angebot anfragen", url: "https://www.musterbau.de/kontakt", color: "#ffffff", fontSize: "12px", asButton: true, buttonBg: "#d97706", buttonColor: "#ffffff", borderRadius: "5", utm_source: "", utm_medium: "email", utm_campaign: "angebot", utm_content: "" } },
    ],
  },

  // ─── 6. Medizin / Beratung ───────────────────────────────────────────────────
  {
    id: "medical",
    name: "Medizin & Beratung",
    style: "Professionell",
    icon: "ti-stethoscope",
    preview: "Rundes Foto · Tabelle · Terminlink",
    accent: "#1d4ed8",
    maxWidth: 560,
    bgColor: "",
    blocks: [
      { type: "columns", props: { leftWidth: "20",
        leftBlocks: [
          { type: "image", props: { src: "", alt: "Profilfoto", width: "62", align: "center", linkUrl: "", borderRadius: "50" } },
        ],
        rightBlocks: [
          { type: "text", props: { content: "Dr. med. Anna Müller", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "16px", fontWeight: "bold", fontStyle: "normal", color: "#1d4ed8", textAlign: "left", paddingTop: "0", paddingBottom: "1" } },
          { type: "text", props: { content: "Fachärztin für Innere Medizin", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "1" } },
          { type: "text", props: { content: "Praxis am Markt  ·  Musterstraße 12  ·  12345 Musterstadt", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: "normal", fontStyle: "normal", color: "#9ca3af", textAlign: "left", paddingTop: "0", paddingBottom: "0" } },
        ],
      }},
      { type: "divider", props: { color: "#1d4ed8", thickness: "1", margin: "8" } },
      { type: "table", props: { borderColor: "#e5e7eb", borderWidth: "1", cellPadding: "7", tableBg: "",
        cells: [
          [
            { blocks: [{ type: "text", props: { content: "📞  030 123 456", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "0" } }], bg: "" },
            { blocks: [{ type: "text", props: { content: "📠  030 123 457", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "0" } }], bg: "" },
          ],
          [
            { blocks: [{ type: "text", props: { content: "📧  praxis@dr-mueller.de", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "0" } }], bg: "" },
            { blocks: [{ type: "link", props: { label: "Online-Termin buchen", url: "https://www.doctolib.de", color: "#1d4ed8", fontSize: "12px", asButton: false, buttonBg: "#1d4ed8", buttonColor: "#fff", borderRadius: "4", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" } }], bg: "" },
          ],
        ],
      }},
    ],
  },

  // ─── 7. Immobilien ───────────────────────────────────────────────────────────
  {
    id: "realestate",
    name: "Immobilien",
    style: "Immobilien",
    icon: "ti-home",
    preview: "Makler · Gold · Foto-Spalte",
    accent: "#b45309",
    maxWidth: 580,
    bgColor: "",
    blocks: [
      { type: "columns", props: { leftWidth: "62",
        leftBlocks: [
          { type: "text", props: { content: "Michael Hoffmann", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "18px", fontWeight: "bold", fontStyle: "normal", color: "#1a1a1a", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
          { type: "text", props: { content: "Immobilienmakler  ·  Zertifizierter Gutachter", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#b45309", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
          { type: "text", props: { content: "Premium Immobilien GmbH", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "bold", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "6" } },
          { type: "divider", props: { color: "#b45309", thickness: "1", margin: "4" } },
          { type: "text", props: { content: "📞  +49 30 987 654 32   ·   📧  m.hoffmann@premium-immo.de", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: "normal", fontStyle: "normal", color: "#6b7280", textAlign: "left", paddingTop: "4", paddingBottom: "0" } },
        ],
        rightBlocks: [
          { type: "image", props: { src: "", alt: "Profilfoto", width: "100", align: "center", linkUrl: "", borderRadius: "8" } },
        ],
      }},
      { type: "spacer", props: { height: "8" } },
      { type: "social", props: { items: [
        { platform: "web", url: "https://www.premium-immo.de", label: "premium-immo.de", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "linkedin", url: "https://linkedin.com/in/michaelhoffmann", label: "LinkedIn", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "instagram", url: "https://instagram.com/premiumimmo", label: "@premiumimmo", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
      ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "14", style: "icon-text", direction: "horizontal", align: "left", color: "#6b7280", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal" } },
    ],
  },

  // ─── 8. Restaurant / Gastronomie ─────────────────────────────────────────────
  {
    id: "restaurant",
    name: "Restaurant & Gastro",
    style: "Gastronomie",
    icon: "ti-tools-kitchen-2",
    preview: "Warm · Öffnungszeiten · Reservierung",
    accent: "#dc2626",
    maxWidth: 520,
    bgColor: "",
    blocks: [
      { type: "text", props: { content: "Ristorante Bella Vista", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "20px", fontWeight: "bold", fontStyle: "normal", color: "#7f1d1d", textAlign: "center", paddingTop: "4", paddingBottom: "2" } },
      { type: "text", props: { content: "Authentische Küche seit 1985", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "italic", color: "#b91c1c", textAlign: "center", paddingTop: "0", paddingBottom: "4" } },
      { type: "divider", props: { color: "#d97706", thickness: "2", margin: "4" } },
      { type: "table", props: { borderColor: "#f3e8d4", borderWidth: "1", cellPadding: "8", tableBg: "#fffbf5",
        cells: [[
          { blocks: [{ type: "text", props: { content: "⏰  Mo–Fr 12–22 Uhr\nSa–So 12–23 Uhr", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "0" } }], bg: "" },
          { blocks: [{ type: "text", props: { content: "📍  Musterstraße 7\n12345 Berlin-Mitte", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "0" } }], bg: "" },
          { blocks: [{ type: "text", props: { content: "📞  030 987 654\n📧  info@bella-vista.de", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#374151", textAlign: "left", paddingTop: "0", paddingBottom: "0" } }], bg: "" },
        ]],
      }},
      { type: "spacer", props: { height: "8" } },
      { type: "link", props: { label: "🍽  Tisch reservieren", url: "https://www.bella-vista.de/reservierung", color: "#ffffff", fontSize: "13px", asButton: true, buttonBg: "#dc2626", buttonColor: "#ffffff", borderRadius: "6", utm_source: "", utm_medium: "email", utm_campaign: "reservierung", utm_content: "" } },
      { type: "spacer", props: { height: "6" } },
      { type: "social", props: { items: [
        { platform: "instagram", url: "https://instagram.com/bellavistabln", label: "@bellavistabln", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "facebook", url: "https://facebook.com/bellavistaberlin", label: "Facebook", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
      ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "12", style: "icon-text", direction: "horizontal", align: "center", color: "#9ca3af", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal" } },
    ],
  },

  // ─── 9. Freelancer / Solo ────────────────────────────────────────────────────
  {
    id: "freelancer",
    name: "Freelancer & Solo",
    style: "Solo",
    icon: "ti-user",
    preview: "Persönlich · Verfügbarkeit · Portfolio",
    accent: "#7c3aed",
    maxWidth: 520,
    bgColor: "",
    blocks: [
      { type: "spacer", props: { height: "4" } },
      { type: "text", props: { content: "Jonas Klein", fontFamily: "'Trebuchet MS', sans-serif", fontSize: "22px", fontWeight: "bold", fontStyle: "normal", color: "#1a1a1a", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
      { type: "text", props: { content: "UI/UX Designer & Frontend Developer", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "13px", fontWeight: "normal", fontStyle: "normal", color: "#7c3aed", textAlign: "left", paddingTop: "0", paddingBottom: "2" } },
      { type: "text", props: { content: "✅  Verfügbar ab März 2026  ·  Remote & vor Ort", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: "normal", fontStyle: "italic", color: "#9ca3af", textAlign: "left", paddingTop: "0", paddingBottom: "6" } },
      { type: "divider", props: { color: "#e9d5ff", thickness: "1", margin: "4" } },
      { type: "columns", props: { leftWidth: "55",
        leftBlocks: [
          { type: "social", props: { items: [
            { platform: "web", url: "https://jonasklein.design", label: "jonasklein.design", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
            { platform: "linkedin", url: "https://linkedin.com/in/jonasklein", label: "LinkedIn", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
            { platform: "email", url: "mailto:hallo@jonasklein.design", label: "hallo@jonasklein.design", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
          ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "8", style: "icon-text", direction: "vertical", align: "left", color: "#6b7280", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "normal", fontStyle: "normal" } },
        ],
        rightBlocks: [
          { type: "link", props: { label: "Projekt anfragen", url: "https://jonasklein.design/kontakt", color: "#ffffff", fontSize: "12px", asButton: true, buttonBg: "#7c3aed", buttonColor: "#ffffff", borderRadius: "20", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" } },
        ],
      }},
    ],
  },

  // ─── 10. Startup / Modern ────────────────────────────────────────────────────
  {
    id: "startup",
    name: "Startup & Modern",
    style: "Modern",
    icon: "ti-rocket",
    preview: "Bold · Indigo · Dynamisch",
    accent: "#6366f1",
    maxWidth: 560,
    bgColor: "",
    blocks: [
      { type: "columns", props: { leftWidth: "55",
        leftBlocks: [
          { type: "text", props: { content: "Sarah Chen", fontFamily: "'Trebuchet MS', sans-serif", fontSize: "16px", fontWeight: "bold", fontStyle: "normal", color: "#1a1a1a", textAlign: "left", paddingTop: "0", paddingBottom: "1" } },
          { type: "text", props: { content: "Co-Founder & CEO", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", fontWeight: "normal", fontStyle: "normal", color: "#6366f1", textAlign: "left", paddingTop: "0", paddingBottom: "4" } },
          { type: "text", props: { content: "📞  +49 160 123 456 78\n📧  sarah@nextstartup.io", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "11px", fontWeight: "normal", fontStyle: "normal", color: "#6b7280", textAlign: "left", paddingTop: "0", paddingBottom: "0" } },
        ],
        rightBlocks: [
          { type: "text", props: { content: "NEXT\nSTARTUP", fontFamily: "'Trebuchet MS', sans-serif", fontSize: "22px", fontWeight: "bold", fontStyle: "normal", color: "#6366f1", textAlign: "right", paddingTop: "0", paddingBottom: "2" } },
          { type: "text", props: { content: "Building tomorrow, today.", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "10px", fontWeight: "normal", fontStyle: "italic", color: "#9ca3af", textAlign: "right", paddingTop: "0", paddingBottom: "0" } },
        ],
      }},
      { type: "divider", props: { color: "#6366f1", thickness: "3", margin: "8" } },
      { type: "social", props: { items: [
        { platform: "web", url: "https://nextstartup.io", label: "nextstartup.io", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "linkedin", url: "https://linkedin.com/company/nextstartup", label: "LinkedIn", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
        { platform: "twitter", url: "https://twitter.com/nextstartup", label: "@nextstartup", utm_source: "", utm_medium: "email", utm_campaign: "", utm_content: "" },
      ], iconSize: "13", fontSize: "12", iconGap: "5", gap: "14", style: "icon-text", direction: "horizontal", align: "left", color: "#6366f1", fontFamily: "'Trebuchet MS', sans-serif", fontWeight: "normal", fontStyle: "normal" } },
    ],
  },
];
