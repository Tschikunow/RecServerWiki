# RecServerWiki – Projektstand

Stand: 4. November 2026. Benutzer hat bestätigt: **Die öffentliche Wiki-Seite funktioniert.**

## Links
- Website: https://tschikunow.github.io/RecServerWiki/
- GitHub: https://github.com/Tschikunow/RecServerWiki (public, Branch main)
- Supabase-Projekt: RecServerWiki, ID `meggcddlbeifyoypmglq`
- Supabase-Projekt-URL: `https://meggcddlbeifyoypmglq.supabase.co`

## Aufbau
- `index.html`: vollständige Museum-/Wiki-App, Login und Cloud-Synchronisierung
- `cloud-config.js`: öffentliche Supabase-URL und Publishable-Key (niemals geheime Schlüssel ablegen)
- `supabase/wiki-shared.sql`: öffentliches Wiki, Editorrollen, Zugriffsregeln, Storage
- `README.md`: Einrichtung und Auth-Weiterleitungen

Supabase: `recserverwiki_shared` hält den aktuellen Snapshot und Revisionsstand. `recserverwiki_editors` bestimmt Redakteure/Admins. Im öffentlichen Bucket `recserverwiki-public` liegen JSON-Archive. Gäste dürfen ohne Konto lesen, Änderungen sind Redakteuren vorbehalten. Bei der letzten Prüfung existierte ein Admin-Eintrag und ein publizierter Snapshot.

## Gewünschtes Verhalten
Jeder Besucher lädt automatisch dieselben veröffentlichten Artikel. Neue Veröffentlichungen erscheinen bei regelmäßigem Refresh (ca. 20 Sekunden). Nutzer können Artikel, Kategorien, Biografien, Ereignisse, Orte und Objekte inklusive Bildern, Inhaltsbausteinen und internen Wiki-Links erstellen. **Keine Beispielartikel oder Presets.** Admin-Entwürfe bleiben privat, bis sie bewusst veröffentlicht werden.

## Fehler und Lösungen
- Richtige Supabase-Projekt-ID endet auf `...ymglq`. Falsche Adressen führten zu „Failed to fetch“.
- GitHub Pages Actions auf erfolgreiche Veröffentlichung prüfen und danach hart neu laden.
- Supabase Auth: Site URL und erlaubte Redirect-URLs auf die GitHub-Pages-Webseite setzen, nicht `localhost:3000`.
- E-Mail kann bestätigt sein, obwohl die anschließende Weiterleitung fehlschlägt.
- Adminrechte über die Rollen-Tabelle mit serverseitiger Zugriffskontrolle, nicht über Frontend allein.
- Den öffentlichen Snapshot in einem Inkognito-Fenster ohne Anmeldung prüfen.
- Bestehende lokale Entwürfe nicht automatisch veröffentlichen oder überschreiben.
- GitHub Pages benötigt **keine eigene gekaufte Domain**.

Vor zukünftigen Änderungen: Aktuellen GitHub-Code, GitHub Actions und Supabase-Zustand erneut prüfen.
## Design- und Kategorie-Update (04.11.2026)
- Das Premium-Design liegt in `premium-theme.css` und wird von `index.html` geladen. Bestehende Cloud-, Rollen- und Veröffentlichungslogik nicht neu aufbauen.
- Dunkles und helles Theme über Button im Header; gewähltes Theme wird in `localStorage` unter `rsw_premium_theme_v1` gespeichert. Standard: Dark Mode.
- Neue animierte Darstellung für Startseite, Sidebar, Karten, Artikel, Editor und Modalfenster; unterstützt `prefers-reduced-motion`.
- Kategorien haben nun zusätzlich `scope`: `all` (allgemein), `person` (Biografie), `place` (Ort), `event` (Ereignis), `object` (Objekt), `article` (Artikel).
- Historische Kategorien ohne Scope bleiben **allgemein**. `migrateData()` bewahrt Scope, damit Cloud-Snapshots und JSON-Sicherungen abwärtskompatibel bleiben.
- Kategorieverwaltung zeigt getrennte Tabs, der Editor nur allgemeine und für den Artikeltyp passende Kategorien. Der Datenbankaufbau selbst wurde nicht geändert.
