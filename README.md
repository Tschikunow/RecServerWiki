# RecServerWiki / RecServerNews – gemeinsame öffentliche Wikipedia

Diese Version zeigt **allen Besuchern denselben Artikelbestand**, auch ohne Anmeldung. Inhalte ändern dürfen nur von dir freigeschaltete Redakteure. Enthalten sind Biografien, Orte, Ereignisse, Objekte, freie Artikel, Bilder, Kategorien, Zeitstrahlen und Wikipedia-Links.

## 1. Datenbank einmalig umstellen

1. Öffne [Supabase](https://supabase.com/dashboard) und wähle das Projekt **RecServerWiki**.
2. Gehe zu **SQL Editor → New query**.
3. Kopiere den gesamten Inhalt von [`supabase/wiki-shared.sql`](supabase/wiki-shared.sql) und klicke auf **Run**.
4. Diese Migration löscht **nicht** die alte private Datenbank `recservernews_sync` oder deren Dateien.

## 2. Öffentliche Verbindung für alle Besucher aktivieren

1. In Supabase unter **Project Settings → API Keys** den **Publishable Key** (`sb_publishable_…`) kopieren. Alternativ den öffentlichen `anon`-Key nutzen.
2. Auf GitHub die Datei [`cloud-config.js`](cloud-config.js) bearbeiten (Bleistift ✏), den Text `HIER_EINFUEGEN` **nur** durch den öffentlichen Schlüssel ersetzen und **Commit changes** klicken.
3. Die Projekt-URL steht bereits darin. Prüfe bei Bedarf unter **Project Settings → Data API** ob sie zu deinem Projekt passt.
4. GitHub Pages veröffentlicht die aktualisierte Datei. Danach können **alle Besucher** die geteilten Artikel laden, ohne irgendeinen Schlüssel eingeben zu müssen.

**WICHTIG:** Nur den `sb_publishable_...` oder öffentlichen `anon`-Key auf GitHub eintragen. **Niemals** `sb_secret_...`, `service_role`, Passwort oder Datenbank-Passwort veröffentlichen. Der öffentliche Key schützt nicht die Inhalte: dafür sind die RLS-Regeln in `wiki-shared.sql` zuständig.

## 3. Dein Redaktionskonto freischalten

1. Öffne https://tschikunow.github.io/RecServerWiki/ und wähle **Cloud & Synchronisierung**.
2. Erstelle ein Konto mit deiner E-Mail oder melde dich an. Falls Supabase E-Mail-Bestätigung verlangt, bestätige sie zuerst.
3. Im Supabase **SQL Editor** einen **neuen** Query erstellen und folgenden Code ausführen. Ersetze `DEINE_LOGIN_EMAIL` durch genau die E-Mail-Adresse deines eben angelegten Supabase-Kontos:

```sql
insert into public.recserverwiki_editors (user_id, role)
select id, 'admin' from auth.users where email = 'DEINE_LOGIN_EMAIL'
on conflict (user_id) do update set role = 'admin';
```

4. Öffne den Cloud-Bereich in der Wiki-Seite und klicke auf **Redaktionsrechte erneut prüfen**. Die Rolle sollte jetzt `admin` sein.
5. Erstelle deinen ersten Artikel und speichere ihn. Er wird automatisch für alle veröffentlicht.

**Weitere Redakteure:** Dasselbe `insert ... select` mit der E-Mail ihres Supabase-Kontos ausführen und Rolle `editor` statt `admin` verwenden. Unbekannte Besucher und nicht freigeschaltete Nutzer bleiben Leser.

## E-Mail-Verifizierung und Weiterleitungen

Unter **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://tschikunow.github.io/RecServerWiki/`
- **Redirect URLs:** `https://tschikunow.github.io/RecServerWiki/**`

Die Registrierung sendet nun die Wiki-Adresse als `redirect_to`. Diese URL muss in Supabase zugelassen sein. Nach erfolgreicher Bestätigung kann man sich auch direkt mit E-Mail/Passwort anmelden. Wenn ein älterer Bestätigungslink zu `localhost:3000` führte, kann die E-Mail trotzdem bereits bestätigt sein, weil die Weiterleitung erst **nach** der Bestätigung fehlschlägt.

Im Wiki unter **Cloud & Synchronisierung → Verbindung testen** zuerst prüfen, ob die gemeinsame Datenbank erreichbar ist. Bei `Failed to fetch` die Projektadresse und die erfolgreich veröffentlichte GitHub-Pages-Version prüfen.

## 4. Vorhandene Artikel übernehmen

- Im Cloud-Bereich als Admin auf **Alte lokale Artikel übernehmen** klicken, wenn du auf demselben PC früher mit der alten Version geschrieben hast.
- Alternativ unter **Archiv & Daten** eine vorher gespeicherte JSON-Sicherung importieren.
- Die bisher private und die neue öffentliche Sammlung bleiben getrennt, bis du bewusst **Diese lokale Version veröffentlichen** auswählst. **Vorher beide Datenbestände als JSON sichern**, weil Veröffentlichen die aktuelle öffentliche Version ersetzt.

## Hinweise

- GitHub Pages hostet nur die App. Supabase ist die gemeinsame Cloud-Datenbank und der Speicher für Bilder.
- Alle veröffentlichten Texte und Bilder sind **öffentlich im Internet**. Lade keine privaten Daten, fremde geschützte Bilder oder geheime Dokumente hoch.
- Bei Änderungen durch mehrere Redakteure verhindert die Versionsprüfung einen stillen Austausch; trotzdem muss bei Konflikten eine Version ausgewählt werden.
- Bei offenem Browser werden Änderungen etwa alle 20 Sekunden abgefragt. Ein Neuladen zeigt sofort den aktuellen Stand.
- Ein echter Supabase-Livetest steht noch aus. Die lokale JavaScript-Syntax und die Repository-Dateien sind geprüft; die SQL-Einrichtung und der öffentliche Key müssen erst durchgeführt werden.