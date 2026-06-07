function makeBlocks({ accent, headerBg, introBg, introText, posBg, posBorder, sumBg, noticeText, noticeBg, ctaBg, footerBg, footerBorder }) {
  return [
    { type: "header",   props: { companyName: "Holdermann IT", tagline: "IT-Support · Softwareentwicklung · Datenkonvertierung", accentColor: accent, bgColor: headerBg, logoUrl: "https://holdermann.me/Angebote/thumbs-up.png" } },
    { type: "intro",    props: { text: "Hallo {{anrede}} {{nachname}},\n\ngerne unterbreite ich Ihnen folgendes Angebot:", bgColor: introBg, textColor: introText } },
    { type: "position", props: { showImage: true, showArticleNumber: true, showDescription: true, accentColor: accent, bgColor: posBg, borderColor: posBorder } },
    { type: "sum",      props: { label: "Gesamtpreis zzgl. MwSt.:", accentColor: accent, bgColor: sumBg, borderColor: accent } },
    { type: "notice",   props: { text: "Hinweis: Die gesetzliche Mehrwertsteuer wird im Rechnungsfall gesondert ausgewiesen. Zahlungsbedingungen: Vorkasse", textColor: noticeText, bgColor: noticeBg } },
    { type: "cta",      props: { label: "Ich freue mich auf Ihre Rückmeldung", accentColor: accent, bgColor: ctaBg, mailSubject: "Angebot {{angebotsnummer}}" } },
    { type: "footer",   props: { name: "Christof Holdermann", company: "Holdermann IT", email: "info@holdermann.me", phone: "+49 (0)7841 8329775", web: "https://holdermann.me", accentColor: accent, bgColor: footerBg, borderColor: footerBorder, logoUrl: "https://holdermann.me/Angebote/thumbs-up.png" } },
  ];
}

export const OFFER_TEMPLATES = [
  {
    id: "dark-gold",
    name: "Dark Gold",
    desc: "Dunkles Layout · Gold-Akzent",
    icon: "ti-sun",
    accent: "#fce499",
    preview: ["#242424", "#fce499", "#1b1b1b"],
    blocks: makeBlocks({
      accent: "#fce499",
      headerBg: "#242424", introBg: "#242424", introText: "#cfcfcf",
      posBg: "#1b1b1b", posBorder: "#333333",
      sumBg: "#121212", noticeText: "#9d9d9d", noticeBg: "#242424",
      ctaBg: "#242424", footerBg: "#1a1a1a", footerBorder: "#333333",
    }),
  },
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    desc: "Helles Layout · Blau-Akzent",
    icon: "ti-building",
    accent: "#1d4ed8",
    preview: ["#1e3a5f", "#93c5fd", "#f8fafc"],
    blocks: makeBlocks({
      accent: "#1d4ed8",
      headerBg: "#1e3a5f", introBg: "#f8fafc", introText: "#374151",
      posBg: "#f8fafc", posBorder: "#dbeafe",
      sumBg: "#eff6ff", noticeText: "#6b7280", noticeBg: "#f8fafc",
      ctaBg: "#f8fafc", footerBg: "#1e3a5f", footerBorder: "#2d5282",
    }),
  },
  {
    id: "modern-green",
    name: "Modern Green",
    desc: "Dunkelgrün · Mint-Akzent",
    icon: "ti-leaf",
    accent: "#10b981",
    preview: ["#064e3b", "#6ee7b7", "#f0fdf4"],
    blocks: makeBlocks({
      accent: "#10b981",
      headerBg: "#064e3b", introBg: "#f0fdf4", introText: "#374151",
      posBg: "#f0fdf4", posBorder: "#a7f3d0",
      sumBg: "#ecfdf5", noticeText: "#6b7280", noticeBg: "#f0fdf4",
      ctaBg: "#f0fdf4", footerBg: "#064e3b", footerBorder: "#065f46",
    }),
  },
  {
    id: "bold-red",
    name: "Bold Red",
    desc: "Dunkelrot · Warm-Akzent",
    icon: "ti-flame",
    accent: "#dc2626",
    preview: ["#7f1d1d", "#fca5a5", "#fff1f2"],
    blocks: makeBlocks({
      accent: "#dc2626",
      headerBg: "#7f1d1d", introBg: "#fff1f2", introText: "#1f2937",
      posBg: "#fff1f2", posBorder: "#fecaca",
      sumBg: "#fef2f2", noticeText: "#6b7280", noticeBg: "#fff1f2",
      ctaBg: "#fff1f2", footerBg: "#7f1d1d", footerBorder: "#991b1b",
    }),
  },
  {
    id: "startup-indigo",
    name: "Startup Indigo",
    desc: "Indigo-Violet · Modern",
    icon: "ti-rocket",
    accent: "#6366f1",
    preview: ["#312e81", "#a5b4fc", "#f5f3ff"],
    blocks: makeBlocks({
      accent: "#6366f1",
      headerBg: "#312e81", introBg: "#f5f3ff", introText: "#374151",
      posBg: "#f5f3ff", posBorder: "#c7d2fe",
      sumBg: "#eef2ff", noticeText: "#6b7280", noticeBg: "#f5f3ff",
      ctaBg: "#f5f3ff", footerBg: "#312e81", footerBorder: "#3730a3",
    }),
  },
];
