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

## Wiederverwendbare Biografie-Dropdowns (04.11.2026)
- Drei Biografie-Felder haben universelle, vom Admin frei verwaltbare Auswahllisten: `birthplace` (Geburtsort), `occupation` (Tätigkeit) und `significance` (Bedeutung).
- Im Biografie-Editor stehen jeweils eine Dropdown-Auswahl, ein frei beschreibbares Textfeld sowie die Schaltfläche „Wert für alle Biografien merken“ bereit. Gespeicherte Werte können aus der Liste entfernt werden, ohne vorhandene Biografie-Daten zu löschen.
- Listen sind **leer, bis der Nutzer selbst Werte anlegt**. Keine vordefinierten Inhalte.
- Archiv-Format: `biographyPresets: {birthplace: string[], occupation: string[], significance: string[]}`. Dieses Feld gehört zum bestehenden öffentlichen JSON-Snapshot; **keine neuen Supabase-Tabellen**.
- `migrateData()` übernimmt alte Archive ohne `biographyPresets` ohne Datenverlust. JSON-Exporte enthalten die Listen. Auch beim Leeren von Einträgen bleiben die Listen erhalten.
- Altes `details.occupation` wird beibehalten, ehemals „Tätigkeit / Bedeutung“. Bedeutung hat nun separat `details.significance`.
- `premium-theme.css` gestaltet Dropdowns, Merken-Buttons und die Verwaltungschips in Dark/Light Mode.

## Rec Room-Serverprofile unter Orte (05.11.2026)
- **Server bleibt der Eintragstyp `place`**, erkannt durch eine bestehende Ortskategorie namens `Server`, `Servers`, `Server allgemein` oder `Server insgesamt` (Groß-/Kleinschreibung egal).
- Wenn diese Kategorie im Editor ausgewählt wird, ersetzt ein spezielles Serverprofil die allgemeinen Ortsfelder (Land, Region, Koordinaten). Andere Orte bleiben unverändert.
- Der Ortstitel ist der **Servername**. Titelbild und optionale Kurzbeschreibung bleiben die bestehenden Standardfelder.
- Servereigene Profildaten in `details`: `serverOwner`, `serverCoOwner`, `serverCurrency`, `serverDescription`, `serverAllies`. Verbündete Server/Räume werden als durch Zeilenumbruch oder Komma getrennte Namen gespeichert und mit bestehenden, exakt gleich benannten Serverartikeln verlinkt, sofern vorhanden.
- Ein eigenes kleines Bilderalbum liegt pro Serverartikel als `serverPhotos: [{src,caption}]` direkt am Eintrag, maximal 8 Bilder. Bilder laufen durch die vorhandene clientseitige Bildkompression und den bestehenden Supabase-JSON-Snapshot.
- `migrateData()` bewahrt `serverPhotos` bei Cloud-Synchronisierung, Import und Export; alte Orte ohne das Feld funktionieren unverändert.
- UI: `serverProfile()`, `serverDetailsEditor()`, CSS in `premium-theme.css`. Keine Supabase-Schemaänderung.
- Beim Speichern werden Änderungen zuerst lokal abgelegt. Bei Versionskonflikt muss der Admin seine richtige lokale Version bewusst im Cloud-Dialog veröffentlichen, damit sie auf Handy/Inkognito sichtbar ist.

