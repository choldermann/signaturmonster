#!/usr/bin/env python3
"""Generate competitive analysis PDF for Signaturmonster."""
from fpdf import FPDF
from pathlib import Path

OUT = Path(__file__).parent / "Signaturmonster-Konkurrenz-Analyse.pdf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


class PDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("DV", "", FONT)
        self.add_font("DV", "B", FONT_B)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("DV", "B", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "Signaturmonster — Konkurrenz-Analyse", align="R")
        self.ln(4)
        self.set_draw_color(220, 220, 220)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("DV", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Seite {self.page_no()}", align="C")

    def h1(self, text):
        self.ln(4)
        self.set_font("DV", "B", 18)
        self.set_text_color(26, 26, 26)
        self.multi_cell(0, 10, text)
        self.ln(2)

    def h2(self, text):
        self.ln(3)
        self.set_font("DV", "B", 13)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 8, text)
        self.ln(1)

    def h3(self, text):
        self.ln(2)
        self.set_font("DV", "B", 11)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text):
        self.set_font("DV", "", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("DV", "", 10)
        self.set_text_color(50, 50, 50)
        x = self.get_x()
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def table_header(self, cols, widths):
        self.set_font("DV", "B", 9)
        self.set_fill_color(252, 228, 153)
        self.set_text_color(26, 26, 10)
        for i, col in enumerate(cols):
            self.cell(widths[i], 8, col, border=1, fill=True)
        self.ln()

    def table_row(self, cells, widths, bold_first=False):
        self.set_font("DV", "B" if bold_first else "", 8)
        self.set_text_color(50, 50, 50)
        x0, y0 = self.get_x(), self.get_y()
        max_h = 8
        lines = []
        for i, cell in enumerate(cells):
            self.set_xy(x0 + sum(widths[:i]), y0)
            w = widths[i]
            nb = self.multi_cell(w, 4, cell, border=0, split_only=True)
            lines.append(len(nb))
        max_h = max(max(lines), 1) * 4 + 2
        if y0 + max_h > 270:
            self.add_page()
            y0 = self.get_y()
        for i, cell in enumerate(cells):
            self.set_xy(x0 + sum(widths[:i]), y0)
            self.multi_cell(widths[i], 4, cell, border=1)
        self.set_xy(x0, y0 + max_h)


def main():
    pdf = PDF()
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    # Title block
    pdf.set_font("DV", "B", 22)
    pdf.set_text_color(252, 228, 153)
    pdf.cell(0, 12, "Signatur", ln=1)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(24, 24, 24)
    pdf.set_font("DV", "B", 28)
    pdf.cell(0, 14, "monster", fill=True, ln=1)
    pdf.ln(4)
    pdf.set_font("DV", "B", 16)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 10, "Konkurrenz-Analyse", ln=1)
    pdf.set_font("DV", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, "Was die Konkurrenz hat — und Signaturmonster (noch) nicht", ln=1)
    pdf.cell(0, 6, "Stand: Juni 2026  |  Einschätzung & Priorisierung", ln=1)
    pdf.ln(6)

    pdf.body(
        "Signaturmonster ist stark bei Self-Hosting, SMTP-Proxy, Lexware-Integration und CI-Branding. "
        "Typische Cloud-Lösungen (Exclaimer, CodeTwo, Letsignit, Mailtastic) setzen auf Microsoft 365 / "
        "Google Workspace und zentrale Verzeichnisdienste. Dieses Dokument fasst Feature-Lücken, "
        "Stärken und empfohlene Prioritäten zusammen."
    )

    # High priority table
    pdf.h2("Hohe Priorität — differenzieren oder Marktstandard")
    w = [42, 58, 70]
    pdf.table_header(["Feature", "Konkurrenz", "Signaturmonster heute"], w)
    rows_high = [
        ("Verzeichnis-Sync\n(AD/LDAP/Azure AD)", "Nutzer + Felder automatisch aus Firmenverzeichnis", "Mailadressen-Profile manuell pflegen"),
        ("Gruppen-/Abteilungsregeln", "Regeln nach OU, Gruppe, Standort", "Nur Absender-E-Mail oder Domain"),
        ("Intern vs. extern", "Andere Signatur/Disclaimer je nach Empfänger-Domain", "Nicht vorhanden"),
        ("Kampagnen mit Zeitraum", "Banner rotieren nach Datum (Sommeraktion, Messe)", "Banner-Bibliothek, aber kein Scheduling"),
        ("Signatur-Analytics", "Klicks, Kampagnen-Performance, Dashboard", "Nur UTM-Parameter, kein Auswertungs-Dashboard"),
        ("Bulk-Import", "CSV/HR-System — hunderte Profile auf einmal", "Einzeln anlegen"),
        ("JTL-Wawi", "—", "In UI erwähnt, Backend fehlt (nur Lexware aktiv)"),
        ("Feature-Gating", "Lizenz = harte Sperre", "Lizenz-UI vorhanden, Zugriff technisch noch nicht gesperrt"),
    ]
    for row in rows_high:
        pdf.table_row(row, w)

    pdf.ln(4)
    pdf.h2("Mittlere Priorität — Professionalisierung")
    w2 = [42, 58, 70]
    pdf.table_header(["Feature", "Konkurrenz", "Signaturmonster"], w2)
    rows_mid = [
        ("Mail-Spool / Queue", "Implizit durch Cloud-Infrastruktur", "Echtzeit, kein Persistenz-Puffer (Disk-Spool geplant)"),
        ("Audit-Log / Compliance", "Wer hat wann welche Mail wie versendet?", "System-Log, kein Mail-Audit"),
        ("Self-Service-Portal", "Mitarbeiter pflegen Foto/Telefon selbst", "Nur Admin-Dashboard"),
        ("Signatur-Vorschau im Client", "Outlook-Add-in, Gmail-Extension", "Nur Web-Designer + Testmail"),
        ("Mehrsprachigkeit", "Signatur nach Sprache des Absenders/Empfängers", "Eine Variante pro Regel"),
        ("Bild-Hosting / CDN", "Zentral gehostete Signatur-Bilder", "URLs müssen selbst erreichbar sein"),
        ("API für Provisioning", "HR-Tool triggert Anlage/Update von Profilen", "REST intern, kein Webhook/Provisioning-API"),
    ]
    for row in rows_mid:
        pdf.table_row(row, w2)

    pdf.add_page()
    pdf.h2("Niedrigere Priorität — Cloud-Welt (optional für Signaturmonster)")
    w3 = [40, 55, 75]
    pdf.table_header(["Feature", "Warum Konkurrenz das hat", "Für Signaturmonster"], w3)
    rows_low = [
        ("Native M365/GWS-Integration", "Transport Rules, Graph API", "Anderer Ansatz (SMTP-Proxy) — Feature, kein Muss"),
        ("Mobile-Geräte-Abdeckung", "iPhone/Android Mail automatisch", "Geht mit SMTP-Proxy, wenn Client konfiguriert"),
        ("MSP-Multi-Tenant", "Eine Konsole, viele Kunden", "monstersuite.de als Ansatz, kein zentrales Kunden-Management"),
        ("A/B-Testing", "Zwei Banner-Varianten messen", "Eher Enterprise-Segment"),
    ]
    for row in rows_low:
        pdf.table_row(row, w3)

    pdf.ln(4)
    pdf.h2("Wo Signaturmonster voraus ist")
    pdf.body("Diese Punkte sollten bei der Positionierung nicht unterschätzt werden:")
    strengths = [
        "Self-hosted / DSGVO ohne US-Cloud-Zwang",
        "Beliebiger Mailclient (Thunderbird, Apple Mail, …) — nicht nur Outlook",
        "Lexware-Angebots-Templates — starke Nische im deutschen Markt",
        "Mail-Beautifier / CI-Wrapper — ganze Mail branden, nicht nur Fußzeile",
        "Multi-Relay nach Domain — mehrere Firmen/Domains an einem Proxy",
        "Kein Microsoft-365-Zwang — wichtig für KMU ohne M365-Vertrag",
    ]
    for s in strengths:
        pdf.bullet(s)

    pdf.ln(2)
    pdf.h2("Top-5 Empfehlung — maximaler Effekt für KMU-Kunden")
    top5 = [
        ("1. LDAP/AD-Sync", "Profile pflegen ist der größte Admin-Schmerz bei der Konkurrenz — und bei euch manuell."),
        ("2. Intern/Extern-Regeln", "Disclaimer nur nach außen ist Standard bei Exclaimer & Co."),
        ("3. Kampagnen-Scheduling", "Banner mit Start-/Ende-Datum — Marketing will das regelmäßig."),
        ("4. CSV-Import für Mailadressen", "Schneller Onboarding-Gewinn ohne Enterprise-Preis."),
        ("5. Disk-Spool (geplant)", "Zuverlässigkeit unter Last — Persistenz, Retry, kein Redis nötig."),
    ]
    for title, desc in top5:
        pdf.h3(title)
        pdf.body(desc)

    pdf.ln(2)
    pdf.h2("Quick Wins aus der eigenen Roadmap")
    pdf.body("Diese Punkte sind in docs/features.md bereits als offen dokumentiert:")
    for q in [
        "JTL-Anreicherung implementieren (UI existiert, Backend fehlt)",
        "Feature-Gating technisch durchziehen (Lizenz-UI vs. echte Sperre)",
        "SMTP-Auth-Dokumentation aktualisieren (Auth ist implementiert, Doku teils veraltet)",
    ]:
        pdf.bullet(q)

    pdf.ln(4)
    pdf.set_font("DV", "", 8)
    pdf.set_text_color(130, 130, 130)
    pdf.multi_cell(
        0, 4,
        "Hinweis: Dieses Dokument basiert auf einer technischen Analyse des Signaturmonster-Codebases "
        "(v0.7.0) und einem Vergleich mit marktüblichen Lösungen (Exclaimer, CodeTwo, Letsignit, Mailtastic). "
        "Priorisierung reflektiert die Zielgruppe: deutsche KMU, Self-Hosted, Thunderbird/multiclient.",
    )

    pdf.output(str(OUT))
    print(f"PDF erstellt: {OUT}")


if __name__ == "__main__":
    main()
