# Changelog

Alle Änderungen an Signaturmonster werden hier dokumentiert.
Format: `[Version] – Datum`

---

## [0.9.0] – 2026-06-20

### Neue Features
- **Kampagnen-Gewichtung**: Jede Kampagne hat jetzt ein Gewicht (1–200, Standard 100). Kampagnen mit höherem Gewicht werden beim SMTP-Versand häufiger ausgewählt. Einstellbar per Slider im Kampagnen-Formular.
- **CSS-Inliner**: Signatur-HTML wird vor dem Versand automatisch per `css-inline` in Inline-Styles umgewandelt. Verbessert die Darstellung in Outlook, Apple Mail und anderen E-Mail-Clients erheblich.

### Bugfixes
- Template-Variablen (`{{vorname}}`, `{{nachname}}` etc.) wurden wörtlich angezeigt wenn kein Absender-Profil existiert — jetzt werden leere Strings als Default gesetzt.
- Pro-Lizenz: Feature `senders` (Mailadressen-Profile) war blockiert, obwohl die Lizenz aktiv war. Ursache: `ProductPlan`-Tabelle in Monstersuite hatte keinen Eintrag für `senders`. Fallback auf `PLAN_FEATURES` aus dem Code eingebaut.
- Lizenz-Seite: Info-Box mit Kulanzzeit-Hinweis erschien auch bei aktiver Lizenz. Wird jetzt nur noch bei nicht-aktiver Lizenz angezeigt.
- Lizenz-Seite: Automatische Re-Aktivierung bei `not_activated`-Status fehlte im `/refresh`-Endpoint.
- Lizenz-Seite: Schriftfarbe für Zeitstempel und Machine-ID war zu dunkel.
- Fehlende i18n-Keys für Lizenzstatus und Validierungsmodus ergänzt.
- Sender-Profil-Lookup war case-sensitiv — E-Mail-Adressen werden jetzt beim Speichern normalisiert und beim Lookup case-insensitiv verglichen.
- Versionsnummer im Build wurde als "dev" angezeigt — Lizenz-Logic robuster gemacht.

### UI-Verbesserungen
- Navigation: Texte und Icons deutlich lesbarer (höherer Kontrast in Dark Mode und Light Mode).
- Navigation: Aufgeklappte Kategorien werden in der Akzentfarbe (Gold) hervorgehoben mit linkem Akzentstreifen.
- Light Mode: `--text-3` von `#64748b` auf `#475569` für besseren Kontrast auf weißem Hintergrund.

---

## [0.8.3] – 2026-06

### Bugfixes
- `APP_VERSION` aus `docker-compose.yml` entfernt — Versionsnummer wird jetzt ausschließlich aus der Image-ENV gelesen.

---

## [0.8.2] – 2026-06

### Neue Features
- **Accordion-Navigation**: Sidebar-Navigation ist jetzt in aufklappbare Kategorien gegliedert.
- Updater: `docker system prune -af` vor jedem Update-Pull für saubere Builds.

### Bugfixes
- `_load_version()` ignoriert `'dev'` in der VERSION-Datei und fällt auf Env-Var zurück.
- OCI-Labels explizit in `release.sh` gesetzt (Updater-Versionsanzeige).
- `pull_policy: always` für alle eigenen Images in `docker-compose.yml`.
- Stabile `machine_id` + bessere Fehlermeldung bei Lizenzprüfung.

---

## [0.8.1] – 2026-06

### Neue Features
- **Sender-Slot-Tracking**: Lizenz-Limits für `From:`-Adressen werden jetzt verfolgt und durchgesetzt.
- Versionsverwaltung via `VERSION`-Datei + `release.sh`-Skript.

### Bugfixes
- `APP_VERSION` wird jetzt korrekt als Runtime-Env übergeben.
- Stabiler Backend-Hostname + `LICENSE_SERVER_URL` in `docker-compose`.
