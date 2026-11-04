# RecServerWiki / RecServerNews

Browserbasierte Museums- und Wiki-App mit Artikeln, Biografien, Orten, Ereignissen, Kategorien, Bildern und internen Textlinks.

## Dateien
- `index.html`: vollständig eigenständige Web-App.
- `supabase/setup.sql`: SQL-Einrichtung für private, benutzerbezogene Cloud-Archive.

## Online stellen
1. In GitHub unter **Settings → Pages** als Quelle **Deploy from a branch** wählen, Branch **main** und Ordner **/(root)**.
2. Wenn du GitHub Free nutzt, muss das Repository für GitHub Pages normalerweise **öffentlich** sein. Stelle es nur öffentlich, wenn der Code sichtbar sein darf.
3. Die Webadresse wird nach erfolgreichem Deployment voraussichtlich https://tschikunow.github.io/RecServerWiki/ sein.

## Cloud zwischen Geräten
1. In Supabase ein Projekt anlegen.
2. `supabase/setup.sql` im Supabase SQL Editor ausführen.
3. In der App unter **Cloud & Synchronisierung** die Supabase Project URL und den **öffentlichen** Publishable/Anon Key eintragen.
4. Mit demselben Konto auf PC und Handy anmelden. Vor dem ersten Upload unbedingt eine JSON-Datensicherung erstellen.

**Wichtig:** GitHub Pages hostet nur die App, nicht die Artikel-Datenbank. Die Cloud ist erst nach Supabase-Einrichtung verfügbar. Die bisherigen Artikelarchive sind benutzerbezogen privat und noch keine allgemein öffentliche Wikipedia.
