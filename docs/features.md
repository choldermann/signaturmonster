# Signaturmonster — Funktionsübersicht

**Version:** 0.7.0 · self-hosted  
**Stand:** Juni 2026

---

## Architektur-Überblick

Signaturmonster besteht aus drei Komponenten, die via Docker Compose zusammenspielen:

| Komponente | Technologie | Aufgabe |
|---|---|---|
| **Frontend** | React + Vite (nginx) | Web-UI zur Verwaltung |
| **Backend** | Python FastAPI + SQLite | REST-API, Datenhaltung |
| **SMTP-Proxy** | Python aiosmtpd | Mailverarbeitung in Echtzeit |

Der SMTP-Proxy sitzt zwischen Mailprogramm und Relay-Mailserver. Jede ausgehende Mail wird abgefangen, verarbeitet (Signatur, Branding, Template) und dann an den passenden Relay-Server weitergeleitet. Dabei können beliebig viele SMTP-Konten konfiguriert werden — der Proxy wählt automatisch den richtigen anhand der Absender-Domain.

---

## 1. SMTP-Proxy (Kernfunktion)

Der Proxy läuft auf Port 2587 und nimmt ausgehende Mails entgegen.

**Verarbeitungsablauf pro Mail:**
1. Absender-Adresse aus dem `From:`-Header extrahieren
2. Regel-Engine befragt das Backend (`/api/rules/match`)
3. Sender-Profil des Absenders laden (falls vorhanden)
4. Angebots-Daten aus Lexware/JTL anreichern (bei Template-Regeln)
5. Signatur inkl. Disclaimer-Platzhalter befüllen und in die Mail injizieren
6. CI-Branding anwenden (falls in der Regel aktiviert)
7. Passenden SMTP-Relay anhand der Priorität bestimmen (siehe Abschnitt 12)
8. Mail an den gewählten Relay-Server weiterleiten

**Unterstützte Mail-Typen:**
- Neue Mails (`apply_on_new`)
- Antworten/Weiterleitungen (`apply_on_reply`, erkannt via `In-Reply-To`/`References`-Header)
- Multipart-Mails (HTML + Text)
- Reine HTML-Mails
- Reine Plaintext-Mails

---

## 2. Signaturen

### Signatur-Designer (visueller Block-Editor)

Signaturen werden mit einem Drag & Drop-Editor gebaut. Jeder Block lässt sich einzeln konfigurieren und per Drag & Drop umordnen.

**Verfügbare Block-Typen:**

| Block | Beschreibung |
|---|---|
| **Text** | Formatierbarer Text (Schriftart, Größe, Farbe, Ausrichtung, Fett/Kursiv) |
| **Bild** | Bild via URL, konfigurierbare Breite, Ausrichtung, Eckenradius, optionaler Link |
| **Banner** | Farbbalken mit Text — Vollfarbe oder CSS-Gradient (horizontal/vertikal/diagonal), Outlook-Fallback; Banners aus der zentralen Bibliothek ladbar |
| **Link/Button** | Textlink oder Button mit Farbe, Eckenradius, Schriftgröße |
| **Social** | Social-Media-Links mit Icons (Website, E-Mail, Telefon, LinkedIn, Xing, Twitter/X, Facebook, Instagram, YouTube) — horizontal oder vertikal, icon-only/text-only/kombiniert |
| **Disclaimer** | Platzhalter für zentral verwaltete Rechtstexte — Inhalt wird beim Versand per Regel eingesetzt |
| **Trennlinie** | Horizontale Linie, konfigurierbare Farbe und Stärke |
| **Abstand** | Unsichtbarer Abstandsblock |
| **2 Spalten** | Zwei-Spalten-Layout mit einstellbarer Breite, Unter-Blöcke per Drag & Drop |
| **Tabelle** | Raster mit beliebigen Spalten- und Zeilenzahlen, Rahmen und Zellfarben, Unter-Blöcke per Drag & Drop |

