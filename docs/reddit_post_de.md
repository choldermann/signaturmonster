# Reddit Post (Deutsch) — r/linuxde / r/selfhosted_de

**Titel:** Ich präsentiere euch Signaturmonster — ein selbst gehosteter SMTP-Proxy, der E-Mail-Signaturen firmenweit automatisch einfügt

---

Ich arbeite seit Jahren in der IT und habe ständig mit Produkten für Microsoft- und Google-Plattformen zu tun. Jenseits dieser Anbieter wird es schnell dünn, was Alternativen angeht. Signaturmonster ist mein Versuch, Interessierten auf einfache Weise ein bisschen Komfort bei der Signaturgestaltung zu geben — zentral verwaltet und auf den eigenen Servern, egal ob ein kleiner Raspi oder ein LXC-Container unter Proxmox. Ich selbst nutze es mit Proxmox hinter einer DynDNS-Adresse, das läuft problemlos.

Die Idee ist simpel: Ein kleiner SMTP-Proxy sitzt zwischen dem Mailprogramm und dem eigentlichen Mailserver. Jede ausgehende Mail läuft durch ihn hindurch, bekommt die richtige Signatur eingefügt und wird weitergeleitet. Die Nutzer ändern nichts an ihrem Client — sie zeigen nur ihren SMTP auf den Proxy statt direkt auf den Mailserver.

**Was er kann:**

- **Signatur-Designer** — Drag-and-Drop Block-Editor: Text, Bilder, Social-Icons, Buttons, Disclaimer, 2-Spalten-Layouts, Tabellen. HTML- und Plaintext-Version werden automatisch gebaut.
- **Regelwerk** — verschiedene Signaturen je nach Absender, Domain, Uhrzeit oder Wochentag. Priorisierung, eingebauter Test-Simulator.
- **Absender-Profile** — adressbezogene Variablen (`{{vorname}}`, `{{firma}}`, `{{telefon}}` …) die beim Versand aufgelöst werden. Fehlt ein Profil, erscheint trotzdem kein Platzhalter im Mail.
- **CI-Wrapper** — ausgehende Mails werden in ein gebrandetes HTML-Layout eingebettet (Logo, Header, Footer, Farben). Outlook-kompatibles Table-Layout.
- **Banner-Kampagnen** — zeitgesteuerte Bilderbanner mit gewichteter Zufallsauswahl (höheres Gewicht = häufiger gezeigt), Impressionen- und Klick-Tracking, UTM-Parameter.
- **CSS-Inliner** — `<style>`-Blöcke werden vor dem Versand automatisch in Inline-Styles umgewandelt. Bessere Darstellung in Outlook, Apple Mail und Webmail-Clients.
- **Mail-Queue mit Retry** — exponentieller Backoff (1 min → 5 min → 30 min → 2 h); manueller Retry aus dem Dashboard; Bounce-Benachrichtigung.
- **Audit-Log** — jede verarbeitete Mail wird protokolliert: Absender, gematchte Regel, Relay-Status, Dauer, Größe. CSV-Export, konfigurierbarer Aufbewahrungszeitraum.
- **Thunderbird-Addon** — Live-Vorschau der Signatur beim Schreiben, ohne dass man an den Client-eigenen Signatur-Einstellungen etwas anfassen muss.
- **Self-Update** — eingebauter Updater prüft GitHub-Releases, zieht neue Images und startet Container neu. nginx bleibt während des Updates oben.

**Stack:** FastAPI + aiosmtpd + React + SQLite, alles in Docker Compose. Keine Cloud-Abhängigkeit, kein Telemetrie, läuft auf einem kleinen VPS oder LXC-Container.

**GitHub:** https://github.com/choldermann/signaturmonster

Ihr benötigt Zugang zur Mail-Infrastruktur eures Betreibers — SMTP-Host, Benutzername und Kennwort. Fragen beantworte ich gerne, gerade beim SMTP-Proxy-Teil steckt mehr drin als es aussieht. Ich suche außerdem aktiv nach Testern — wer es ausprobieren möchte, meldet sich einfach.

---

*Vorgeschlagene Subreddits: r/linuxde, r/selfhosted (auf Englisch)*