## Server ist eigener Archivstücktyp (05.11.2026, jüngste Änderung)
- Nach Wunsch des Betreibers ist `Server` **kein Sonderfall von `Ort` mehr**, sondern ein eigener Archivstücktyp `type:'server'` neben `article`, `person`, `place`, `event`, `object`.
- Der Eintragstyp `Ort` behält alle bisherigen geographischen Felder unverändert. Bei `Server` erscheinen stattdessen Owner, Co-Owner, Währung, Beschreibung, verbündete Server/Räume und Bilderalbum (max. 8 Screenshots).
- `isServerLocation(e)` prüft nun ausschließlich `e.type==='server'`, nicht mehr die Kategorienamen. Ein Ort mit der Kategorie „Großer Server“ bleibt ein Ort, bis sein Typ ausdrücklich im Editor auf „Server“ geändert wird.
- Neue separate Kategoriegruppe `server` in der Kategorien-Verwaltung. Bestehende Ortskategorien mit dem Wort „Server“ wie „Großer Server“, „Mittelgroßer Server“, „Kleiner Server“ bleiben beim neuen Servertyp auswählbar, damit bisherige Kategorien bei einer manuellen Umwandlung erhalten werden.
- `migrateData()` kennt den neuen Typ über `TYPES`, die bestehenden JSON-Snapshots und Supabase-Tabellen bleiben unverändert. Keine neuen SQL-Migrationen nötig.
- `premium-theme.css` arrangiert die sechs Archivstücktypen als Raster (Desktop 3×2) und die erweiterten Kategorietabs responsiv.
- Umwandlung vorhandener Server-Orte: Artikel öffnen → Bearbeiten → oben Eintragstyp „Server“ auswählen → Speichern → über Cloud veröffentlichen. Keine automatische Massenumwandlung.

## Rec-Room-Server: Statistiken und verknüpfte Biografien (05.11.2026)
- Neues Serverprofil mit frei befüllbaren Zahlen: `serverVisits` (Visits), `serverRegularVisitors` (regelmäßige Besucher), `serverClubMembers` (Clubmitglieder), `serverClubRegularMembers` (regelmäßige Clubmitglieder).
- Zusätzlich `serverClubName` (Clubname), `serverInventions` (verwendete Inventions), `serverCompanies` (Unternehmen/Gruppen). Bisherige Felder `serverCurrency`, `serverDescription`, `serverAllies`, Titelbild, Bilderalbum und Gründungsjahr bleiben unverändert.
- Owner und Co-Owner werden **durch Auswahl vorhandener Biografien** festgelegt: `serverOwnerId`, `serverCoOwnerId`. Moderatoren werden als Multi-Auswahl aus Biografien über `serverModeratorIds` (kommagetrennte Artikel-IDs) gespeichert. Alle drei Rollen werden auf der öffentlichen Serverseite per `data-open` zur entsprechenden Biografie verlinkt.
- Die Werte liegen innerhalb des normalen `details`-Objekts des Eintrags. Das vorhandene `migrateData()` konvertiert Werte in Strings und bewahrt sie in Exporten sowie öffentlichen Supabase-JSON-Snapshots. **Keine Änderung des Datenbankschemas.**
- Ältere Textfelder `serverOwner`, `serverCoOwner` und ggf. `serverModerators` werden weiter angezeigt und nicht gelöscht. Exact-Match mit vorhandenen Biografietiteln kann als Link angezeigt werden.
- Neue Darstellung in `premium-theme.css`: Statistik-Kacheln, verlinkte Team-Pills und Checkbox-Auswahl mehrerer Moderatoren. Keine vorgegebenen Personen oder Serverdaten erstellen.
- Nach der Bearbeitung wie bisher lokal speichern und bei Bedarf über **Cloud & Synchronisierung** veröffentlichen. Bei „Versionskonflikt“ zuerst das vollständige JSON-Archiv sichern.