**UTM-Tracking:** Links, Buttons und Banner können mit UTM-Parametern versehen werden (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`). Die fertige URL wird als Vorschau angezeigt.

**Icon-/Emoji-Picker:** Vordefinierte Kategorien (Kontakt, Business, Personen, Pfeile, Zeichen, Symbole) zum Einfügen an Cursorposition.

**Absender-Variablen:** Platzhalter wie `{{vorname}}`, `{{firma}}`, `{{telefon}}` etc. werden zur Laufzeit mit den Daten des Absenders gefüllt.

Vollständige Variablenliste:
- `{{vorname}}`, `{{nachname}}`, `{{name}}` (Vor- + Nachname)
- `{{email}}`, `{{berufsbezeichnung}}`, `{{firma}}`
- `{{telefon}}`, `{{mobil}}`
- `{{strasse}}`, `{{plz}}`, `{{ort}}`, `{{land}}`, `{{adresse}}` (vollständige Adresse)
- `{{foto}}` (Foto-URL)

**Startvorlagen:** Auswahl aus vordefinierten Signatur-Templates beim Erstellen einer neuen Signatur.

**Injektionsmodi:**
- *Nur Signatur:* HTML-Signatur wird vor `</body>` eingefügt, Mail-Body bleibt unverändert.
- *Mit CI-Branding:* Mail-Body wird bereinigt und in einen CI-Wrapper gepackt (siehe Abschnitt 4).

---

## 3. Regeln (Regel-Engine)

Regeln steuern, welche Signatur (und welches CI-Profil) an eine Mail angehängt wird.

**Matching-Parameter:**
- **Absender** (exakte E-Mail-Adresse)
- **Domain** (alle Absender einer Domain)
- Kombinationen sind möglich; leer = trifft alle

**Weitere Einstellungen je Regel:**
- **Priorität** (niedrigere Zahl = wird zuerst geprüft)
- **Neue Mails** / **Antworten** (unabhängig ein-/ausschaltbar)
- **Signatur** (Pflicht)
- **CI-Profil** (optional — aktiviert Mail-Beautifier)
- **SMTP-Konto** (optional — erzwingt einen bestimmten Relay, überschreibt Domain-Match)
- **Disclaimer** (optional — befüllt den Disclaimer-Platzhalter in der Signatur)
- **Aktiv/Inaktiv**

**Regel-Test:** Im Bereich "Test" kann ein beliebiger Absender simuliert werden, um zu sehen, welche Regel greift und welche Signatur zugewiesen würde.

---

## 4. CI-Profile (Mail-Beautifier)

CI-Profile definieren das visuelle Erscheinungsbild von ausgehenden Mails. Wird einer Regel ein CI-Profil zugewiesen, wird die Mail nicht nur mit einer Signatur ergänzt, sondern komplett in einen CI-Wrapper gepackt.

**Was der Beautifier tut:**
1. HTML der Mail bereinigen: herstellerspezifische CSS-Eigenschaften (`font-family`, `font-size`, `color`, `background`, `margin`, `padding` etc.) entfernen
2. Outlook/Mozilla-spezifische CSS-Klassen entfernen (`MsoNormal`, `WordSection`, `moz-*`)
3. `<font>`-Tags von Attributen befreien
4. Leere Trailing-Elemente entfernen
5. Bereinigten Inhalt in einen table-basierten CI-Wrapper einbetten

**Konfigurierbare CI-Parameter:**

| Feld | Beschreibung |
|---|---|
| `primary_color` | Akzentfarbe |
| `text_color` | Standardtextfarbe |
| `bg_color` | Außenhintergrund |
| `content_bg` | Inhaltsfläche |
| `header_bg` | Header- und Footer-Hintergrund |
| `font_family` | Schriftfamilie |
| `font_size` | Basisschriftgröße |
| `line_height` | Zeilenabstand |
| `container_width` | Breite des Mail-Containers (px) |
| `logo_url` | Logo-URL für Header |
| `company_name` | Firmenname im Header |
| `show_header` | Header ein-/ausblenden |
| `show_footer` | Footer ein-/ausblenden |
| `footer_text` | Footer-Text |
| `border` | Rahmen um den Container |

---

## 5. Disclaimer (zentral verwaltete Rechtstexte)

Disclaimer sind HTML-Texte, die unabhängig von einzelnen Signaturen gepflegt werden. Jede Signatur kann einen Disclaimer-Block enthalten; ob und welcher Text dort erscheint, wird per Regel gesteuert.

**Funktionsweise:**
1. Disclaimer-Block in einer Signatur einfügen — er rendert beim Versand den Platzhalter `{{disclaimer_html}}`
2. Unter **Signaturen → Disclaimer** einen oder mehrere Texte anlegen
3. In der Signatur-Regel den gewünschten Disclaimer zuweisen
4. Der Proxy ersetzt beim Versand den Platzhalter durch den HTML-Inhalt des zugewiesenen Disclaimers

**Kein Disclaimer-Block in der Signatur → kein Disclaimer im Mail**, egal ob die Regel einen zuweist.

**Disclaimer-Editor:**
- **Rich-Text-Toolbar:** Fett, Kursiv, Unterstrichen, Listen, Ausrichtung, Link, Schriftgröße, Textfarbe
- **HTML-Quellansicht:** direktes Bearbeiten des HTML-Codes
- **Plaintext-Tab:** separater Text für Plaintext-Mails (befüllt `{{disclaimer_text}}`)
- **Vorschau-Tab:** gerenderter HTML-Inhalt im Browser

**Stil-Optionen im Disclaimer-Block** (im Signatur-Designer):
- Schriftgröße, Textfarbe, Ausrichtung, Abstände

---

## 6. Banner (zentrale Bibliothek)

Banner können zentral angelegt, bearbeitet und aus dem Signatur-Designer heraus eingefügt werden. Die Bibliothek macht es einfach, Kampagnen-Banner in mehreren Signaturen konsistent zu halten.

**Banner-Editor:**
- Vollständiger Prop-Editor: Text, Subtext, Schrift, Farben (Vollfarbe oder CSS-Gradient mit Richtungswahl), Link + UTM-Tracking, Höhe, Innenabstand, Eckenradius
- **Outlook-Fallback-Farbe** für Gradienten (da Outlook kein CSS-Gradient unterstützt)
- **Live-Vorschau** neben dem Editor — zeigt exakt das spätere Aussehen in der Mail
- **Drag & Drop Reorder** in der Bannerliste

**Verwendung im Signatur-Designer:**
- Im Banner-Block-Editor erscheint der Bereich **„Banner aus Bibliothek laden"**
- Klick auf einen gespeicherten Banner übernimmt alle Props in den aktuellen Block
- Der Block bleibt danach frei editierbar (keine Live-Verknüpfung zur Bibliothek)

---

## 7. Angebots-Templates

Templates ermöglichen es, Mails von Drittsystemen (Lexware Office, JTL-Wawi) durch professionelle HTML-Angebotsmails zu ersetzen.

### Template-Editor (Block-Editor)

| Block | Beschreibung |
|---|---|
| **Header** | Firmenname, Tagline, Logo, Angebotsnummer, Datum, Kundendaten |
| **Anschreiben (Intro)** | Freitext mit Variablen (`{{anrede}}`, `{{nachname}}` etc.) |
| **Position** (dynamisch) | Produktliste — Artikelnummer, Name, Beschreibung, Preis, Bild |
| **Gesamtpreis** | Summenzeile mit konfigurierbarem Label |
| **Hinweis** | Kleingedrucktes / rechtliche Hinweise |
| **Button/CTA** | Call-to-Action mit konfigurierbarem Mail-Betreff |
| **Footer** | Kontaktdaten, Logo |
| **Trennlinie** | Dekorativer Separator |

**Startvorlagen:** Mehrere vorgefertigte Farbschemata zum schnellen Einstieg.

**Vorschau:** Echtzeit-Vorschau mit Beispieldaten (iframe) im Editor.

### Template-Regeln

Analog zu Signatur-Regeln, aber für Templates:
- Erkennt Mails anhand Absender/Domain
- Lädt Angebotsdaten aus Lexware oder JTL
- Ersetzt den kompletten Mail-Body durch das gerenderte Template
- Datenquellen: `lexware`, `jtl`, oder statisch (ohne Datenanreicherung)

---

## 8. Mailadressen (Absenderprofile)

Jede Absender-Mailadresse kann ein eigenes Profil erhalten, dessen Felder als Variablen in die Signatur eingefügt werden. Zu finden unter **Signaturen → Mailadressen**.

**Profil-Felder:**
- E-Mail (Pflicht, eindeutig)
- Vorname, Nachname
- Berufsbezeichnung
- Foto-URL
- Telefon, Mobil
- Straße, PLZ, Ort, Land, Firma

Der SMTP-Proxy lädt das Profil automatisch anhand der Absender-E-Mail und befüllt die Signatur-Variablen.

---

## 9. Authentifizierung & Benutzerverwaltung

### Login

Der Zugriff auf die Plattform ist passwortgeschützt. Alle API-Routen (außer `/api/auth/login`) sind durch JWT-Token gesichert.

- **Technologie:** JWT (30 Tage Laufzeit), Passwörter mit bcrypt gehasht
- **Standard-Zugangsdaten beim ersten Start:** `monster / monster`
- Der Default-User wird automatisch angelegt, falls beim Start keine Benutzer in der Datenbank existieren
- Token wird im Browser-LocalStorage gespeichert; bei Ablauf oder Ungültigkeit wird automatisch zur Login-Seite weitergeleitet
- **JWT_SECRET** sollte in der `.env`-Datei auf einen sicheren Wert gesetzt werden

### Benutzerverwaltung (Konfiguration → Benutzer)

Nur Administratoren haben Zugriff auf die Plattform und können neue Benutzer anlegen. Zu finden unter **Konfiguration → Benutzer**.

**Funktionen:**
- Alle Benutzer auflisten mit Name und Admin-Status
- Neuen Benutzer anlegen (Name, Passwort, optional Admin-Rechte)
- Admin-Status umschalten (Promote/Demote)
- Passwort eines Benutzers ändern (Modal)
- Benutzer löschen

**Sicherheitsregeln:**
- Nur Administratoren können die Benutzerverwaltung nutzen
- Der eigene Account kann weder gelöscht noch degradiert werden
- Neue Benutzer werden standardmäßig ohne Admin-Rechte angelegt (opt-in beim Erstellen)
- Registrierung über die Login-Seite ist deaktiviert — Benutzer werden ausschließlich von Admins angelegt

---

## 10. Lizenzsystem (Konfiguration → Lizenz)

Signaturmonster validiert Lizenzen **online gegen monstersuite.de** — das zentrale Kunden- und Lizenzportal. Kunden registrieren sich dort, aktivieren Free-Versionen oder kaufen Pro-Versionen und sehen ihre Schlüssel. Signaturmonster selbst ist nur der Lizenzclient.

### Gesamtarchitektur

```
Kunde
 └─ registriert sich auf monstersuite.de
     └─ wählt Produkt: Signaturmonster
         └─ aktiviert Free oder kauft Pro
             └─ Lizenzschlüssel wird online erzeugt
                 └─ Signaturmonster aktiviert Schlüssel gegen monstersuite.de
```

### Lizenzseite (Konfiguration → Lizenz)

Zeigt:
- **Status-Banner** mit Plan, lizenzierter E-Mail, Ablaufdatum und Validierungsmodus-Badge
- **Aktivierungsformular** für E-Mail (monstersuite.de-Konto) und Lizenzschlüssel
- **Grace-Period-Warnung** mit verbleibenden Tagen wenn Server nicht erreichbar
- **Machine-ID** und Zeitstempel der letzten Prüfung
- **Feature-Übersicht** nach Kategorie mit grünem „Aktiv"- bzw. gesperrtem Status

### Aktivierungs- und Prüfablauf

1. Nutzer gibt Schlüssel + E-Mail ein
2. Signaturmonster ruft `POST monstersuite.de/api/v1/licenses/activate` auf
3. Antwort (Plan, Features, Ablaufdatum) wird lokal in der Settings-Tabelle gecacht
4. Alle **24 Stunden**: automatische Neuprüfung via `POST …/validate`
5. Server nicht erreichbar → **Grace Period** (Standard: 14 Tage, konfigurierbar)
6. Grace Period abgelaufen → Rückfall auf Kostenlos-Plan

### Validierungsmodi (Badge in der UI)

| Modus | Bedeutung |
|---|---|
| **Online geprüft** | Letzte Prüfung erfolgreich gegen monstersuite.de |
| **Aus Cache** | Cache < 24h alt, kein Server-Call nötig |
| **Grace Period** | Server nicht erreichbar, Cache noch gültig |
| **Offline-Key (Dev)** | HMAC-Key ohne Serververbindung (nur Entwicklung) |

### Lizenzpläne

| Plan | Enthaltene Features |
|---|---|
| **Kostenlos** | SMTP-Konfiguration, Signatur-Designer, Signatur-Regeln |
| **Pro** | Alle Features |
| **Enterprise** | Alle Features |

### Lizenzierfähige Features

| Feature | Kostenlos | Pro |
|---|---|---|
| SMTP-Konfiguration | ✓ | ✓ |
| Signatur-Designer | ✓ | ✓ |
| Signatur-Regeln | ✓ | ✓ |
| Mehrere SMTP-Konten | — | ✓ |
| CI-Profile & Branding | — | ✓ |
| Mailadressen-Profile | — | ✓ |
| Disclaimer-Verwaltung | — | ✓ |
| Banner-Bibliothek | — | ✓ |
| Angebots-Templates | — | ✓ |
| Benutzerverwaltung | — | ✓ |

### Technische Details

- **Primäre Validierung:** Online gegen `monstersuite.de/api/v1/licenses/`
- **Machine-ID:** SHA-256 aus Hostname + MAC-Adresse — identifiziert die Aktivierung
- **Lokaler Cache:** Settings-Tabelle (`license_cache_json`, `license_cache_at`)
- **Grace Period:** Standard 14 Tage, via `LICENSE_GRACE_DAYS` in `.env` konfigurierbar
- **`LICENSE_SERVER_URL`:** Standard `https://monstersuite.de`, für Staging überschreibbar
- **Offline-Fallback (Dev):** Wenn `LICENSE_SECRET` gesetzt ist, werden HMAC-signierte Keys ohne Serververbindung akzeptiert — **nicht für Produktion**

### API-Vertrag (monstersuite.de)

Vollständige Dokumentation der Lizenz-API v1 → **monstersuite `docs/features.md`, Abschnitt 6 & 7**

Kurzreferenz — Request an `POST /api/v1/licenses/activate` und `/validate`:
```json
{ "license_key": "SI-XXXX-XXXX-XXXX-XXXX", "email": "…", "machine_id": "…",
  "hostname": "…", "product": "signaturmonster", "version": "0.7.0" }
```
Response (Erfolg):
```json
{ "valid": true, "plan": "pro", "email": "…", "valid_until": "2027-06-04",
  "features": ["smtp_multi", "ci_branding", "…"], "activation_id": "act_42" }
```

> **Schlüssel-Präfix:** `SI-` (die ersten zwei Zeichen des Produkt-Slugs `signaturmonster`)

### Offline-Key-Generator (Entwicklung / Übergang)

Für Entwicklung und den Übergang bis monstersuite.de deployed ist, können lokal signierte HMAC-Keys generiert werden:

```bash
# LICENSE_SECRET muss in .env gesetzt sein
python backend/scripts/gen_license.py
```

monstersuite.de ist als separates Projekt unter `../monstersuite` angelegt und stellt im Produktivbetrieb die Lizenzschlüssel aus.

---

## 11. Datenanreicherung (Lexware Office)

Bei Template-Regeln mit Datenquelle `lexware` ruft der Proxy zur Laufzeit die Lexware-API ab:

1. Betreff der eingehenden Mail wird mit offenen Angebotsnummern abgeglichen
2. Angebotsdaten werden als Template-Variablen bereitgestellt:
   - `{{angebot_nummer}}`, `{{angebot_datum}}`
   - `{{kunde_name}}`, `{{kunde_strasse}}`, `{{kunde_ort}}`
   - `{{betrag_netto}}`, `{{betrag_brutto}}`, `{{waehrung}}`
   - `positions` (Array mit Artikelnummer, Name, Beschreibung, Preis, Bild-URL)

---

## 12. SMTP-Konten (Multi-Relay)

Signaturmonster unterstützt beliebig viele SMTP-Relay-Konten. Jedes Konto gehört zu einer Domain — Absender mit `@abc.de` und `@xyz.zz` verwenden automatisch verschiedene Mailserver.

**Konfigurierbare Felder je Konto:**

| Feld | Beschreibung |
|---|---|
| `name` | Interner Name (z.B. „Holdermann IT") |
| `match_domain` | Absender-Domain, für die dieses Konto gilt (leer = Standard/Fallback) |
| `relay_host` | SMTP-Hostname |
| `relay_port` | Port (Standard: 587) |
| `relay_user` | Benutzername |
| `relay_pass` | Passwort |
| `from_address` | Absender-Adresse (leer = Benutzername) |
| `is_default` | Fallback-Konto wenn kein Domain-Match greift |

**Relay-Auswahlreihenfolge (Priorität):**
1. Explizites SMTP-Konto in der Signatur-Regel (Override)
2. Domain-Match: Absender-Domain stimmt mit `match_domain` eines Kontos überein
3. Als Standard markiertes Konto (`is_default = true`)
4. Erstes verfügbares Konto
5. Umgebungsvariablen (`RELAY_HOST`, `RELAY_PORT` etc.) als letzter Fallback

**Testfunktion:** Jedes Konto kann direkt im Editor mit einer Ziel-Adresse getestet werden.

**Schnellauswahl** für gängige Provider: IONOS, Strato, Gmail, Mailcow

**Migration:** Beim ersten Start nach dem Update werden vorhandene Einzel-SMTP-Einstellungen automatisch als Standard-Konto übernommen — kein manueller Eingriff nötig.

---

## 13. Test-Werkzeuge

- **Testmail senden:** Beliebige Empfängeradresse angeben — sendet eine echte Mail über den Standard-SMTP-Relay (oder per Konto-Test direkt in den SMTP-Konten)
- **Regel-Matching simulieren:** Absender-Adresse eingeben und "Als Antwort behandeln" togglen — zeigt, welche Regel greifen würde und welche Signatur zugewiesen wird
- **Proxy-Status:** Zeigt Backend-API (Port 8001) und SMTP-Proxy (Port 2587)

---

## 14. Deployment

- Vollständig containerisiert via **Docker Compose**
- nginx als Reverse Proxy vor Frontend und Backend
- SQLite-Datenbank (Volume-gemountet unter `data/`)
- Konfiguration via `.env`-Datei

**Nach Code-Änderungen** müssen die Container neu gebaut werden, damit neue Routen, Datenbankmodelle und Tabellen aktiv werden:

```bash
docker compose up -d --build
```

Neue Datenbanktabellen werden beim Start automatisch angelegt (`create_all`). Neue Spalten in bestehenden Tabellen werden über die eingebettete Migrations-Liste in `database.py` ergänzt.

---

## Bekannte Einschränkungen (v0.7.0)

- JTL-Wawi-Integration ist in der UI auswählbar, aber die Anreicherungslogik ist noch nicht implementiert (nur Lexware ist aktiv)
- Keine Authentifizierung am SMTP-Proxy selbst (`auth_required=False`) — der Proxy sollte nur im internen Netz erreichbar sein
- Lizenzprüfung zeigt Features als aktiv/gesperrt an, sperrt aber den UI-Zugriff noch nicht technisch — Feature-Gating folgt in einem späteren Release
- monstersuite.de (Lizenzserver) ist als separates Projekt angelegt (`../monstersuite`), aber noch nicht deployed — Übergang via Offline-HMAC-Keys (`LICENSE_SECRET` in `.env`)