## Speichern bei vollem Browser-Speicher (05.11.2026)
- Ursache eines reproduzierten Kundenfehlers war `QuotaExceededError` bei `localStorage.setItem('recserverwiki_shared_v1', ...)` während des Speicherns eines Servers. Das Archiv wächst mit hochgeladenen Bildern auf mehrere MB; `localStorage` ist dafür nicht geeignet.
- Ein vorheriger Fallback-Marker `recserverwiki_shared_v1_fallback=1` zwang die Anwendung beim Neustart dauerhaft zu `localStorage`. Das ist korrigiert: `readState()` migriert eine vorhandene gültige Ersatzkopie zurück nach IndexedDB; `saveState()` versucht grundsätzlich zuerst IndexedDB; `openDb()` cached keine abgelehnten Öffnungsversuche mehr.
- Wenn IndexedDB und `localStorage` beide ausfallen, darf ein angemeldeter Redakteur über `cloudUpload('save-recovery')` den vollständigen Artikelbestand direkt veröffentlichen, **nur** wenn kein Versionskonflikt besteht und die veröffentlichte Version noch der erwarteten Revision entspricht. Niemals Versionskonflikte automatisch übergehen; `cloudUpload` gibt explizit `true/false` zurück.
- Bei gescheitertem lokalen und Cloud-Speichern bleibt der Editor samt Formulardaten offen und bietet `↓ Entwurf als JSON sichern`. Die JSON-Sicherung enthält den noch nicht gespeicherten aktuellen Eintrag und alle bestehenden Daten; der Benutzer darf den Editor nicht vor der Sicherung schließen.
- Tests in `tests/server-save-smoke.mjs` simulieren die Wiederherstellung aus einem alten Fallback, ein `QuotaExceededError`, konfliktfreien direkten Cloud-Upload und blockierte Veröffentlichung samt Download des Entwurfs. Die GitHub Action `Server-Speichertest im Browser` läuft mit Chromium ohne Produktions-Supabase-Zugriffe.
- Bei Berichten über weiter bestehende Fehler die exakte Meldung notieren; **niemals** pauschal Browserdaten löschen empfehlen, da unveröffentlichte lokale Einträge verloren gehen können.

## Gemeinsame Live-Redaktion ohne globalen Versionskonflikt (05.11.2026)
- Alle Admins und Leser laden beim Öffnen stets dieselbe **veröffentlichte Supabase-Snapshot-Version**, nicht mehr unterschiedliche lokale Redaktionskopien. Der Browsercache ist nur eine optionale Sicherung; ein ehemaliger lokaler Datenbestand kann separat im Cloud-Dialog als JSON exportiert werden.
- Das normale `saveState()` veröffentlicht jetzt unmittelbar die lokalen **Änderungen** via `liveCommit()` in der aktuellsten öffentlichen Version. Dabei werden Einträge und Kategorien anhand ihrer `id` abgeglichen; `livePatchValue()` kombiniert bei unterschiedlichen gleichzeitig bearbeiteten Feldern derselben Entität die individuellen Feldupdates.
- Das Supabase-Archiv bleibt als versionierte JSON-Snapshots bestehen. Die Datenbank-Revision wird **intern** weiterhin atomar verglichen. Wenn andere Redakteure zwischen Upload und Bestätigung speichern, verwirft der Client seinen eigenen unveröffentlichten Snapshot und berechnet den Patch gegen die neueste öffentliche Revision, bis zu acht Versuche. Es gibt **keinen manuellen globalen Versionskonflikt** oder alten Stand mehr, den der Admin übernehmen müsste.
- Sicherheitsgrenze: Gleichzeitige Änderungen **am selben Feld** folgen technisch dem zuletzt erfolgreich gespeicherten Wert. Dies ist *nicht* kollaboratives Zeichen-für-Zeichen-Tippen wie Google Docs. Bei verlorener Verbindung bleibt der Entwurf offen und kann als JSON gesichert werden.
- Supabase `public.recserverwiki_shared` wurde zusätzlich in die bestehende Publikation `supabase_realtime` aufgenommen. Das Frontend hat einen Postgres-Changes-WebSocket und einen 3-Sekunden-Polling-Fallback. RLS unverändert: `anon` darf lesen, nur freigeschaltete Admins/Redakteure dürfen schreiben.
- Die alte Konfliktoberfläche ist entfernt. „Jetzt veröffentlichen“ wurde zu „Live-Stand prüfen“; jede Speicherung publiziert automatisch. Die ursprünglichen Daten und Supabase-Zugriffsrechte bleiben erhalten, keine neuen Datentabellen notwendig.
- Laufender Playwright-GitHub-Actions-Test `tests/live-sync-smoke.mjs` mit zwei verschiedenen Admin-Browsern und einem Gast, gleichzeitigen Server- und Kategorieänderungen und feldweiser Zusammenführung: Erfolgreich bei Workflow-Lauf 42072577376.
- Änderungen an mehreren Feldern innerhalb eines offenen Editors werden beim Speichern gegen den zu Beginn geladenen Artikelstand abgeglichen. So überschreibt ein zwischendurch aktualisierter Server nicht die von anderen Admins separat bearbeiteten Felder.
